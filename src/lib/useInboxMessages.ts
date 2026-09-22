"use client";

import { useCallback, useEffect, useState } from "react";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { decryptFrom } from "@/lib/crypto";

export type RawMessage = {
  id: string;
  fromAddress: string;
  toAddress: string;
  subjectCiphertext: string;
  bodyCiphertext: string;
  threadId: string | null;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: string;
  /** The OTHER side's read state (null for self-sends) — drives read receipts. */
  readByRecipient: boolean | null;
  /** When the other side first opened it (null if unread / pre-receipt era). */
  readAt: string | null;
  /** On-chain payment proof for a payment-request message (null when unpaid). */
  paidTxHash: string | null;
  paidAmountWei: string | null;
  paidTokenAddress: string | null;
};

export type PaymentRequest = {
  /** Base-unit amount, decimal string. */
  amountWei: string;
  token: string;
  /** ERC-20 contract, or null for native. Absent in pre-token envelopes (= native). */
  tokenAddress: string | null;
  tokenDecimals: number;
  note: string;
};

export type DecryptedMessage = RawMessage & {
  subject: string;
  body: string;
  direction: "in" | "out";
  counterparty: string;
  isSelfSend: boolean;
  /** Present when the decrypted body is a payment-request envelope. */
  payment: PaymentRequest | null;
};

/** A payment-request body is a JSON envelope; anything else is plain prose. */
export function parsePaymentRequest(body: string): PaymentRequest | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const obj: unknown = JSON.parse(trimmed);
    if (typeof obj !== "object" || obj === null) return null;
    const rec = obj as Record<string, unknown>;
    if (rec.kind !== "payment-request") return null;
    if (typeof rec.amountWei !== "string") return null;
    if (typeof rec.token !== "string") return null;
    const tokenAddress =
      rec.tokenAddress === undefined || rec.tokenAddress === null
        ? null
        : typeof rec.tokenAddress === "string"
          ? rec.tokenAddress
          : undefined;
    if (tokenAddress === undefined) return null;
    const tokenDecimals =
      rec.tokenDecimals === undefined || rec.tokenDecimals === null
        ? 18
        : typeof rec.tokenDecimals === "number" &&
            Number.isInteger(rec.tokenDecimals) &&
            rec.tokenDecimals >= 0 &&
            rec.tokenDecimals <= 36
          ? rec.tokenDecimals
          : undefined;
    if (tokenDecimals === undefined) return null;
    return {
      amountWei: rec.amountWei,
      token: rec.token,
      tokenAddress,
      tokenDecimals,
      note: typeof rec.note === "string" ? rec.note : "",
    };
  } catch {
    return null;
  }
}

/** Groups replies with their root: a message's own id when it started a thread. */
export function threadKeyOf(m: { threadId: string | null; id: string }) {
  return m.threadId ?? m.id;
}

export type Thread = {
  key: string;
  messages: DecryptedMessage[]; // oldest first
  latest: DecryptedMessage;
  unreadCount: number; // incoming, unread
  starred: boolean; // any member starred
};

/** Groups flat messages into Gmail-style threads, newest thread first. */
export function groupThreads(messages: DecryptedMessage[]): Thread[] {
  const byKey = new Map<string, DecryptedMessage[]>();
  for (const m of messages) {
    const key = threadKeyOf(m);
    const list = byKey.get(key);
    if (list) list.push(m);
    else byKey.set(key, [m]);
  }
  const threads: Thread[] = [];
  for (const [key, list] of byKey) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const latest = list[list.length - 1];
    threads.push({
      key,
      messages: list,
      latest,
      unreadCount: list.filter((m) => m.direction === "in" && !m.isRead).length,
      starred: list.some((m) => m.isStarred),
    });
  }
  threads.sort(
    (a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime()
  );
  return threads;
}

const publicKeyCache = new Map<string, string>();

async function getPublicKey(address: string): Promise<string | null> {
  if (publicKeyCache.has(address)) return publicKeyCache.get(address) ?? null;
  try {
    const res = await fetch(`/api/wallets/${address}`);
    if (!res.ok) {
      // Deliberately NOT cached: the wallet may publish its key minutes
      // later, and a cached null would fail every compose until a refresh.
      return null;
    }
    const data = await res.json();
    if (data.encryptionPublicKey) publicKeyCache.set(address, data.encryptionPublicKey);
    return data.encryptionPublicKey ?? null;
  } catch {
    return null;
  }
}

/** Fetches every message for the signed-in wallet and decrypts it client-side. */
export function useInboxMessages(myAddress: string) {
  const { keyPair, signOut } = useWalletAuth();
  const [messages, setMessages] = useState<DecryptedMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!keyPair) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messages");
      if (res.status === 401) {
        // Server session expired or revoked: drop local auth so the inbox
        // gate bounces back to the landing page instead of showing stale mail.
        signOut();
        throw new Error("Session expired. Please sign in again.");
      }
      if (!res.ok) throw new Error("Failed to load messages.");
      const data: { messages: RawMessage[] } = await res.json();

      // Addresses from the DB are always lowercased; myAddress comes from
      // wagmi and is EIP-55 checksummed (mixed case) — a strict === here
      // silently makes every message look like "in" from the sender's own
      // perspective too, since it never matches. Compare case-insensitively.
      const myAddressLower = myAddress.toLowerCase();
      const decrypted = await Promise.all(
        data.messages.map(async (msg): Promise<DecryptedMessage> => {
          const direction: "in" | "out" =
            msg.fromAddress.toLowerCase() === myAddressLower ? "out" : "in";
          const counterparty = direction === "out" ? msg.toAddress : msg.fromAddress;
          const isSelfSend =
            msg.fromAddress.toLowerCase() === msg.toAddress.toLowerCase();
          const counterpartyKey = await getPublicKey(counterparty);

          const subject =
            (counterpartyKey &&
              decryptFrom(counterpartyKey, keyPair.secretKey, msg.subjectCiphertext)) ||
            "(unable to decrypt)";
          const body =
            (counterpartyKey &&
              decryptFrom(counterpartyKey, keyPair.secretKey, msg.bodyCiphertext)) ||
            "(unable to decrypt)";

          return { ...msg, direction, counterparty, isSelfSend, subject, body, payment: parsePaymentRequest(body) };
        })
      );

      decrypted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMessages(decrypted);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, [keyPair, myAddress, signOut]);

  useEffect(() => {
    // refresh() only sets state after an awaited fetch + decrypt pass — this
    // is the standard fetch-on-mount pattern, not an accidental sync setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function setMessageFlags(
    id: string,
    patch: Partial<Pick<RawMessage, "isRead" | "isStarred" | "isArchived" | "isDeleted">>
  ) {
    setMessages((prev) => prev?.map((m) => (m.id === id ? { ...m, ...patch } : m)) ?? prev);
    await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {
      // Optimistic update already applied; a failed patch just means the
      // flag won't persist across a refresh. Not worth blocking the UI over.
    });
  }

  /** Delete forever — only meaningful for a message already in Trash. */
  async function purgeMessage(id: string) {
    setMessages((prev) => prev?.filter((m) => m.id !== id) ?? prev);
    await fetch(`/api/messages/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return { messages, error, isLoading, lastSyncedAt, refresh, setMessageFlags, purgeMessage };
}
