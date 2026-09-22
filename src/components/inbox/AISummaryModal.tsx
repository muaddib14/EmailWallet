"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ListChecks, Sparkles, X } from "lucide-react";
import type { DecryptedMessage } from "@/lib/useInboxMessages";
import { summarizeInboxWithAI, AIError, type InboxAIResult } from "@/lib/ai";

type Props = {
  open: boolean;
  onClose: () => void;
  messages: DecryptedMessage[];
  onSelectMessage: (id: string) => void;
  /** "inbox" summarizes unread mail across folders; "thread" summarizes one conversation. */
  mode?: "inbox" | "thread";
};

export default function AISummaryModal({ open, onClose, messages, onSelectMessage, mode = "inbox" }: Props) {
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [result, setResult] = useState<InboxAIResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const title = mode === "thread" ? "Thread summary" : "Inbox summary";
  const loadingLabel = mode === "thread" ? "Reading this thread…" : "Reading your inbox…";
  const emptyLabel =
    mode === "thread" ? "Nothing to summarize in this thread yet." : "Inbox is empty — nothing to summarize.";

  // Run once per open — the user re-triggers via the Refresh button below,
  // not by re-mounting.
  useEffect(() => {
    if (!open) return;
    void runSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function runSummary() {
    if (messages.length === 0) {
      setResult({ summary: emptyLabel, urgent: [], actionItems: [], modelUsed: "" });
      setState("done");
      return;
    }
    setState("loading");
    setErrorMsg("");
    try {
      const items = messages.slice(0, 20).map((m) => ({
        id: m.id,
        from: m.counterparty,
        subject: m.subject,
        body: m.body,
      }));
      const r = await summarizeInboxWithAI(items);
      setResult(r);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof AIError ? err.message : "Something went wrong talking to the AI provider.");
      setState("error");
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  function messageLabel(id: string) {
    const m = messages.find((x) => x.id === id);
    return m ? m.subject || "(no subject)" : id;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm [animation:modal-overlay-in_0.18s_ease-out]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Inbox summary"
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-neutral-200/80 bg-white text-neutral-900 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)] [animation:modal-dialog-in_0.22s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 border border-violet-200">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </span>
            <div>
              <h2 className="text-base font-geist font-semibold text-neutral-900">{title}</h2>
              <p className="text-[11px] text-neutral-400 font-geist">
                AI-generated — decrypted messages pass through our server just for this request, never stored.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -m-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {state === "loading" && (
            <div className="text-center py-10">
              <p className="text-sm text-neutral-400 font-geist animate-pulse">{loadingLabel}</p>
            </div>
          )}

          {state === "error" && (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 font-geist mb-3">{errorMsg}</p>
              <button
                onClick={() => void runSummary()}
                className="text-xs font-geist font-medium text-neutral-900 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {state === "done" && result && (
            <div className="space-y-5">
              {messages.length === 0 ? (
                <p className="text-sm text-neutral-500 font-geist">{result.summary}</p>
              ) : (
                <>
                  <p className="text-sm text-neutral-700 font-geist leading-relaxed">{result.summary}</p>

                  {result.urgent.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <h3 className="text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400">
                          Needs attention
                        </h3>
                      </div>
                      <ul className="space-y-1.5">
                        {result.urgent.map((u) => (
                          <li key={u.id}>
                            <button
                              onClick={() => {
                                onSelectMessage(u.id);
                                onClose();
                              }}
                              className="w-full text-left rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 hover:bg-amber-100 transition-colors"
                            >
                              <span className="block text-xs font-medium font-geist text-neutral-900 truncate">
                                {messageLabel(u.id)}
                              </span>
                              <span className="block text-[11px] font-geist text-amber-700 mt-0.5">{u.reason}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.actionItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ListChecks className="w-3.5 h-3.5 text-neutral-400" />
                        <h3 className="text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400">
                          Action items
                        </h3>
                      </div>
                      <ul className="space-y-1.5">
                        {result.actionItems.map((a, i) => (
                          <li key={`${a.id}-${i}`}>
                            <button
                              onClick={() => {
                                onSelectMessage(a.id);
                                onClose();
                              }}
                              className="w-full text-left rounded-xl border border-neutral-200 px-3.5 py-2.5 hover:bg-neutral-50 transition-colors"
                            >
                              <span className="block text-xs font-medium font-geist text-neutral-900 truncate">
                                {messageLabel(a.id)}
                              </span>
                              <span className="block text-[11px] font-geist text-neutral-500 mt-0.5">{a.item}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.urgent.length === 0 && result.actionItems.length === 0 && (
                    <p className="text-xs text-neutral-400 font-geist">Nothing urgent — you&apos;re caught up.</p>
                  )}
                </>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => void runSummary()}
                  className="text-[11px] font-geist font-medium text-neutral-400 hover:text-neutral-900 underline underline-offset-2"
                >
                  Refresh summary
                </button>
                {result.modelUsed && (
                  <span className="text-[10px] text-neutral-300 font-mono">{result.modelUsed}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
