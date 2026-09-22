"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Maximize2, Minimize2, Paperclip, X, Trash2, Check } from "lucide-react";
import { useSignMessage } from "wagmi";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { resolveRecipient } from "@/lib/resolveRecipient";
import { encryptFor, hashPlaintext } from "@/lib/crypto";
import { encryptAttachment, u8ToArrayBuffer } from "@/lib/attachments";
import { toast } from "@/components/Toast";
import type { Contact } from "@/lib/displayName";
import { ContactAvatar } from "@/components/inbox/ContactName";

type Status = "idle" | "sending" | "error";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ComposeContact = Contact & { recent?: boolean };

function shortAddress(address: string) {
  return address.startsWith("0x") ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

export default function ComposeModal({
  myAddress,
  draftId,
  initialTo,
  initialSubject,
  initialBody,
  threadId,
  contacts,
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
  /** Thread this reply belongs to (undefined for brand-new mail). */
  threadId?: string | null;
  /** Saved aliases + recent counterparties for To autocomplete. */
  contacts: ComposeContact[];
  onClose: () => void;
  onSent: () => void;
  onSaveDraft: (
    id: string | undefined,
    to: string,
    subject: string,
    body: string,
    threadId?: string | null
  ) => Promise<string | undefined>;
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
  const [toFocused, setToFocused] = useState(false);
  const toBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [attachOn, setAttachOn] = useState(true);

  type ToState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "valid"; resolved: string; viaAlias: boolean }
    | { status: "invalid"; hint: string };
  const [toState, setToState] = useState<ToState>({ status: "idle" });
  const toReq = useRef(0);

  const hasContent = to.trim() || subject.trim() || body.trim() || files.length > 0;

  // Hide the attach button when the server has no object storage configured.
  // Promise callbacks only — no synchronous setState for the lint rule.
  useEffect(() => {
    fetch("/api/attachments")
      .then((res) => res.json())
      .then((data) => {
        if (data.configured === false) setAttachOn(false);
      })
      .catch(() => {});
  }, []);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const incoming = [...list];
    const tooBig = incoming.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length > 0) {
      toast(`"${tooBig[0].name}" is over 5MB — skipped`, "error");
    }
    const ok = incoming.filter((f) => f.size > 0 && f.size <= MAX_FILE_BYTES);
    setFiles((prev) => {
      const next = [...prev, ...ok].slice(0, MAX_FILES);
      if (prev.length + ok.length > MAX_FILES) toast(`Max ${MAX_FILES} files per message`, "error");
      return next;
    });
  }

  /** A typed alias (e.g. "Mom") resolves locally to its address — instant, no network. */
  function aliasToAddress(raw: string): string | null {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    return contacts.find((c) => c.name.toLowerCase() === q)?.address ?? null;
  }

  // Live recipient check, debounced. All state updates happen inside async
  // callbacks (never synchronously in the effect body).
  useEffect(() => {
    const raw = to.trim();
    if (!raw) return;
    const normalized = aliasToAddress(raw) ?? raw;
    const timer = setTimeout(() => {
      const cur = ++toReq.current;
      setToState({ status: "checking" });
      void resolveRecipient(normalized).then(
        (r) => {
          if (toReq.current === cur)
            setToState({ status: "valid", resolved: r.address, viaAlias: normalized !== raw });
        },
        (err) => {
          if (toReq.current === cur)
            setToState({
              status: "invalid",
              hint: err instanceof Error ? err.message : "Couldn't resolve that recipient.",
            });
        }
      );
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  const suggestions = useMemo(() => {
    const q = to.trim().toLowerCase();
    if (!q) return [];
    return contacts
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [to, contacts]);

  function pickSuggestion(c: ComposeContact) {
    if (toBlurTimer.current) clearTimeout(toBlurTimer.current);
    setTo(c.address);
    setToFocused(false);
  }

  const shownToState: ToState = to.trim() ? toState : { status: "idle" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyPair) {
      setError("Encryption key not ready yet — reconnect your wallet.");
      return;
    }

    setStatus("sending");
    setError(null);
    try {
      const recipient = await resolveRecipient(aliasToAddress(to) ?? to);
      const finalSubject = subject.trim() || "(no subject)";

      const subjectCiphertext = encryptFor(recipient.encryptionPublicKey, keyPair.secretKey, finalSubject);
      const bodyCiphertext = encryptFor(recipient.encryptionPublicKey, keyPair.secretKey, body);
      const messageHash = hashPlaintext(finalSubject, body);
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
          threadId: threadId ?? null,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? "Server rejected the message.");
      }
      const { id: sentId } = (await res.json().catch(() => ({}))) as { id?: string };

      // Attachments upload after the message exists (metadata references it).
      // A failed upload never blocks or unsends the mail — it toasts instead.
      if (sentId && files.length > 0) {
        let failed = 0;
        for (const f of files) {
          try {
            const bytes = new Uint8Array(await f.arrayBuffer());
            const enc = encryptAttachment(bytes, f.name, recipient.encryptionPublicKey, keyPair.secretKey);
            const form = new FormData();
            form.set("messageId", sentId);
            // Exact-copy buffer: narrowing Uint8Array<ArrayBufferLike>
            // isn't assignable to BlobPart under this tsconfig.
            form.set(
              "file",
              new Blob([u8ToArrayBuffer(enc.cipherBytes)], { type: "application/octet-stream" })
            );
            form.set("filenameCt", enc.filenameCt);
            form.set("filenameNonce", enc.filenameNonce);
            form.set("wrappedKey", enc.wrappedKey);
            form.set("wrapNonce", enc.wrapNonce);
            form.set("mime", f.type || "application/octet-stream");
            form.set("size", String(f.size));
            const up = await fetch("/api/attachments", { method: "POST", body: form });
            if (!up.ok) failed++;
          } catch (uploadErr) {
            console.error("[compose] attachment upload failed:", uploadErr);
            failed++;
          }
        }
        if (failed > 0) {
          toast(
            failed === files.length
              ? "Message sent, but attachments failed to upload"
              : `Message sent, ${failed} attachment(s) failed to upload`,
            "error"
          );
        }
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
      const savedId = await onSaveDraft(currentDraftId, to, subject, body, threadId ?? null);
      if (savedId) setCurrentDraftId(savedId);
    }
    onClose();
  }

  async function handleDiscard() {
    if (currentDraftId) await onDeleteDraft(currentDraftId);
    onClose();
  }

  const panelSize = expanded
    ? "inset-4 sm:inset-12"
    : "bottom-0 right-6 max-sm:left-4 max-sm:right-4 w-full max-w-[420px] max-sm:max-w-none h-[480px] max-h-[calc(100vh-2rem)]";

  return (
    <form
      onSubmit={handleSubmit}
      className={`fixed z-50 flex flex-col rounded-t-xl border border-neutral-200 border-b-0 bg-white shadow-2xl overflow-hidden transition-all ${
        minimized
          ? "bottom-0 right-6 max-sm:left-4 max-sm:right-4 w-full max-w-[420px] max-sm:max-w-none h-12"
          : panelSize
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
            <div className="relative flex items-center border-b border-neutral-200 py-2.5">
              <label htmlFor="composeTo" className="text-sm text-neutral-400 font-geist w-16 shrink-0 whitespace-nowrap">
                To
              </label>
              <input
                id="composeTo"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onFocus={() => setToFocused(true)}
                onBlur={() => {
                  // Let a suggestion mousedown land before closing.
                  toBlurTimer.current = setTimeout(() => setToFocused(false), 120);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setToFocused(false);
                  if (e.key === "Enter" && suggestions.length > 0 && toFocused) {
                    // Enter with an open list picks the top match.
                    e.preventDefault();
                    pickSuggestion(suggestions[0]);
                  }
                }}
                placeholder="Name, alias, or 0x…"
                required
                autoComplete="off"
                className="flex-1 min-w-0 text-sm font-geist placeholder:text-neutral-400 text-neutral-900 outline-none"
              />
              <span className="shrink-0 ml-2" aria-live="polite">
                {shownToState.status === "checking" && (
                  <span className="block h-4 w-4 rounded-full border-2 border-neutral-200 border-t-neutral-500 animate-spin" />
                )}
                {shownToState.status === "valid" && (
                  <span title={shortAddress(shownToState.resolved)}>
                    <Check className="w-4 h-4 text-green-600" />
                  </span>
                )}
                {shownToState.status === "invalid" && (
                  <span title={shownToState.hint}>
                    <X className="w-4 h-4 text-red-500" />
                  </span>
                )}
              </span>
              {toFocused && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-neutral-200 bg-white shadow-xl overflow-hidden z-10">
                  {suggestions.map((c) => (
                    <li key={c.address}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickSuggestion(c);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 transition-colors"
                      >
                        <ContactAvatar address={c.address} size="sm" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-geist font-medium text-neutral-900 truncate">
                            {c.name || shortAddress(c.address)}
                          </span>
                          <span className="block text-[11px] font-mono text-neutral-400 truncate">
                            {c.address}
                          </span>
                        </span>
                        {c.recent && !c.name && (
                          <span className="text-[10px] font-geist text-neutral-400 shrink-0">recent</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {shownToState.status === "invalid" && (
              <p className="py-1.5 text-xs text-red-600 font-geist">{shownToState.hint}</p>
            )}
            {shownToState.status === "valid" && shownToState.viaAlias && (
              <p className="py-1.5 text-xs text-neutral-400 font-geist">
                → <span className="font-mono">{shortAddress(shownToState.resolved)}</span>
              </p>
            )}
            <div className="flex items-center border-b border-neutral-200 py-2.5">
              <label htmlFor="composeSubject" className="text-sm text-neutral-400 font-geist w-16 shrink-0 whitespace-nowrap">
                Subject
              </label>
              <input
                id="composeSubject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (optional)"
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

          {files.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${f.size}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 pl-2.5 pr-1 py-1 text-[11px] font-geist text-neutral-700 max-w-full"
                >
                  <Paperclip className="w-3 h-3 text-neutral-400 shrink-0" />
                  <span className="truncate max-w-40">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    title="Remove file"
                    className="p-0.5 rounded text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 shrink-0">
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex items-center h-9 px-6 rounded-full bg-green-600 text-white text-sm font-medium font-geist hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-wait"
            >
              {status === "sending" ? "Sending..." : "Send"}
            </button>
            <span className="flex items-center gap-1">
              {attachOn && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      pickFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach files (up to 5, 5MB each, encrypted)"
                    className="p-2 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => void handleDiscard()}
                title="Discard draft"
                className="p-2 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </span>
          </div>

          <p className="px-4 pb-2 text-[10px] text-neutral-300 font-geist shrink-0">
            Encrypted in your browser as {myAddress.slice(0, 6)}...{myAddress.slice(-4)}
          </p>
        </>
      )}
    </form>
  );
}
