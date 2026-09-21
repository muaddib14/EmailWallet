"use client";

import { useState } from "react";
import { Check, Copy, Menu, RefreshCw, LogOut, Settings as SettingsIcon } from "lucide-react";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { useDisplayName } from "@/lib/displayName";
import { toast } from "@/components/Toast";

function timeAgo(date: Date | null) {
  if (!date) return "never";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function InboxTopbar({
  search,
  onSearchChange,
  lastSyncedAt,
  isLoading,
  onRefresh,
  onOpenNav,
  onOpenSettings,
  address,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  lastSyncedAt: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenNav: () => void;
  onOpenSettings: () => void;
  address: string;
}) {
  const { signOut } = useWalletAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [displayName] = useDisplayName(address);
  const avatarLetter = displayName
    ? displayName.slice(0, 1).toUpperCase()
    : address.slice(2, 4).toUpperCase();

  return (
    <header className="h-16 shrink-0 border-b border-neutral-200 bg-white flex items-center gap-2 sm:gap-4 px-4 sm:px-6">
      <button
        onClick={onOpenNav}
        title="Open folders"
        className="md:hidden p-2 -ml-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search mail, names, wallets"
        className="flex-1 max-w-md bg-neutral-50 border border-neutral-200 focus:border-green-600 focus:bg-white rounded-lg px-4 py-2 text-sm font-geist placeholder:text-neutral-400 text-neutral-900 transition-colors"
      />

      <div className="flex-1" />

      <span className="hidden sm:inline text-xs text-green-700 font-geist">
        {isLoading ? "Syncing..." : `Synced ${timeAgo(lastSyncedAt)}`}
      </span>
      <button
        onClick={onRefresh}
        className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
        title="Refresh"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full hover:bg-neutral-100 transition-colors"
        >
          <span className="h-7 w-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-semibold text-blue-600 font-geist">
            {avatarLetter}
          </span>
          <span className="text-left">
            <span className="block text-xs font-medium text-neutral-900 font-geist leading-tight">
              {displayName || `${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
            <span className="block text-[10px] text-neutral-400 font-geist leading-tight">
              Robinhood Chain
            </span>
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-neutral-200 bg-white shadow-xl overflow-hidden z-20 p-1">
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors font-geist"
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(address).then(
                  () => {
                    setCopied(true);
                    toast("Address copied");
                    setTimeout(() => setCopied(false), 1500);
                  },
                  () => toast("Couldn't copy the address", "error")
                );
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors font-geist"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy address"}
            </button>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors font-geist"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
