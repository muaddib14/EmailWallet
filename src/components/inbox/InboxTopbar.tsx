"use client";

import { useState } from "react";
import { RefreshCw, LogOut } from "lucide-react";
import { useWalletAuth } from "@/lib/useWalletAuth";

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
  address,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  lastSyncedAt: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
  address: string;
}) {
  const { signOut } = useWalletAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-16 shrink-0 border-b border-white/10 flex items-center gap-4 px-6">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search mail, names, wallets"
        className="flex-1 max-w-md bg-white/5 border border-white/10 focus:border-green-500 rounded-lg px-4 py-2 text-sm font-geist placeholder:text-white/30 text-white"
      />

      <div className="flex-1" />

      <span className="text-xs text-green-400 font-geist">
        {isLoading ? "Syncing..." : `Synced ${timeAgo(lastSyncedAt)}`}
      </span>
      <button
        onClick={onRefresh}
        className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        title="Refresh"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full hover:bg-white/5 transition-colors"
        >
          <span className="h-7 w-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-xs font-semibold text-blue-300 font-geist">
            {address.slice(2, 4).toUpperCase()}
          </span>
          <span className="text-left">
            <span className="block text-xs font-medium text-white font-geist leading-tight">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <span className="block text-[10px] text-white/40 font-geist leading-tight">
              Robinhood Chain
            </span>
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-white/10 bg-neutral-900 shadow-xl overflow-hidden z-20">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors font-geist"
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
