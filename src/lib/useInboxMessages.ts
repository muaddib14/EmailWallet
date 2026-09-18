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
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  createdAt: string;
};

export type DecryptedMessage = RawMessage & {
  subject: string;
  body: string;
  direction: "in" | "out";
  counterparty: string;
};

const publicKeyCache = new Map<string, string | null>();

async function getPublicKey(address: string): Promise<string | null> {
  if (publicKeyCache.has(address)) return publicKeyCache.get(address) ?? null;
  try {
    const res = await fetch(`/api/wallets/${address}`);
    if (!res.ok) {
      publicKeyCache.set(address, null);
      return null;
    }
    const data = await res.json();
    publicKeyCache.set(address, data.encryptionPublicKey);
    return data.encryptionPublicKey;
  } catch {
    publicKeyCache.set(address, null);
    return null;
  }
}

/** Fetches every message for the signed-in wallet and decrypts it client-side. */
export function useInboxMessages(myAddress: string) {
  const { keyPair } = useWalletAuth();
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
      if (!res.ok) throw new Error("Failed to load messages.");
      const data: { messages: RawMessage[] } = await res.json();

      const decrypted = await Promise.all(
        data.messages.map(async (msg): Promise<DecryptedMessage> => {
          const direction: "in" | "out" = msg.fromAddress === myAddress ? "out" : "in";
          const counterparty = direction === "out" ? msg.toAddress : msg.fromAddress;
          const counterpartyKey = await getPublicKey(counterparty);

          const subject =
            (counterpartyKey &&
              decryptFrom(counterpartyKey, keyPair.secretKey, msg.subjectCiphertext)) ||
            "(unable to decrypt)";
          const body =
            (counterpartyKey &&
              decryptFrom(counterpartyKey, keyPair.secretKey, msg.bodyCiphertext)) ||
            "(unable to decrypt)";

          return { ...msg, direction, counterparty, subject, body };
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
  }, [keyPair, myAddress]);

  useEffect(() => {
    // refresh() only sets state after an awaited fetch + decrypt pass — this
    // is the standard fetch-on-mount pattern, not an accidental sync setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function setMessageFlags(id: string, patch: Partial<Pick<RawMessage, "isRead" | "isStarred" | "isArchived">>) {
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

  return { messages, error, isLoading, lastSyncedAt, refresh, setMessageFlags };
}
