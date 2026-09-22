"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PenSquare,
  Banknote,
  Inbox as InboxIcon,
  Star,
  Send,
  FileText,
  Archive as ArchiveIcon,
  Trash2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { Folder } from "./types";
import { FOLDER_LABELS } from "./types";
import { useDisplayName } from "@/lib/displayName";
import { LABEL_STYLES, type Label } from "@/lib/useLabels";

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
  myAddress,
  labelDefs,
  labelCounts,
  activeLabel,
  onSelectFolder,
  onSelectLabel,
  onCompose,
  onRequestNew,
  onOpenSettings,
}: {
  activeFolder: Folder;
  counts: Partial<Record<Folder, number>>;
  myAddress: string;
  labelDefs: Label[] | null;
  labelCounts: Record<string, number>;
  activeLabel: string | null;
  onSelectFolder: (folder: Folder) => void;
  onSelectLabel: (id: string | null) => void;
  onCompose: () => void;
  onRequestNew: () => void;
  onOpenSettings: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [displayName] = useDisplayName(myAddress);

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
        <div className="flex items-center justify-between mb-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <span className="text-lg font-semibold tracking-tight text-neutral-900 font-geist truncate">
                Quill
              </span>
            </Link>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`p-1.5 rounded-lg border border-transparent text-neutral-400 hover:text-neutral-900 hover:bg-white hover:border-neutral-200 transition-colors shrink-0 ${
              collapsed ? "mx-auto" : ""
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
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
        <button
          onClick={onRequestNew}
          title="Request payment (testnet)"
          className={`mt-2 inline-flex items-center gap-2 rounded-full bg-white border border-neutral-200 text-neutral-700 text-sm font-medium font-geist h-10 hover:bg-neutral-50 hover:border-neutral-300 transition-colors ${
            collapsed ? "w-10 justify-center px-0" : "w-full justify-center"
          }`}
        >
          <Banknote className="w-4 h-4 shrink-0" />
          {!collapsed && "Request"}
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

      {(labelDefs ?? []).length > 0 && (
        <div className="px-2 pb-2 shrink-0">
          {!collapsed && (
            <p className="px-3 pt-2 pb-1 text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400">
              Labels
            </p>
          )}
          <div className="space-y-0.5 max-h-40 overflow-y-auto overflow-x-hidden">
            {(labelDefs ?? []).map((label) => {
              const isActive = label.id === activeLabel;
              const count = labelCounts[label.id] ?? 0;
              return (
                <button
                  key={label.id}
                  onClick={() => onSelectLabel(isActive ? null : label.id)}
                  title={collapsed ? label.name : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-geist transition-colors ${
                    collapsed ? "justify-center" : "justify-between"
                  } ${
                    isActive
                      ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-white/60"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${LABEL_STYLES[label.color].dot}`} />
                    {!collapsed && <span className="truncate">{label.name}</span>}
                  </span>
                  {!collapsed && count > 0 && (
                    <span className="text-[11px] text-neutral-400 font-geist shrink-0">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-2 border-t border-neutral-200 space-y-0.5">
        {!collapsed && (
          <button
            onClick={onOpenSettings}
            title="Open settings"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/60 transition-colors text-left"
          >
            <span className="h-8 w-8 rounded-full bg-neutral-900 flex items-center justify-center text-xs font-geist font-semibold text-white shrink-0">
              {displayName
                ? displayName.slice(0, 1).toUpperCase()
                : myAddress.slice(2, 4).toUpperCase()}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-medium text-neutral-900 font-geist truncate">
                {displayName || `${myAddress.slice(0, 6)}...${myAddress.slice(-4)}`}
              </span>
              <span className="block text-[10px] text-neutral-400 font-geist">
                Robinhood Chain
              </span>
            </span>
          </button>
        )}
        <button
          onClick={onOpenSettings}
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
