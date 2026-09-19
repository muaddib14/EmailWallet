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
    <aside className="w-64 shrink-0 border-r border-neutral-200 bg-neutral-50 flex flex-col h-full">
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2 px-2 mb-4">
          <span className="text-lg font-semibold tracking-tight text-neutral-900 font-geist">
            Wallet Mail
          </span>
        </Link>

        <button
          onClick={onCompose}
          className="w-full inline-flex items-center gap-2 justify-center rounded-full bg-green-600 text-white text-sm font-medium font-geist h-10 hover:bg-green-700 transition-colors shadow-sm"
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
                isActive
                  ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-white/60"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                {FOLDER_LABELS[folder]}
              </span>
              {!!count && count > 0 && (
                <span className="text-[11px] text-neutral-400 font-geist">{count}</span>
              )}
            </button>
          );
        })}

        <p className="px-3 pt-5 pb-1.5 text-[10px] uppercase tracking-wider text-neutral-400 font-geist">
          People
        </p>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-geist text-neutral-500 hover:text-neutral-900 hover:bg-white/60 transition-colors">
          <Users className="w-4 h-4" />
          Contacts
        </button>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-geist text-neutral-500 hover:text-neutral-900 hover:bg-white/60 transition-colors">
          <Bell className="w-4 h-4" />
          Notifications
        </button>
      </nav>

      <div className="p-2 border-t border-neutral-200">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-geist text-neutral-500 hover:text-neutral-900 hover:bg-white/60 transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
