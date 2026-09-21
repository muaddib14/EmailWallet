"use client";

import { useCallback, useEffect, useState } from "react";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { decryptFrom, encryptFor, publicKeyToBase64 } from "@/lib/crypto";

export type Draft = {
  id: string;
  toRaw: string;
  subject: string;
  body: string;
  threadId: string | null;
  updatedAt: string;
};

type RawDraft = {
  id: string;
  toRaw: string;
  subjectCiphertext: string;
  bodyCiphertext: string;
  threadId: string | null;
  updatedAt: string;
};

/**
 * Drafts are encrypted to the owner's own public key (self-box) rather than a
 * recipient's — while composing, the recipient may not be typed yet, or
 * might not resolve to a real wallet at all. NaCl's box() works fine
 * encrypting to yourself: the Diffie-Hellman shared secret between your own
 * public and secret key is just as valid as with anyone else's.
 */
export function useDrafts() {
  const { keyPair } = useWalletAuth();
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  const ownPublicKeyB64 = keyPair ? publicKeyToBase64(keyPair.publicKey) : null;

  const refresh = useCallback(async () => {
    if (!keyPair || !ownPublicKeyB64) return;
    const res = await fetch("/api/drafts");
    if (!res.ok) return;
    const { drafts: rows }: { drafts: RawDraft[] } = await res.json();

    setDrafts(
      rows.map((row) => ({
        id: row.id,
        toRaw: row.toRaw,
        subject: decryptFrom(ownPublicKeyB64, keyPair.secretKey, row.subjectCiphertext) ?? "",
        body: decryptFrom(ownPublicKeyB64, keyPair.secretKey, row.bodyCiphertext) ?? "",
        threadId: row.threadId,
        updatedAt: row.updatedAt,
      }))
    );
  }, [keyPair, ownPublicKeyB64]);

  useEffect(() => {
    // Same fetch-on-mount pattern as useInboxMessages — setState only runs
    // after the awaited fetch resolves, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const saveDraft = useCallback(
    async (
      id: string | undefined,
      toRaw: string,
      subject: string,
      body: string,
      threadId?: string | null
    ) => {
      if (!keyPair || !ownPublicKeyB64) return undefined;
      const subjectCiphertext = encryptFor(ownPublicKeyB64, keyPair.secretKey, subject);
      const bodyCiphertext = encryptFor(ownPublicKeyB64, keyPair.secretKey, body);

      const res = await fetch(id ? `/api/drafts/${id}` : "/api/drafts", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toRaw, subjectCiphertext, bodyCiphertext, threadId: threadId ?? null }),
      });
      if (!res.ok) return undefined;
      const data = await res.json();
      await refresh();
      return (data.id as string | undefined) ?? id;
    },
    [keyPair, ownPublicKeyB64, refresh]
  );

  const deleteDraftById = useCallback(
    async (id: string) => {
      await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  return { drafts, refresh, saveDraft, deleteDraft: deleteDraftById };
}
