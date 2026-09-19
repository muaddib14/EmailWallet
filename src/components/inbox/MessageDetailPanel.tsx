"use client";

import { Mail, Star, Archive, Reply, Trash2, RotateCcw } from "lucide-react";
import type { DecryptedMessage } from "@/lib/useInboxMessages";

export default function MessageDetailPanel({
  message,
  onToggleStar,
  onArchive,
  onTrash,
  onRestore,
  onPurge,
  onReply,
}: {
  message: DecryptedMessage | null;
  onToggleStar: (id: string, next: boolean) => void;
  onArchive: (id: string, next: boolean) => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
  onReply: (message: DecryptedMessage) => void;
}) {
  if (!message) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3 bg-white">
        <div className="h-16 w-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center">
          <Mail className="w-7 h-7 text-green-600" />
        </div>
        <p className="text-base font-medium text-neutral-900 font-geist">Select a message to read it</p>
        <p className="text-sm text-neutral-400 font-geist max-w-sm">
          Every message is signed by the sender&apos;s wallet and stored encrypted for your
          wallet only.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="px-8 py-5 border-b border-neutral-200 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-neutral-900 font-geist mb-1.5">{message.subject}</h2>
          <p className="text-xs text-neutral-400 font-geist">
            {message.direction === "out" ? "To " : "From "}
            <span className="text-neutral-600">{message.counterparty}</span>
            {" · "}
            {new Date(message.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {message.isDeleted ? (
            <>
              <button
                onClick={() => onRestore(message.id)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Restore to inbox"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPurge(message.id)}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete forever"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onToggleStar(message.id, !message.isStarred)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Star"
              >
                <Star className={`w-4 h-4 ${message.isStarred ? "fill-yellow-400 text-yellow-500" : ""}`} />
              </button>
              <button
                onClick={() => onArchive(message.id, !message.isArchived)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={() => onTrash(message.id)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Move to trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <p className="text-sm text-neutral-700 font-geist leading-relaxed whitespace-pre-wrap">
          {message.body}
        </p>
      </div>

      <div className="px-8 py-4 border-t border-neutral-200 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-green-700 font-geist">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Signed &amp; end-to-end encrypted
        </div>
        {!message.isDeleted && (
          <button
            onClick={() => onReply(message)}
            className="inline-flex items-center gap-2 text-sm font-medium text-white bg-neutral-900 rounded-lg px-4 py-2 hover:bg-neutral-800 transition font-geist"
          >
            <Reply className="w-4 h-4" />
            Reply
          </button>
        )}
      </div>
    </div>
  );
}
