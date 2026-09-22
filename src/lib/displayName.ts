"use client";

import { useCallback, useEffect, useState } from "react";

const PREFIX = "walletmail:display-name:";
const CHANGED_EVENT = "walletmail:display-name-changed";
const MAX_LENGTH = 32;

/**
 * A per-browser pet name for an address ("Mom", "Treasury", ...). Stored in
 * localStorage keyed by lowercase address — it never leaves the browser, so
 * unlike .quill NFT names it can't be scraped into a global directory.
 */
export function getDisplayName(address: string): string {
  try {
    return (localStorage.getItem(PREFIX + address.toLowerCase()) ?? "").slice(0, MAX_LENGTH);
  } catch {
    return "";
  }
}

export function setDisplayName(address: string, name: string) {
  const clean = name.trim().slice(0, MAX_LENGTH);
  try {
    if (clean) localStorage.setItem(PREFIX + address.toLowerCase(), clean);
    else localStorage.removeItem(PREFIX + address.toLowerCase());
  } catch {
    // Storage unavailable — the name just won't persist.
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { address: address.toLowerCase() } }));
}

/** Reactive display name; updates when saved from Settings (same tab or another). */
export function useDisplayName(address: string): [string, (name: string) => void] {  const [name, setName] = useState("");

  useEffect(() => {
    // Reads localStorage (an external system) to restore the saved name —
    // can't do this in the initializer since it has to match the
    // server-rendered "" default until hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(getDisplayName(address));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ address: string }>).detail;
      if (!detail || detail.address === address.toLowerCase()) {
        setName(getDisplayName(address));
      }
    };
    window.addEventListener(CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [address]);

  const save = useCallback((next: string) => setDisplayName(address, next), [address]);

  return [name, save];
}

export type Contact = { address: string; name: string };

/** Every address with a saved local alias — feeds compose autocomplete. */
export function listContacts(): Contact[] {
  const out: Contact[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const address = key.slice(PREFIX.length);
      const name = (localStorage.getItem(key) ?? "").slice(0, MAX_LENGTH);
      if (address.startsWith("0x") && name) out.push({ address, name });
    }
  } catch {
    // Storage unavailable — no contacts.
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
