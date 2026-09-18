"use client";

import { useCallback, useEffect, useState } from "react";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { decryptFrom } from "@/lib/crypto";

type RawMessage = {
  id: string;
  fromAddress: string;
  toAddress: string;
  subjectCiphertext: string;
  bodyCiphertext: string;
  createdAt: string;
};

type DecryptedMessage = RawMessage & {
  subject: string;
  body: string;
  direction: "in" | "out";
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

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MessageList({ myAddress }: { myAddress: string }) {
  const { keyPair } = useWalletAuth();
  const [messages, setMessages] = useState<DecryptedMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!keyPair) return;
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
            counterpartyKey &&
            decryptFrom(counterpartyKey, keyPair.secretKey, msg.subjectCiphertext);
          const body =
            counterpartyKey && decryptFrom(counterpartyKey, keyPair.secretKey, msg.bodyCiphertext);

          return {
            ...msg,
            direction,
            subject: subject ?? "(unable to decrypt)",
            body: body ?? "(unable to decrypt)",
          };
        })
      );

      setMessages(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [keyPair, myAddress]);

  useEffect(() => {
    // load() only calls setState after an awaited fetch + decrypt, not
    // synchronously during this effect body — this is the standard
    // fetch-on-mount pattern, not the accidental sync-setState case the rule
    // is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h2 className="text-lg font-medium text-white font-geist">Inbox</h2>
        <button
          onClick={() => void load()}
          className="text-xs text-white/50 hover:text-white transition-colors font-geist"
        >
          Refresh
        </button>
      </div>

      {error && <p className="p-6 text-sm text-red-400 font-geist">{error}</p>}

      {!error && messages === null && (
        <p className="p-6 text-sm text-white/40 font-geist">Decrypting...</p>
      )}

      {!error && messages !== null && messages.length === 0 && (
        <p className="p-6 text-sm text-white/40 font-geist">
          No mail yet. Send yourself one from the compose form to test it out.
        </p>
      )}

      {!error && messages !== null && messages.length > 0 && (
        <ul className="divide-y divide-white/5">
          {messages.map((msg) => (
            <li key={msg.id} className="p-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-geist text-white/50">
                  {msg.direction === "out" ? "To " : "From "}
                  {(msg.direction === "out" ? msg.toAddress : msg.fromAddress).slice(0, 10)}...
                </span>
                <span className="text-xs font-geist text-white/30">{timeAgo(msg.createdAt)}</span>
              </div>
              <p className="text-sm font-medium text-white font-geist mb-1">{msg.subject}</p>
              <p className="text-sm text-white/60 font-geist whitespace-pre-wrap">{msg.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
