"use client";

import { Star } from "lucide-react";
import type { DecryptedMessage } from "@/lib/useInboxMessages";
import type { Folder } from "./types";
import { FOLDER_LABELS } from "./types";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function MessageListPanel({
  folder,
  messages,
  selectedId,
  onSelect,
  onToggleStar,
}: {
  folder: Folder;
  messages: DecryptedMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string, next: boolean) => void;
}) {
  const emptyCopy: Record<Folder, string> = {
    inbox: "Nothing here. Share your address to receive wallet-signed mail.",
    starred: "Star a message to pin it here.",
    sent: "Mail you send will show up here.",
    drafts: "Drafts you save while composing will show up here.",
    archive: "Archived mail shows up here.",
    trash: "Deleted mail shows up here.",
  };

  return (
    <div className="w-[380px] shrink-0 border-r border-white/10 flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-white font-geist">{FOLDER_LABELS[folder]}</h1>
        <span className="text-xs text-white/40 font-geist">{messages.length} messages</span>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-2">
          <p className="text-sm font-medium text-white font-geist">
            {folder === "inbox" ? "Inbox zero" : `No mail in ${FOLDER_LABELS[folder].toLowerCase()}`}
          </p>
          <p className="text-xs text-white/40 font-geist">{emptyCopy[folder]}</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-white/5">
          {messages.map((msg) => (
            <li key={msg.id}>
              <button
                onClick={() => onSelect(msg.id)}
                className={`w-full text-left px-6 py-3.5 transition-colors ${
                  selectedId === msg.id ? "bg-white/10" : "hover:bg-white/5"
                } ${!msg.isRead && msg.direction === "in" ? "border-l-2 border-green-400" : "border-l-2 border-transparent"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-xs font-geist truncate ${
                      !msg.isRead && msg.direction === "in" ? "text-white font-medium" : "text-white/60"
                    }`}
                  >
                    {msg.counterparty.slice(0, 10)}...
                  </span>
                  <span className="text-[10px] text-white/30 font-geist shrink-0">
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
                <p
                  className={`text-sm truncate font-geist ${
                    !msg.isRead && msg.direction === "in" ? "text-white font-medium" : "text-white/70"
                  }`}
                >
                  {msg.subject}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-white/40 truncate font-geist pr-2">{msg.body}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(msg.id, !msg.isStarred);
                    }}
                    className="shrink-0"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        msg.isStarred ? "fill-yellow-400 text-yellow-400" : "text-white/20"
                      }`}
                    />
                  </button>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
