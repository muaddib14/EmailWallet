"use client";

import { useState } from "react";
import { Minus, Maximize2, Minimize2, X, Trash2 } from "lucide-react";
import { useSignMessage } from "wagmi";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { resolveRecipient } from "@/lib/resolveRecipient";
import { encryptFor, hashPlaintext } from "@/lib/crypto";

type Status = "idle" | "sending" | "error";

export default function ComposeModal({
  myAddress,
  draftId,
  initialTo,
  initialSubject,
  initialBody,
  onClose,
  onSent,
  onSaveDraft,
  onDeleteDraft,
}: {
  myAddress: string;
  /** Present when this compose window was opened from an existing draft. */
  draftId?: string;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onClose: () => void;
  onSent: () => void;
  onSaveDraft: (id: string | undefined, to: string, subject: string, body: string) => Promise<string | undefined>;
  onDeleteDraft: (id: string) => Promise<void>;
}) {
  const { keyPair } = useWalletAuth();
  const { signMessageAsync } = useSignMessage();

  const [to, setTo] = useState(initialTo ?? "");
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [body, setBody] = useState(initialBody ?? "");
  const [currentDraftId, setCurrentDraftId] = useState(draftId);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);

  const hasContent = to.trim() || subject.trim() || body.trim();

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

      if (currentDraftId) await onDeleteDraft(currentDraftId);
      setSent(true);
      onSent();
      onClose();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send.");
    }
  }

  async function handleClose() {
    if (!sent && hasContent) {
      const savedId = await onSaveDraft(currentDraftId, to, subject, body);
      if (savedId) setCurrentDraftId(savedId);
    }
    onClose();
  }

  async function handleDiscard() {
    if (currentDraftId) await onDeleteDraft(currentDraftId);
    onClose();
  }

  const panelSize = expanded
    ? "inset-6 sm:inset-12"
    : "bottom-0 right-6 w-full max-w-[420px] h-[480px] max-h-[calc(100vh-2rem)]";

  return (
    <form
      onSubmit={handleSubmit}
      className={`fixed z-50 flex flex-col rounded-t-xl border border-neutral-200 border-b-0 bg-white shadow-2xl overflow-hidden transition-all ${
        minimized ? "bottom-0 right-6 w-full max-w-[420px] h-12" : panelSize
      }`}
    >
      {/* Header — Gmail-style light title bar */}
      <div
        onClick={() => minimized && setMinimized(false)}
        className={`flex items-center justify-between px-4 py-2.5 bg-neutral-100 border-b border-neutral-200 shrink-0 ${
          minimized ? "cursor-pointer" : ""
        }`}
      >
        <h2 className="text-sm font-medium text-neutral-800 font-geist truncate pr-2">
          {subject || "New message"}
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMinimized((v) => !v);
            }}
            className="p-1.5 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
            title={minimized ? "Restore" : "Minimize"}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
              setMinimized(false);
            }}
            className="p-1.5 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleClose();
            }}
            className="p-1.5 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
            title="Save & close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="px-4 shrink-0">
            <div className="flex items-center border-b border-neutral-200 py-2.5">
              <label htmlFor="composeTo" className="text-sm text-neutral-400 font-geist w-16 shrink-0 whitespace-nowrap">
                To
              </label>
              <input
                id="composeTo"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="0x... or maya.mail"
                required
                className="flex-1 min-w-0 text-sm font-geist placeholder:text-neutral-400 text-neutral-900 outline-none"
              />
            </div>
            <div className="flex items-center border-b border-neutral-200 py-2.5">
              <label htmlFor="composeSubject" className="text-sm text-neutral-400 font-geist w-16 shrink-0 whitespace-nowrap">
                Subject
              </label>
              <input
                id="composeSubject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="flex-1 min-w-0 text-sm font-geist placeholder:text-neutral-400 text-neutral-900 outline-none"
              />
            </div>
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            required
            className="flex-1 w-full px-4 py-3 text-sm font-geist placeholder:text-neutral-400 text-neutral-900 outline-none resize-none"
          />

          {error && <p className="px-4 pb-2 text-xs text-red-600 font-geist shrink-0">{error}</p>}

          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 shrink-0">
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex items-center h-9 px-6 rounded-full bg-green-600 text-white text-sm font-medium font-geist hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-wait"
            >
              {status === "sending" ? "Sending..." : "Send"}
            </button>
            <button
              type="button"
              onClick={() => void handleDiscard()}
              title="Discard draft"
              className="p-2 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <p className="px-4 pb-2 text-[10px] text-neutral-300 font-geist shrink-0">
            Encrypted in your browser as {myAddress.slice(0, 6)}...{myAddress.slice(-4)}
          </p>
        </>
      )}
    </form>
  );
}
