"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { parseEther } from "viem";
import { useSignMessage } from "wagmi";
import { X, LoaderCircle } from "lucide-react";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { resolveRecipient } from "@/lib/resolveRecipient";
import { encryptFor, hashPlaintext } from "@/lib/crypto";
import { toast } from "@/components/Toast";
import { shortAddress } from "./ContactName";

const TOKEN = "tETH";
const MAX_TETH = "1000";

/**
 * Asks the other side of a thread for testnet ETH. The request travels as a
 * normal encrypted message with a JSON envelope body, so the amount stays
 * private — only a payment proof (tx hash, public on-chain anyway) is ever
 * stored in the clear.
 */
export default function RequestPaymentModal({
  to,
  threadId,
  onClose,
  onSent,
}: {
  to: string;
  threadId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { keyPair } = useWalletAuth();
  const { signMessageAsync } = useSignMessage();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (typeof document === "undefined") return null;

  function parseAmount(): bigint | null {
    try {
      const value = parseEther(amount.trim());
      if (value <= BigInt(0)) return null;
      if (value > parseEther(MAX_TETH)) return null;
      return value;
    } catch {
      return null;
    }
  }

  const amountOk = amount.trim() === "" || parseAmount() !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseAmount();
    if (!value) {
      setError(`Enter an amount between 0 and ${MAX_TETH} ${TOKEN}.`);
      return;
    }
    if (!keyPair) {
      setError("Encryption key not ready yet — reconnect your wallet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const recipient = await resolveRecipient(to);
      const subject = `Payment request: ${amount.trim()} ${TOKEN}`;
      const body = JSON.stringify({
        kind: "payment-request",
        amountWei: value.toString(),
        token: TOKEN,
        note: note.trim(),
      });
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
          threadId,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? "Server rejected the request.");
      }
      toast("Payment request sent");
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm [animation:modal-overlay-in_0.18s_ease-out]"
      />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="relative w-full max-w-sm rounded-3xl border border-neutral-200/80 bg-white p-6 text-neutral-900 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)] [animation:modal-dialog-in_0.22s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-geist font-semibold tracking-tight">Request payment</h2>
            <p className="mt-1 text-[13px] text-neutral-500 font-geist">
              To <span className="font-mono">{shortAddress(to)}</span> · Robinhood Chain Testnet,
              no real money
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 -m-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label
          htmlFor="reqAmount"
          className="mt-5 block text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400"
        >
          Amount ({TOKEN})
        </label>
        <input
          id="reqAmount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.01"
          inputMode="decimal"
          autoComplete="off"
          className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-lg font-geist font-medium text-neutral-900 placeholder:text-neutral-300 outline-none transition-colors ${
            amountOk ? "border-neutral-200 focus:border-neutral-900" : "border-red-300 focus:border-red-500"
          }`}
        />
        {!amountOk && (
          <p className="mt-1.5 text-xs text-red-600 font-geist">Enter a valid amount.</p>
        )}

        <label
          htmlFor="reqNote"
          className="mt-4 block text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400"
        >
          Note (optional)
        </label>
        <input
          id="reqNote"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 140))}
          placeholder="What is this for?"
          maxLength={140}
          autoComplete="off"
          className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-geist text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none transition-colors"
        />

        {error && <p className="mt-3 text-xs text-red-600 font-geist">{error}</p>}

        <button
          type="submit"
          disabled={busy || !amountOk || amount.trim() === ""}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium font-geist text-white hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {busy ? "Sending…" : "Send request"}
        </button>
        <p className="mt-3 text-center text-[11px] text-neutral-400 font-geist">
          Encrypted like any other message — only you two see the amount.
        </p>
      </form>
    </div>,
    document.body
  );
}
