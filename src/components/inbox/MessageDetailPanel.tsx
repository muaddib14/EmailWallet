"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Star,
  Archive,
  Reply,
  Trash2,
  RotateCcw,
  Forward,
  Pencil,
  Share2,
  Banknote,
  Sparkles,
} from "lucide-react";
import type { DecryptedMessage, Thread } from "@/lib/useInboxMessages";
import type { LabelColor } from "@/lib/db/queries";
import type { Label } from "@/lib/useLabels";
import { useDisplayName } from "@/lib/displayName";
import { ContactAvatar, ContactLabel, shortAddress } from "./ContactName";
import { ReceiptLabel } from "./ReadReceipt";
import { PaymentCard } from "./PaymentCard";
import { AttachmentChips } from "./Attachments";
import type { AttachmentMeta } from "@/lib/attachments";
import { LabelChips, LabelPicker } from "./LabelPicker";
import { toast } from "@/components/Toast";

function AliasEditor({ address }: { address: string }) {
  const [name, saveName] = useDisplayName(address);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <ContactLabel
          address={address}
          className={`truncate ${name ? "text-neutral-900 font-medium" : "text-neutral-500"}`}
        />
        <button
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          title={name ? "Rename" : "Add a private name"}
          className="p-0.5 rounded text-neutral-300 hover:text-neutral-700 transition-colors shrink-0"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <input
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value.slice(0, 32))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            saveName(draft);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Private name…"
        maxLength={32}
        className="w-32 rounded-md border border-neutral-300 px-1.5 py-0.5 text-xs font-geist text-neutral-900 outline-none focus:border-neutral-900"
      />
      <button
        onClick={() => {
          saveName(draft);
          setEditing(false);
        }}
        className="text-[11px] font-geist font-medium text-neutral-900 hover:underline"
      >
        Save
      </button>
    </span>
  );
}

export default function MessageDetailPanel({
  thread,
  myAddress,
  onBack,
  onToggleStar,
  onArchive,
  onTrash,
  onRestore,
  onPurge,
  onReply,
  onForward,
  onRequest,
  onPaid,
  onSummarize,
  labelDefs,
  labelMap,
  onSetLabels,
  onCreateLabel,
  onDeleteLabel,
}: {
  thread: Thread;
  myAddress: string;
  onBack: () => void;
  onToggleStar: (id: string, next: boolean) => void;
  onArchive: (id: string, next: boolean) => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
  onReply: (message: DecryptedMessage) => void;
  onForward: (message: DecryptedMessage) => void;
  onRequest: (message: DecryptedMessage) => void;
  onPaid: () => void;
  onSummarize: () => void;
  labelDefs: Label[] | null;
  labelMap: Record<string, string[]>;
  onSetLabels: (id: string, labelIds: string[]) => void;
  onCreateLabel: (name: string, color: LabelColor) => Promise<void>;
  onDeleteLabel: (id: string) => void;
}) {
  const { messages, latest } = thread;
  const trashed = latest.isDeleted;
  const allArchived = messages.every((m) => m.isArchived);

  // Attachment metadata for the whole thread in one request. Keyed by the
  // joined message ids so re-renders from flag toggles don't refetch.
  const [attachMap, setAttachMap] = useState<Record<string, AttachmentMeta[]>>({});
  const threadIdsKey = messages.map((m) => m.id).join(",");
  useEffect(() => {
    if (threadIdsKey === "") return;
    fetch(`/api/attachments?messageIds=${encodeURIComponent(threadIdsKey)}`)
      .then((res) => (res.ok ? res.json() : { attachments: [] }))
      .then((data: { attachments: AttachmentMeta[] }) => {
        const map: Record<string, AttachmentMeta[]> = {};
        for (const a of data.attachments ?? []) {
          (map[a.messageId] ??= []).push(a);
        }
        setAttachMap(map);
      })
      .catch(() => {});
  }, [threadIdsKey]);

  function copyProofLink() {
    const url = `${window.location.origin}/verify/${latest.id}`;
    void navigator.clipboard?.writeText(url).then(
      () => toast("Proof link copied — anyone can verify the signature"),
      () => toast("Couldn't copy the link", "error")
    );
  }

  function archiveThread() {
    for (const m of messages) {
      if (m.isArchived !== !allArchived) void onArchive(m.id, !allArchived);
    }
  }

  function trashThread() {
    for (const m of messages) {
      if (!m.isDeleted) void onTrash(m.id);
    }
  }

  function restoreThread() {
    for (const m of messages) {
      if (m.isDeleted) void onRestore(m.id);
    }
  }

  function purgeThread() {
    for (const m of messages) {
      if (m.isDeleted) void onPurge(m.id);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white min-w-0">
      <div className="px-4 sm:px-8 py-5 border-b border-neutral-200 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 -ml-2 mt-0.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
            title="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl font-medium text-neutral-900 font-geist mb-1.5 truncate">
              {latest.subject}
            </h2>
            <p className="text-xs text-neutral-400 font-geist">
              {messages.length > 1 ? `${messages.length} messages · ` : ""}
              {new Date(latest.createdAt).toLocaleString()}
            </p>
            {latest.direction === "out" && !latest.isSelfSend && (
              <p className="mt-1 text-xs font-geist">
                <ReceiptLabel message={latest} />
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {trashed ? (
            <>
              <button
                onClick={onSummarize}
                className="p-2 rounded-lg text-violet-400 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                title="Summarize this thread (AI)"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={copyProofLink}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Copy public proof link"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={restoreThread}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Restore thread"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={purgeThread}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete forever"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSummarize}
                className="p-2 rounded-lg text-violet-400 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                title="Summarize this thread (AI)"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={copyProofLink}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Copy public proof link"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={archiveThread}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title={allArchived ? "Unarchive thread" : "Archive thread"}
              >
                <Archive className={`w-4 h-4 ${allArchived ? "fill-neutral-200" : ""}`} />
              </button>
              <button
                onClick={trashThread}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Move thread to trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-5">
        {messages.map((message) => {
          const mine = message.direction === "out";
          return (
            <article
              key={message.id}
              className="rounded-2xl border border-neutral-200 bg-white overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-4 py-3 bg-neutral-50/60 border-b border-neutral-100">
                <ContactAvatar address={mine ? myAddress : message.counterparty} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-geist truncate">
                    {mine ? (
                      <span className="text-neutral-500">
                        You to <ContactLabel address={message.counterparty} className="text-neutral-900 font-medium" />
                      </span>
                    ) : (
                      <AliasEditor address={message.counterparty} />
                    )}
                  </p>
                  <p className="text-[11px] text-neutral-400 font-geist font-mono truncate">
                    {shortAddress(message.counterparty)}
                    {" · "}
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
                <LabelPicker
                  assigned={labelMap[message.id] ?? []}
                  labels={labelDefs}
                  onChange={(ids) => onSetLabels(message.id, ids)}
                  onCreate={onCreateLabel}
                  onDelete={onDeleteLabel}
                />
                <button
                  onClick={() => onToggleStar(message.id, !message.isStarred)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
                  title="Star"
                >
                  <Star
                    className={`w-4 h-4 ${message.isStarred ? "fill-yellow-400 text-yellow-500" : ""}`}
                  />
                </button>
              </div>
              {!message.payment && (
                <p className="px-4 py-4 text-sm text-neutral-700 font-geist leading-relaxed whitespace-pre-wrap">
                  {message.body}
                </p>
              )}
              {(labelMap[message.id] ?? []).length > 0 && (
                <div className="px-4 pt-3">
                  <LabelChips labelIds={labelMap[message.id] ?? []} labels={labelDefs} />
                </div>
              )}
              {message.payment && (
                <div className="px-4 py-4">
                  <PaymentCard message={message} onPaid={onPaid} />
                </div>
              )}
              {(attachMap[message.id] ?? []).length > 0 && (
                <div className="px-4 pb-4">
                  <AttachmentChips
                    items={attachMap[message.id] ?? []}
                    counterparty={message.counterparty}
                  />
                </div>
              )}
              {mine && !message.isSelfSend && (
                <p className="px-4 pb-3 text-xs font-geist">
                  <ReceiptLabel message={message} />
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="px-4 sm:px-8 py-4 border-t border-neutral-200 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-green-700 font-geist">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Signed &amp; end-to-end encrypted
        </div>
        {!trashed && (
          <div className="flex items-center gap-2">
            {!latest.isSelfSend && (
              <button
                onClick={() => onRequest(latest)}
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg px-4 py-2 hover:bg-neutral-50 transition font-geist"
              >
                <Banknote className="w-4 h-4" />
                Request
              </button>
            )}
            <button
              onClick={() => onForward(latest)}
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg px-4 py-2 hover:bg-neutral-50 transition font-geist"
            >
              <Forward className="w-4 h-4" />
              Forward
            </button>
            <button
              onClick={() => onReply(latest)}
              className="inline-flex items-center gap-2 text-sm font-medium text-white bg-neutral-900 rounded-lg px-4 py-2 hover:bg-neutral-800 transition font-geist"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
