"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEther } from "viem";
import { useWalletAuth } from "@/lib/useWalletAuth";
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
import RequestPaymentModal from "@/components/inbox/RequestPaymentModal";
import { toast } from "@/components/Toast";
import SettingsModal from "@/components/inbox/SettingsModal";
import type { Folder } from "@/components/inbox/types";

export default function InboxPage() {
  const { isAuthenticated, address, step, isBusy } = useWalletAuth();
  const router = useRouter();

  // Logged out (or session gone): back to the landing page instead of a
  // dead-end gate screen. The bounce waits ~3s when idle so wallet
  // auto-reconnect + the sibling-tab rescue can still land — bouncing
  // instantly would kill a restore that's already in flight. No timer state
  // needed: the effect itself performs the bounce, so there is no extra
  // setState for the lint rule to complain about.
  useEffect(() => {
    if (isAuthenticated && address) return;
    if (step === "signing" || step === "connecting" || isBusy) return;
    const timer = setTimeout(() => router.replace("/"), 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, address, step, isBusy, router]);

  if (!isAuthenticated || !address) {
    // Mid-sign: entry point with the picker auto-opened. Anything else:
    // render nothing (restoring, or about to bounce) — never an empty
    // button hanging in the middle of the page.
    if (step === "signing" || step === "connecting" || isBusy) {
      const needsSign = step === "signing" && !isBusy;
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4">
          <HeroConnectButton autoOpen={needsSign} />
        </div>
      );
    }
    return null;
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

type PaymentRequestState = { to: string; threadId: string };

// Pure helper so memos below stay lint-honest: localStorage isn't reactive,
// so the alias-change generation (tick) is threaded through as data and
// returned alongside it.
function aliasDataFor(all: DecryptedMessage[] | null, tick: number) {
  const saved = listContacts();
  const aliasOf = new Map(saved.map((c) => [c.address.toLowerCase(), c.name]));
  const seen = new Set(saved.map((c) => c.address.toLowerCase()));
  const contacts: ComposeContact[] = saved.map((c) => ({ ...c }));
  for (const m of all ?? []) {
    const lower = m.counterparty.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    contacts.push({ address: m.counterparty, name: aliasOf.get(lower) ?? "", recent: true });
  }
  return { tick, contacts, aliasOf };
}

function InboxApp({ myAddress }: { myAddress: string }) {
  const { messages, error, isLoading, lastSyncedAt, refresh, setMessageFlags, purgeMessage } =
    useInboxMessages(myAddress);
  const { drafts, saveDraft, deleteDraft } = useDrafts();

  const [folder, setFolder] = useState<Folder>("inbox");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [compose, setCompose] = useState<ComposeState | null>(null);
  const [requesting, setRequesting] = useState<PaymentRequestState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // Bumps whenever a local alias is saved (any tab), so search and
  // autocomplete see fresh names without waiting for a message sync.
  const [aliasTick, setAliasTick] = useState(0);

  useEffect(() => {
    const bump = () => setAliasTick((t) => t + 1);
    window.addEventListener("walletmail:display-name-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("walletmail:display-name-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  // Saved aliases + recent counterparties in one memo (plus the alias map
  // for search) — rebuilt when messages arrive or an alias is saved. Declared
  // before `filtered` because the search predicate reads `aliasOf`.
  const { contacts, aliasOf } = useMemo(
    () => aliasDataFor(messages, aliasTick),
    [messages, aliasTick]
  );

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
        m.counterparty.toLowerCase().includes(q) ||
        (aliasOf.get(m.counterparty.toLowerCase()) ?? "").toLowerCase().includes(q)
    );
  }, [messages, folder, search, aliasOf]);

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
          onOpenSettings={() => setSettingsOpen(true)}
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
              onForward={(msg) => {
                // Payment requests forward as human prose, never the raw JSON
                // envelope (which would leak gibberish to the next recipient).
                const forwardedBody = msg.payment
                  ? (() => {
                      let amount = msg.payment!.amountWei;
                      try {
                        amount = formatEther(BigInt(msg.payment!.amountWei));
                      } catch {
                        // Keep raw wei on malformed data.
                      }
                      return `\n\n---------- Forwarded payment request ----------\nAmount: ${amount} ${msg.payment!.token}${msg.payment!.note ? `\nNote: ${msg.payment!.note}` : ""}`;
                    })()
                  : msg.body;
                return setCompose({
                  subject: msg.subject.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`,
                  body: `\n\n---------- Forwarded message ----------\nFrom: ${msg.direction === "out" ? myAddress : msg.counterparty}\nDate: ${new Date(msg.createdAt).toLocaleString()}\nSubject: ${msg.subject}\n\n${forwardedBody}`,
                });
              }}
              onRequest={(msg) =>
                setRequesting({ to: msg.counterparty, threadId: threadKeyOf(msg) })
              }
              onPaid={() => void refresh()}
            />
          ) : (
            <MessageListPanel
              folder={folder}
              threads={threads}
              selectedKey={selectedKey}
              onSelect={handleSelectThread}
              onToggleStar={(id, next) => void setMessageFlags(id, { isStarred: next })}
              onBulk={handleBulk}
              onCompose={() => setCompose({})}
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
          onSent={() => {
            toast("Message sent — encrypted & signed");
            void refresh();
          }}
          onSaveDraft={saveDraft}
          onDeleteDraft={deleteDraft}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        myAddress={myAddress}
      />

      {requesting && (
        <RequestPaymentModal
          to={requesting.to}
          threadId={requesting.threadId}
          onClose={() => setRequesting(null)}
          onSent={() => void refresh()}
        />
      )}
    </div>
  );
}
