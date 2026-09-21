"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { loadAuthCache } from "@/lib/authSessionCache";
import { useInboxMessages, groupThreads, threadKeyOf, type DecryptedMessage } from "@/lib/useInboxMessages";
import { useDrafts, type Draft } from "@/lib/useDrafts";
import { listContacts } from "@/lib/displayName";
import { HeroConnectButton } from "@/components/ConnectWalletButton";
import InboxSidebar from "@/components/inbox/InboxSidebar";
import InboxTopbar from "@/components/inbox/InboxTopbar";
import MessageListPanel, { type BulkAction } from "@/components/inbox/MessageListPanel";
import MessageDetailPanel from "@/components/inbox/MessageDetailPanel";
import DraftsListPanel from "@/components/inbox/DraftsListPanel";
import ComposeModal, { type ComposeContact } from "@/components/inbox/ComposeModal";
import SettingsModal from "@/components/inbox/SettingsModal";
import type { Folder } from "@/components/inbox/types";

export default function InboxPage() {
  const { isAuthenticated, address, step, isBusy } = useWalletAuth();
  const router = useRouter();

  // Logged out (or session gone): back to the landing page instead of a
  // dead-end gate screen. Two cases:
  // - nothing cached and wallet idle -> nothing will ever restore, bounce now
  // - signatures cached but wallet still reconnecting -> wait briefly, then bounce
  useEffect(() => {
    if (isAuthenticated && address) return;
    if (step === "signing" || step === "connecting" || isBusy) return;
    if (!loadAuthCache()) {
      router.replace("/");
      return;
    }
    const timer = setTimeout(() => router.replace("/"), 4000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, address, step, isBusy, router]);

  if (!isAuthenticated || !address) {
    // Mid-sign or wallet reconnecting: minimal loader plus the picker entry
    // point — no gate copy, no extra links.
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4">
        {step === "signing" || step === "connecting" || isBusy ? (
          <HeroConnectButton />
        ) : (
          <span
            className="h-6 w-6 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin"
            aria-label="Loading"
          />
        )}
      </div>
    );
  }

  return <InboxApp myAddress={address} />;
}

type ComposeState = {
  draftId?: string;
  to?: string;
  subject?: string;
  body?: string;
  threadId?: string | null;
};

function InboxApp({ myAddress }: { myAddress: string }) {
  const { messages, error, isLoading, lastSyncedAt, refresh, setMessageFlags, purgeMessage } =
    useInboxMessages(myAddress);
  const { drafts, saveDraft, deleteDraft } = useDrafts();

  const [folder, setFolder] = useState<Folder>("inbox");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [compose, setCompose] = useState<ComposeState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const filtered = useMemo(() => {
    const all = messages ?? [];
    let byFolder: DecryptedMessage[];
    switch (folder) {
      case "inbox":
        byFolder = all.filter((m) => m.direction === "in" && !m.isArchived && !m.isDeleted);
        break;
      case "sent":
        byFolder = all.filter((m) => m.direction === "out" && !m.isDeleted);
        break;
      case "starred":
        byFolder = all.filter((m) => m.isStarred && !m.isDeleted);
        break;
      case "archive":
        byFolder = all.filter((m) => m.isArchived && !m.isDeleted);
        break;
      case "trash":
        byFolder = all.filter((m) => m.isDeleted);
        break;
      case "drafts":
        byFolder = [];
        break;
    }

    if (!search.trim()) return byFolder;
    const q = search.trim().toLowerCase();
    return byFolder.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.counterparty.toLowerCase().includes(q)
    );
  }, [messages, folder, search]);

  const threads = useMemo(() => groupThreads(filtered), [filtered]);

  const filteredDrafts = useMemo(() => {
    const all = drafts ?? [];
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter(
      (d) =>
        d.subject.toLowerCase().includes(q) ||
        d.body.toLowerCase().includes(q) ||
        d.toRaw.toLowerCase().includes(q)
    );
  }, [drafts, search]);

  const counts = useMemo(() => {
    const all = messages ?? [];
    return {
      inbox: all.filter((m) => m.direction === "in" && !m.isArchived && !m.isDeleted && !m.isRead)
        .length,
      starred: all.filter((m) => m.isStarred && !m.isDeleted).length,
      drafts: drafts?.length ?? 0,
    };
  }, [messages, drafts]);

  // Saved aliases first, then recent counterparties — feeds To autocomplete.
  const contacts: ComposeContact[] = useMemo(() => {
    const saved = listContacts();
    const aliasOf = new Map(saved.map((c) => [c.address.toLowerCase(), c.name]));
    const seen = new Set(saved.map((c) => c.address.toLowerCase()));
    const out: ComposeContact[] = saved.map((c) => ({ ...c }));
    for (const m of messages ?? []) {
      const lower = m.counterparty.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      out.push({ address: m.counterparty, name: aliasOf.get(lower) ?? "", recent: true });
    }
    return out;
  }, [messages]);

  const selectedThread = threads.find((t) => t.key === selectedKey) ?? null;

  function handleSelectThread(key: string) {
    setSelectedKey(key);
    const thread = threads.find((t) => t.key === key);
    if (!thread) return;
    // Opening a thread marks its unread incoming mail read, like Gmail.
    for (const m of thread.messages) {
      if (m.direction === "in" && !m.isRead) void setMessageFlags(m.id, { isRead: true });
    }
    if (thread.latest.direction === "out" && !thread.latest.isSelfSend) {
      // Pull a fresh read receipt — the recipient may have opened it since
      // the last sync.
      void refresh();
    }
  }

  function handleBulk(keys: string[], action: BulkAction) {
    const members = threads
      .filter((t) => keys.includes(t.key))
      .flatMap((t) => t.messages);
    for (const m of members) {
      switch (action) {
        case "read":
          if (m.direction === "in" && !m.isRead) void setMessageFlags(m.id, { isRead: true });
          break;
        case "unread":
          if (m.direction === "in" && m.isRead) void setMessageFlags(m.id, { isRead: false });
          break;
        case "archive":
          if (!m.isArchived) void setMessageFlags(m.id, { isArchived: true });
          break;
        case "trash":
          if (!m.isDeleted) void setMessageFlags(m.id, { isDeleted: true });
          break;
      }
    }
  }

  function openDraft(draft: Draft) {
    setCompose({
      draftId: draft.id,
      to: draft.toRaw,
      subject: draft.subject,
      body: draft.body,
      threadId: draft.threadId,
    });
  }

  function closeNav() {
    setNavOpen(false);
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      {navOpen && (
        <button
          aria-label="Close folders"
          onClick={closeNav}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 h-full transition-transform duration-200 md:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <InboxSidebar
          activeFolder={folder}
          counts={counts}
          myAddress={myAddress}
          onSelectFolder={(f) => {
            setFolder(f);
            setSelectedKey(null);
            closeNav();
          }}
          onCompose={() => {
            setCompose({});
            closeNav();
          }}
          onOpenSettings={() => {
            setSettingsOpen(true);
            closeNav();
          }}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <InboxTopbar
          search={search}
          onSearchChange={setSearch}
          lastSyncedAt={lastSyncedAt}
          isLoading={isLoading}
          onRefresh={() => void refresh()}
          onOpenNav={() => setNavOpen(true)}
          address={myAddress}
        />

        <div className="flex-1 flex min-h-0">
          {folder === "drafts" ? (
            <DraftsListPanel
              drafts={filteredDrafts}
              onOpenDraft={openDraft}
              onDeleteDraft={(id) => void deleteDraft(id)}
            />
          ) : selectedThread ? (
            <MessageDetailPanel
              thread={selectedThread}
              myAddress={myAddress}
              onBack={() => setSelectedKey(null)}
              onToggleStar={(id, next) => void setMessageFlags(id, { isStarred: next })}
              onArchive={(id, next) => {
                void setMessageFlags(id, { isArchived: next });
                setSelectedKey(null);
              }}
              onTrash={(id) => {
                void setMessageFlags(id, { isDeleted: true });
                setSelectedKey(null);
              }}
              onRestore={(id) => {
                void setMessageFlags(id, { isDeleted: false });
                setSelectedKey(null);
              }}
              onPurge={(id) => {
                void purgeMessage(id);
                setSelectedKey(null);
              }}
              onReply={(msg) =>
                setCompose({
                  to: msg.counterparty,
                  subject: msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`,
                  threadId: threadKeyOf(msg),
                })
              }
              onForward={(msg) =>
                setCompose({
                  subject: msg.subject.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`,
                  body: `\n\n---------- Forwarded message ----------\nFrom: ${msg.direction === "out" ? myAddress : msg.counterparty}\nDate: ${new Date(msg.createdAt).toLocaleString()}\nSubject: ${msg.subject}\n\n${msg.body}`,
                })
              }
            />
          ) : (
            <MessageListPanel
              folder={folder}
              threads={threads}
              selectedKey={selectedKey}
              onSelect={handleSelectThread}
              onToggleStar={(id, next) => void setMessageFlags(id, { isStarred: next })}
              onBulk={handleBulk}
              myAddress={myAddress}
            />
          )}
        </div>

        {error && (
          <div className="px-6 py-2 border-t border-red-200 bg-red-50">
            <p className="text-xs text-red-600 font-geist">{error}</p>
          </div>
        )}
      </div>

      {compose && (
        <ComposeModal
          myAddress={myAddress}
          draftId={compose.draftId}
          initialTo={compose.to}
          initialSubject={compose.subject}
          initialBody={compose.body}
          threadId={compose.threadId}
          contacts={contacts}
          onClose={() => setCompose(null)}
          onSent={() => void refresh()}
          onSaveDraft={saveDraft}
          onDeleteDraft={deleteDraft}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        myAddress={myAddress}
      />
    </div>
  );
}
