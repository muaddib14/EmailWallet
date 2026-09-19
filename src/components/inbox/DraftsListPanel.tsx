"use client";

import { Trash2 } from "lucide-react";
import type { Draft } from "@/lib/useDrafts";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function DraftsListPanel({
  drafts,
  onOpenDraft,
  onDeleteDraft,
}: {
  drafts: Draft[];
  onOpenDraft: (draft: Draft) => void;
  onDeleteDraft: (id: string) => void;
}) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="px-8 py-4 border-b border-neutral-200 flex items-center gap-2 shrink-0">
        <h1 className="text-lg font-semibold text-neutral-900 font-geist">Drafts</h1>
        <span className="text-xs text-neutral-400 font-geist">{drafts.length} messages</span>
      </div>

      {drafts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-2">
          <p className="text-sm font-medium text-neutral-900 font-geist">No drafts</p>
          <p className="text-xs text-neutral-400 font-geist">
            Drafts you save while composing will show up here.
          </p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {drafts.map((draft) => (
            <li key={draft.id} className="group relative">
              <button
                onClick={() => onOpenDraft(draft)}
                className="w-full text-left px-8 py-3.5 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1 pr-6">
                  <span className="text-xs font-geist text-neutral-500 truncate">
                    {draft.toRaw ? `To: ${draft.toRaw}` : "No recipient yet"}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-geist shrink-0">
                    {timeAgo(draft.updatedAt)}
                  </span>
                </div>
                <p className="text-sm truncate font-geist text-neutral-900">
                  {draft.subject || "(no subject)"}
                </p>
                <p className="text-xs text-neutral-400 truncate font-geist">{draft.body}</p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDraft(draft.id);
                }}
                title="Delete draft"
                className="absolute top-3.5 right-6 p-1 rounded text-neutral-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
