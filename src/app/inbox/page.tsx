"use client";

import { useMemo, useState } from "react";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { useInboxMessages, type DecryptedMessage } from "@/lib/useInboxMessages";
import { HeroConnectButton } from "@/components/ConnectWalletButton";
import InboxSidebar from "@/components/inbox/InboxSidebar";
import InboxTopbar from "@/components/inbox/InboxTopbar";
import MessageListPanel from "@/components/inbox/MessageListPanel";
import MessageDetailPanel from "@/components/inbox/MessageDetailPanel";
import ComposeModal from "@/components/inbox/ComposeModal";
import ComposeFab from "@/components/inbox/ComposeFab";
import type { Folder } from "@/components/inbox/types";

export default function InboxPage() {
  const { isAuthenticated, address } = useWalletAuth();

  if (!isAuthenticated || !address) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6 gap-6">
        <h1 className="text-3xl font-geist tracking-tighter text-neutral-900">
          Connect your wallet to open your inbox
        </h1>
        <p className="text-neutral-500 font-geist max-w-md">
          Your inbox is derived entirely from your wallet signature — there&apos;s nothing to
          load until you sign in.
        </p>
        <HeroConnectButton />
      </div>
    );
  }

  return <InboxApp myAddress={address} />;
}

function InboxApp({ myAddress }: { myAddress: string }) {
  const { messages, error, isLoading, lastSyncedAt, refresh, setMessageFlags } =
    useInboxMessages(myAddress);

  const [folder, setFolder] = useState<Folder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [compose, setCompose] = useState<{ to?: string; subject?: string } | null>(null);

  const filtered = useMemo(() => {
    const all = messages ?? [];
    let byFolder: DecryptedMessage[];
    switch (folder) {
      case "inbox":
        byFolder = all.filter((m) => m.direction === "in" && !m.isArchived);
        break;
      case "sent":
        byFolder = all.filter((m) => m.direction === "out");
        break;
      case "starred":
        byFolder = all.filter((m) => m.isStarred);
        break;
      case "archive":
        byFolder = all.filter((m) => m.isArchived);
        break;
      case "drafts":
      case "trash":
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

  const counts = useMemo(() => {
    const all = messages ?? [];
    return {
      inbox: all.filter((m) => m.direction === "in" && !m.isArchived && !m.isRead).length,
      starred: all.filter((m) => m.isStarred).length,
    };
  }, [messages]);

  const selected = filtered.find((m) => m.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId(id);
    const msg = filtered.find((m) => m.id === id);
    if (msg && msg.direction === "in" && !msg.isRead) {
      void setMessageFlags(id, { isRead: true });
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      <InboxSidebar
        activeFolder={folder}
        counts={counts}
        onSelectFolder={(f) => {
          setFolder(f);
          setSelectedId(null);
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <InboxTopbar
          search={search}
          onSearchChange={setSearch}
          lastSyncedAt={lastSyncedAt}
          isLoading={isLoading}
          onRefresh={() => void refresh()}
          address={myAddress}
        />

        <div className="flex-1 flex min-h-0">
          <MessageListPanel
            folder={folder}
            messages={filtered}
            selectedId={selectedId}
            onSelect={handleSelect}
            onToggleStar={(id, next) => void setMessageFlags(id, { isStarred: next })}
          />
          <MessageDetailPanel
            message={selected}
            onToggleStar={(id, next) => void setMessageFlags(id, { isStarred: next })}
            onArchive={(id, next) => {
              void setMessageFlags(id, { isArchived: next });
              setSelectedId(null);
            }}
            onReply={(msg) =>
              setCompose({ to: msg.counterparty, subject: `Re: ${msg.subject}` })
            }
          />
        </div>

        {error && (
          <div className="px-6 py-2 border-t border-red-200 bg-red-50">
            <p className="text-xs text-red-600 font-geist">{error}</p>
          </div>
        )}
      </div>

      {!compose && <ComposeFab onClick={() => setCompose({})} />}

      {compose && (
        <ComposeModal
          myAddress={myAddress}
          initialTo={compose.to}
          initialSubject={compose.subject}
          onClose={() => setCompose(null)}
          onSent={() => void refresh()}
        />
      )}
    </div>
  );
}
