"use client";

import { useDisplayName } from "@/lib/displayName";

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Alias if the user saved one locally, else a short address. Never hits the network. */
export function ContactLabel({ address, className }: { address: string; className?: string }) {
  const [name] = useDisplayName(address);
  return <span className={className}>{name || shortAddress(address)}</span>;
}

/** Initial-block avatar, Gmail-style. Letter comes from the alias when set. */
export function ContactAvatar({ address, size = "md" }: { address: string; size?: "sm" | "md" }) {
  const [name] = useDisplayName(address);
  const letter = name
    ? name.slice(0, 1).toUpperCase()
    : address.slice(2, 4).toUpperCase();
  const dims = size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs";
  return (
    <span
      className={`inline-flex ${dims} items-center justify-center rounded-full bg-neutral-100 border border-neutral-200 font-geist font-semibold text-neutral-500 shrink-0`}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
