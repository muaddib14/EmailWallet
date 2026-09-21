"use client";

import type { CachedAuth } from "@/lib/authSessionCache";

const CHANNEL_NAME = "walletmail:auth";

type BridgeMessage =
  | { kind: "auth-request"; fromTab: string }
  | { kind: "auth-response"; toTab: string; payload: CachedAuth };

function getChannel(): BroadcastChannel | null {
  try {
    // typeof-guard (not a window check) so this stays SSR-safe while still
    // working wherever BroadcastChannel exists.
    if (typeof BroadcastChannel === "undefined") return null;
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/**
 * Cross-tab auth handoff. Signatures live in sessionStorage, which dies with
 * its tab — so opening a proof link in a NEW tab used to force both wallet
 * signatures again even though the server session (cookie) was still valid
 * and another tab already held everything needed.
 *
 * With this, a fresh tab asks its siblings for the cached signatures instead
 * of bothering the wallet. Scope notes:
 * - BroadcastChannel is same-origin by platform design: only our own tabs
 *   can ask or answer. Nothing touches the network.
 * - A response is only accepted for the address the wallet reconnected with,
 *   so a different account never inherits someone else's session.
 * - Needs at least one sibling tab still open with a live sign-in. Fresh
 *   browser, closed tabs, or incognito still go through the normal 2-signature
 *   flow — that path is unavoidable (the keys only exist as signatures).
 */
export function requestAuthFromSibling(timeoutMs = 1500): Promise<CachedAuth | null> {
  return new Promise((resolve) => {
    const channel = getChannel();
    if (!channel) {
      resolve(null);
      return;
    }
    const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = setTimeout(() => {
      channel.close();
      resolve(null);
    }, timeoutMs);
    channel.onmessage = (event: MessageEvent<BridgeMessage>) => {
      const msg = event.data;
      if (msg?.kind === "auth-response" && msg.toTab === tabId && msg.payload) {
        clearTimeout(timer);
        channel.close();
        resolve(msg.payload);
      }
    };
    channel.postMessage({ kind: "auth-request", fromTab: tabId } satisfies BridgeMessage);
  });
}

/** Answer auth requests from sibling tabs using this tab's cache. Returns an unsubscribe. */
export function serveAuthToSiblings(getCache: () => CachedAuth | null): () => void {
  const channel = getChannel();
  if (!channel) return () => {};
  channel.onmessage = (event: MessageEvent<BridgeMessage>) => {
    const msg = event.data;
    if (msg?.kind !== "auth-request") return;
    const cached = getCache();
    if (!cached) return;
    channel.postMessage({
      kind: "auth-response",
      toTab: msg.fromTab,
      payload: cached,
    } satisfies BridgeMessage);
  };
  return () => channel.close();
}
