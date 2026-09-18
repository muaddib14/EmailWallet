"use client";

import { Mail, Star, Archive, Reply } from "lucide-react";
import type { DecryptedMessage } from "@/lib/useInboxMessages";

export default function MessageDetailPanel({
  message,
  onToggleStar,
  onArchive,
  onReply,
}: {
  message: DecryptedMessage | null;
  onToggleStar: (id: string, next: boolean) => void;
  onArchive: (id: string, next: boolean) => void;
  onReply: (message: DecryptedMessage) => void;
}) {
  if (!message) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
        <div className="h-16 w-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Mail className="w-7 h-7 text-green-400" />
        </div>
        <p className="text-base font-medium text-white font-geist">Select a message to read it</p>
        <p className="text-sm text-white/40 font-geist max-w-sm">
          Every message is signed by the sender&apos;s wallet and stored encrypted for your
          wallet only.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="px-8 py-5 border-b border-white/10 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-white font-geist mb-1.5">{message.subject}</h2>
          <p className="text-xs text-white/40 font-geist">
            {message.direction === "out" ? "To " : "From "}
            <span className="text-white/70">{message.counterparty}</span>
            {" · "}
            {new Date(message.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleStar(message.id, !message.isStarred)}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Star"
          >
            <Star className={`w-4 h-4 ${message.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </button>
          <button
            onClick={() => onArchive(message.id, !message.isArchived)}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <p className="text-sm text-white/80 font-geist leading-relaxed whitespace-pre-wrap">
          {message.body}
        </p>
      </div>

      <div className="px-8 py-4 border-t border-white/10 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-green-400 font-geist">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          Signed &amp; end-to-end encrypted
        </div>
        <button
          onClick={() => onReply(message)}
          className="inline-flex items-center gap-2 text-sm font-medium text-black bg-white rounded-lg px-4 py-2 hover:bg-neutral-200 transition font-geist"
        >
          <Reply className="w-4 h-4" />
          Reply
        </button>
      </div>
    </div>
  );
}
