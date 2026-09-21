"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { Archive, Mail, MailOpen, Star, Trash2, X, Copy, Check } from "lucide-react";
import type { Thread } from "@/lib/useInboxMessages";
import type { Folder } from "./types";
import { FOLDER_LABELS } from "./types";
import { ContactAvatar, ContactLabel } from "./ContactName";
import { ReceiptIcon } from "./ReadReceipt";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function paymentSnippet(msg: { payment: { amountWei: string; token: string; note: string } | null }) {
  if (!msg.payment) return null;
  let amount = msg.payment.amountWei;
  try {
    amount = formatEther(BigInt(msg.payment.amountWei));
  } catch {
    // Fall back to raw wei on malformed data.
  }
  return `${amount} ${msg.payment.token}${msg.payment.note ? ` · ${msg.payment.note}` : ""}`;
}

export type BulkAction = "read" | "unread" | "archive" | "trash";

export default function MessageListPanel({
  folder,
  threads,
  selectedKey,
  onSelect,
  onToggleStar,
  onBulk,
  myAddress,
}: {
  folder: Folder;
  threads: Thread[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onToggleStar: (id: string, next: boolean) => void;
  onBulk: (keys: string[], action: BulkAction) => void;
  myAddress: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const emptyCopy: Record<Folder, string> = {
    inbox: "Share your address to receive wallet-signed mail.",
    starred: "Star a message to pin it here.",
    sent: "Mail you send will show up here.",
    drafts: "Drafts you save while composing will show up here.",
    archive: "Archived mail shows up here.",
    trash: "Deleted mail shows up here.",
  };

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function runBulk(action: BulkAction) {
    onBulk([...selected], action);
    setSelected(new Set());
  }

  function copyAddress() {
    void navigator.clipboard?.writeText(myAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const allSelected = threads.length > 0 && selected.size === threads.length;

  return (
    <div className="w-full h-full bg-white flex flex-col min-w-0">
      <div className="px-4 sm:px-8 py-4 border-b border-neutral-200 shrink-0">
        <div className="flex items-center gap-2">
          {threads.length > 0 && (
            <button
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(threads.map((t) => t.key)))
              }
              title={allSelected ? "Deselect all" : "Select all"}
              className={`h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                allSelected || selected.size > 0
                  ? "bg-neutral-900 border-neutral-900 text-white"
                  : "border-neutral-300 text-transparent hover:border-neutral-500"
              }`}
            >
              <Check className="w-3 h-3" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-neutral-900 font-geist">{FOLDER_LABELS[folder]}</h1>
          <span className="text-xs text-neutral-400 font-geist">
            {threads.length} {threads.length === 1 ? "thread" : "threads"}
          </span>
        </div>

        {selected.size > 0 && (
          <div className="mt-3 flex items-center gap-1 rounded-xl bg-neutral-900 px-3 py-2 [animation:modal-overlay-in_0.15s_ease-out]">
            <span className="text-xs font-geist font-medium text-white mr-2">
              {selected.size} selected
            </span>
            <button
              onClick={() => runBulk("read")}
              title="Mark read"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <MailOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => runBulk("unread")}
              title="Mark unread"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Mail className="w-4 h-4" />
            </button>
            <button
              onClick={() => runBulk("archive")}
              title="Archive"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={() => runBulk("trash")}
              title="Delete"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <span className="flex-1" />
            <button
              onClick={() => setSelected(new Set())}
              title="Clear selection"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {threads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-2">
          <p className="text-sm font-medium text-neutral-900 font-geist">
            {folder === "inbox" ? "Inbox zero" : `No mail in ${FOLDER_LABELS[folder].toLowerCase()}`}
          </p>
          <p className="text-xs text-neutral-400 font-geist">{emptyCopy[folder]}</p>
          {folder === "inbox" && (
            <button
              onClick={copyAddress}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium font-geist text-white hover:bg-neutral-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy my address"}
            </button>
          )}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {threads.map((thread) => {
            const msg = thread.latest;
            const unread = thread.unreadCount > 0;
            const checked = selected.has(thread.key);
            return (
              <li key={thread.key}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(thread.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(thread.key);
                  }}
                  className={`w-full text-left px-4 sm:px-8 py-3.5 transition-colors flex items-center gap-3 sm:gap-4 cursor-pointer group ${
                    selectedKey === thread.key ? "bg-neutral-50" : "hover:bg-neutral-50"
                  } ${unread ? "border-l-2 border-green-500" : "border-l-2 border-transparent"}`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(thread.key);
                    }}
                    title={checked ? "Deselect" : "Select"}
                    className={`h-4 w-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                      checked
                        ? "bg-neutral-900 border-neutral-900 text-white opacity-100"
                        : "border-neutral-300 text-transparent opacity-0 group-hover:opacity-100 hover:border-neutral-500 focus-visible:opacity-100"
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </button>

                  <ContactAvatar address={msg.counterparty} />

                  <span
                    className={`text-sm font-geist truncate w-32 sm:w-44 shrink-0 ${
                      unread ? "text-neutral-900 font-medium" : "text-neutral-500"
                    }`}
                  >
                    <ContactLabel address={msg.counterparty} />
                    {thread.messages.length > 1 && (
                      <span className="ml-1.5 text-[11px] text-neutral-400 font-normal">
                        {thread.messages.length}
                      </span>
                    )}
                  </span>

                  <span className="flex-1 min-w-0 flex items-baseline gap-2">
                    <span
                      className={`text-sm font-geist truncate ${
                        unread ? "text-neutral-900 font-medium" : "text-neutral-700"
                      }`}
                    >
                      {msg.subject}
                    </span>
                    <span className="text-sm text-neutral-400 font-geist truncate hidden sm:inline">
                      — {paymentSnippet(msg) ?? msg.body}
                    </span>
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(msg.id, !msg.isStarred);
                    }}
                    className="shrink-0"
                    title="Star latest message"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        thread.starred ? "fill-yellow-400 text-yellow-500" : "text-neutral-300"
                      }`}
                    />
                  </button>

                  <span className="text-xs text-neutral-400 font-geist shrink-0">
                    {timeAgo(msg.createdAt)}
                  </span>
                  <ReceiptIcon message={msg} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
