"use client";

import { useState } from "react";
import { useSignMessage } from "wagmi";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { resolveRecipient } from "@/lib/resolveRecipient";
import { encryptFor, hashPlaintext } from "@/lib/crypto";

type Status = "idle" | "sending" | "sent" | "error";

export default function ComposeForm({ myAddress }: { myAddress: string }) {
  const { keyPair } = useWalletAuth();
  const { signMessageAsync } = useSignMessage();

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyPair) {
      setError("Encryption key not ready yet — reconnect your wallet.");
      return;
    }

    setStatus("sending");
    setError(null);
    try {
      const recipient = await resolveRecipient(to);

      const subjectCiphertext = encryptFor(recipient.encryptionPublicKey, keyPair.secretKey, subject);
      const bodyCiphertext = encryptFor(recipient.encryptionPublicKey, keyPair.secretKey, body);
      const messageHash = hashPlaintext(subject, body);

      const senderSignature = await signMessageAsync({ message: { raw: messageHash } });

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAddress: recipient.address,
          subjectCiphertext,
          bodyCiphertext,
          messageHash,
          senderSignature,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? "Server rejected the message.");
      }

      setStatus("sent");
      setTo("");
      setSubject("");
      setBody("");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 h-fit sticky top-6"
    >
      <h2 className="text-lg font-medium text-white font-geist mb-4">Compose</h2>

      <div className="space-y-3">
        <div>
          <label htmlFor="composeTo" className="text-xs text-white/40 font-geist mb-1.5 block">
            To (address or .mail name)
          </label>
          <input
            id="composeTo"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x... or maya.mail"
            required
            className="w-full bg-white/5 border border-white/10 focus:border-green-500 rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-white/30 text-white"
          />
        </div>
        <div>
          <label htmlFor="composeSubject" className="text-xs text-white/40 font-geist mb-1.5 block">
            Subject
          </label>
          <input
            id="composeSubject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 focus:border-green-500 rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-white/30 text-white"
          />
        </div>
        <div>
          <label htmlFor="composeBody" className="text-xs text-white/40 font-geist mb-1.5 block">
            Message
          </label>
          <textarea
            id="composeBody"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            required
            className="w-full bg-white/5 border border-white/10 focus:border-green-500 rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-white/30 resize-none text-white"
          />
        </div>

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full inline-flex items-center justify-center h-10 rounded-lg bg-white text-black text-sm font-medium font-geist hover:bg-neutral-200 transition disabled:opacity-60 disabled:cursor-wait"
        >
          {status === "sending" ? "Encrypting & Sending..." : status === "sent" ? "Sent ✓" : "Send Encrypted Mail"}
        </button>

        {error && <p className="text-xs text-red-400 font-geist">{error}</p>}
        <p className="text-[11px] text-white/30 font-geist">
          Signed in as {myAddress.slice(0, 6)}...{myAddress.slice(-4)}. Subject and body are
          encrypted in your browser before they ever leave it.
        </p>
      </div>
    </form>
  );
}
