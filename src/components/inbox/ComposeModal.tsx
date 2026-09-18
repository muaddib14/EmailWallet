"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useSignMessage } from "wagmi";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { resolveRecipient } from "@/lib/resolveRecipient";
import { encryptFor, hashPlaintext } from "@/lib/crypto";

type Status = "idle" | "sending" | "error";

export default function ComposeModal({
  myAddress,
  initialTo,
  initialSubject,
  onClose,
  onSent,
}: {
  myAddress: string;
  initialTo?: string;
  initialSubject?: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { keyPair } = useWalletAuth();
  const { signMessageAsync } = useSignMessage();

  const [to, setTo] = useState(initialTo ?? "");
  const [subject, setSubject] = useState(initialSubject ?? "");
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

      onSent();
      onClose();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="text-sm font-medium text-neutral-900 font-geist">New message</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To: 0x... or maya.mail"
            required
            className="w-full bg-neutral-50 border border-neutral-200 focus:border-green-600 focus:bg-white rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-neutral-400 text-neutral-900 transition-colors"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            required
            className="w-full bg-neutral-50 border border-neutral-200 focus:border-green-600 focus:bg-white rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-neutral-400 text-neutral-900 transition-colors"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={8}
            required
            className="w-full bg-neutral-50 border border-neutral-200 focus:border-green-600 focus:bg-white rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-neutral-400 text-neutral-900 resize-none transition-colors"
          />
          {error && <p className="text-xs text-red-600 font-geist">{error}</p>}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-200">
          <p className="text-[11px] text-neutral-400 font-geist">
            Encrypted in your browser as {myAddress.slice(0, 6)}...{myAddress.slice(-4)}
          </p>
          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex items-center justify-center h-9 px-5 rounded-lg bg-neutral-900 text-white text-sm font-medium font-geist hover:bg-neutral-800 transition disabled:opacity-60 disabled:cursor-wait"
          >
            {status === "sending" ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
