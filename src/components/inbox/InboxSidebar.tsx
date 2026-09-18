"use client";

import Link from "next/link";
import {
  PenSquare,
  Inbox as InboxIcon,
  Star,
  Send,
  FileText,
  Archive as ArchiveIcon,
  Trash2,
  Users,
  Bell,
  Settings,
} from "lucide-react";
import type { Folder } from "./types";
import { FOLDER_LABELS } from "./types";

const FOLDER_ICONS: Record<Folder, typeof InboxIcon> = {
  inbox: InboxIcon,
  starred: Star,
  sent: Send,
  drafts: FileText,
  archive: ArchiveIcon,
  trash: Trash2,
};

const FOLDERS: Folder[] = ["inbox", "starred", "sent", "drafts", "archive", "trash"];

export default function InboxSidebar({
  activeFolder,
  counts,
  onSelectFolder,
  onCompose,
}: {
  activeFolder: Folder;
  counts: Partial<Record<Folder, number>>;
  onSelectFolder: (folder: Folder) => void;
  onCompose: () => void;
}) {
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 flex flex-col h-full">
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2 px-2 mb-4">
          <span className="text-lg font-semibold tracking-tight text-white font-geist">
            Wallet Mail
          </span>
        </Link>

        <button
          onClick={onCompose}
          className="w-full inline-flex items-center gap-2 justify-center rounded-full bg-white text-black text-sm font-medium font-geist h-10 hover:bg-neutral-200 transition"
        >
          <PenSquare className="w-4 h-4" />
          New mail
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {FOLDERS.map((folder) => {
          const Icon = FOLDER_ICONS[folder];
          const isActive = folder === activeFolder;
          const count = counts[folder];
          return (
            <button
              key={folder}
              onClick={() => onSelectFolder(folder)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-geist transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                {FOLDER_LABELS[folder]}
              </span>
              {!!count && count > 0 && (
                <span className="text-[11px] text-white/40 font-geist">{count}</span>
              )}
            </button>
          );
        })}

        <p className="px-3 pt-5 pb-1.5 text-[10px] uppercase tracking-wider text-white/30 font-geist">
          People
        </p>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-geist text-white/60 hover:text-white hover:bg-white/5 transition-colors">
          <Users className="w-4 h-4" />
          Contacts
        </button>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-geist text-white/60 hover:text-white hover:bg-white/5 transition-colors">
          <Bell className="w-4 h-4" />
          Notifications
        </button>
      </nav>

      <div className="p-2 border-t border-white/10">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-geist text-white/60 hover:text-white hover:bg-white/5 transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
