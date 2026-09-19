"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PenSquare,
  Inbox as InboxIcon,
  Star,
  Send,
  FileText,
  Archive as ArchiveIcon,
  Trash2,
  Settings,
  ChevronsLeft,
  ChevronsRight,
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
const COLLAPSE_KEY = "walletmail:sidebar-collapsed";

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
  const [collapsed, setCollapsed] = useState(false);

  // Remembered per-browser only (not synced anywhere) — a layout preference,
  // not account data, so localStorage is the right tool here.
  useEffect(() => {
    // Reads localStorage (an external system) once on mount to restore the
    // last layout choice — can't do this in the initializer since it has to
    // match the server-rendered "expanded" default until hydration.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Storage unavailable — just default to expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Nothing to persist to; the toggle still works for this session.
      }
      return next;
    });
  }

  return (
    <aside
      className={`shrink-0 border-r border-neutral-200 bg-neutral-50 flex flex-col h-full transition-[width] duration-200 ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4 px-2">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <span className="text-lg font-semibold tracking-tight text-neutral-900 font-geist truncate">
                Wallet Mail
              </span>
            </Link>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-white transition-colors shrink-0 ${
              collapsed ? "mx-auto" : ""
            }`}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={onCompose}
          title="New mail"
          className={`inline-flex items-center gap-2 rounded-full bg-green-600 text-white text-sm font-medium font-geist h-10 hover:bg-green-700 transition-colors shadow-sm ${
            collapsed ? "w-10 justify-center px-0" : "w-full justify-center"
          }`}
        >
          <PenSquare className="w-4 h-4 shrink-0" />
          {!collapsed && "New mail"}
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {FOLDERS.map((folder) => {
          const Icon = FOLDER_ICONS[folder];
          const isActive = folder === activeFolder;
          const count = counts[folder];
          return (
            <button
              key={folder}
              onClick={() => onSelectFolder(folder)}
              title={collapsed ? FOLDER_LABELS[folder] : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-geist transition-colors ${
                collapsed ? "justify-center" : "justify-between"
              } ${
                isActive
                  ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-white/60"
              }`}
            >
              <span className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "" : ""}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{FOLDER_LABELS[folder]}</span>}
              </span>
              {!collapsed && !!count && count > 0 && (
                <span className="text-[11px] text-neutral-400 font-geist shrink-0">{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-neutral-200">
        <button
          title={collapsed ? "Settings" : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-geist text-neutral-500 hover:text-neutral-900 hover:bg-white/60 transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && "Settings"}
        </button>
      </div>
    </aside>
  );
}
