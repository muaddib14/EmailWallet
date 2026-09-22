"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isAddress, parseUnits } from "viem";
import { useSignMessage } from "wagmi";
import { X, LoaderCircle } from "lucide-react";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { resolveRecipient } from "@/lib/resolveRecipient";
import { encryptFor, hashPlaintext } from "@/lib/crypto";
import { NATIVE_TETH, type TokenSpec } from "@/lib/tokens";
import { toast } from "@/components/Toast";
import { ContactAvatar, shortAddress } from "./ContactName";
import type { ComposeContact } from "./ComposeModal";

const MAX_UNITS = "1000";

type TokenChoice = "native" | "usdg" | "custom";

type CustomMeta =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ready"; symbol: string; decimals: number; address: string }
  | { status: "error"; hint: string };

/**
 * Asks any wallet for testnet value — inside an existing thread (threadId
 * set) or cold to a new address (threadId null → starts a new thread).
 * Tokens: native tETH, any ERC-20 via pasted contract (metadata read live
 * from the chain), and USDG listed for later — it only exists on mainnet,
 * so on testnet it stays honestly disabled. The request travels as a normal
 * encrypted message with a JSON envelope body, so the amount stays private.
 */
export default function RequestPaymentModal({
  initialTo,
  threadId,
  contacts,
  onClose,
  onSent,
}: {
  initialTo?: string;
  threadId?: string | null;
  contacts: ComposeContact[];
  onClose: () => void;
  onSent: () => void;
}) {
  const { keyPair } = useWalletAuth();
  const { signMessageAsync } = useSignMessage();
  const [to, setTo] = useState(initialTo ?? "");
  const [choice, setChoice] = useState<TokenChoice>("native");
  const [customAddress, setCustomAddress] = useState("");
  const [customMeta, setCustomMeta] = useState<CustomMeta>({ status: "idle" });
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toFocused, setToFocused] = useState(false);
  const toBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metaReq = useRef(0);

  const lockedTo = !!initialTo;

  const suggestions = useMemo(() => {
    const q = to.trim().toLowerCase();
    if (!q) return [];
    return contacts
      .filter(
        (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [to, contacts]);

  function pickSuggestion(c: ComposeContact) {
    if (toBlurTimer.current) clearTimeout(toBlurTimer.current);
    setTo(c.address);
    setToFocused(false);
  }

  function aliasToAddress(raw: string): string | null {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    return contacts.find((c) => c.name.toLowerCase() === q)?.address ?? null;
  }

  // Live ERC-20 metadata for a pasted contract. Validity is derived in
  // render (below); the effect only fetches, with all state updates inside
  // async callbacks.
  const customTrimmed = choice === "custom" ? customAddress.trim() : "";
  const customMalformed = customTrimmed !== "" && !isAddress(customTrimmed);
  useEffect(() => {
    if (choice !== "custom" || !isAddress(customTrimmed)) return;
    const timer = setTimeout(() => {
      const cur = ++metaReq.current;
      setCustomMeta({ status: "checking" });
      void fetch(`/api/tokens?address=${customTrimmed}`)
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (metaReq.current !== cur) return;
          if (!res.ok) {
            setCustomMeta({ status: "error", hint: body.error ?? "Couldn't read that token." });
            return;
          }
          setCustomMeta({
            status: "ready",
            symbol: body.symbol,
            decimals: body.decimals,
            address: body.address,
          });
        })
        .catch(() => {
          if (metaReq.current === cur)
            setCustomMeta({ status: "error", hint: "Couldn't reach the testnet." });
        });
    }, 450);
    return () => clearTimeout(timer);
  }, [choice, customTrimmed]);

  const spec: TokenSpec | null =
    choice === "native"
      ? NATIVE_TETH
      : choice === "custom" && customMeta.status === "ready"
        ? {
            kind: "erc20",
            address: customMeta.address as `0x${string}`,
            symbol: customMeta.symbol,
            decimals: customMeta.decimals,
          }
        : null;

  if (typeof document === "undefined") return null;

  function parseAmount(): bigint | null {
    if (!spec) return null;
    try {
      const value = parseUnits(amount.trim(), spec.decimals);
      if (value <= BigInt(0)) return null;
      if (value > parseUnits(MAX_UNITS, spec.decimals)) return null;
      return value;
    } catch {
      return null;
    }
  }

  const amountOk = amount.trim() === "" || parseAmount() !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseAmount();
    if (!value || !spec) {
      setError(`Enter an amount between 0 and ${MAX_UNITS} ${spec?.symbol ?? ""}.`);
      return;
    }
    if (!keyPair) {
      setError("Encryption key not ready yet — reconnect your wallet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const recipient = await resolveRecipient(aliasToAddress(to) ?? to);
      const subject = `Payment request: ${amount.trim()} ${spec.symbol}`;
      const body = JSON.stringify({
        kind: "payment-request",
        amountWei: value.toString(),
        token: spec.symbol,
        tokenAddress: spec.kind === "erc20" ? spec.address : null,
        tokenDecimals: spec.decimals,
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
          threadId: threadId ?? null,
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
              Robinhood Chain Testnet · no real money
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

        {!lockedTo && (
          <>
            <label
              htmlFor="reqTo"
              className="mt-5 block text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400"
            >
              To
            </label>
            <div className="relative">
              <input
                id="reqTo"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onFocus={() => setToFocused(true)}
                onBlur={() => {
                  toBlurTimer.current = setTimeout(() => setToFocused(false), 120);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setToFocused(false);
                  if (e.key === "Enter" && suggestions.length > 0 && toFocused) {
                    e.preventDefault();
                    pickSuggestion(suggestions[0]);
                  }
                }}
                placeholder="Alias or 0x…"
                required
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-geist text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none transition-colors"
              />
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
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
        {lockedTo && (
          <p className="mt-4 text-[13px] text-neutral-500 font-geist">
            To <span className="font-mono">{shortAddress(to)}</span>
          </p>
        )}

        <span className="mt-4 block text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Token
        </span>
        <div className="mt-1.5 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Token">
          <button
            type="button"
            onClick={() => setChoice("native")}
            aria-pressed={choice === "native"}
            className={`rounded-xl border px-3 py-2.5 text-sm font-geist font-medium transition-colors ${
              choice === "native"
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
            }`}
          >
            tETH
          </button>
          <button
            type="button"
            disabled
            title="USDG only exists on mainnet — unavailable on testnet"
            aria-pressed={false}
            className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5 text-sm font-geist font-medium text-neutral-300 cursor-not-allowed"
          >
            USDG
          </button>
          <button
            type="button"
            onClick={() => setChoice("custom")}
            aria-pressed={choice === "custom"}
            className={`rounded-xl border px-3 py-2.5 text-sm font-geist font-medium transition-colors ${
              choice === "custom"
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
            }`}
          >
            Custom
          </button>
        </div>

        {choice === "custom" && (
          <>
            <input
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder="Token contract 0x…"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-mono text-neutral-900 placeholder:text-neutral-400 placeholder:font-geist focus:border-neutral-900 outline-none transition-colors"
            />
            {customMalformed && (
              <p className="mt-1.5 text-xs text-red-600 font-geist">Not a valid contract address.</p>
            )}
            {!customMalformed && customMeta.status === "checking" && (
              <p className="mt-1.5 text-xs text-neutral-400 font-geist">Reading token…</p>
            )}
            {!customMalformed && customMeta.status === "ready" && (
              <p className="mt-1.5 text-xs text-green-700 font-geist font-medium">
                {customMeta.symbol} · {customMeta.decimals} decimals
              </p>
            )}
            {!customMalformed && customMeta.status === "error" && (
              <p className="mt-1.5 text-xs text-red-600 font-geist">{customMeta.hint}</p>
            )}
          </>
        )}

        <label
          htmlFor="reqAmount"
          className="mt-4 block text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400"
        >
          Amount ({spec?.symbol ?? "…"})
        </label>
        <input
          id="reqAmount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.01"
          inputMode="decimal"
          autoComplete="off"
          disabled={!spec}
          className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-lg font-geist font-medium text-neutral-900 placeholder:text-neutral-300 outline-none transition-colors disabled:opacity-50 ${
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
          disabled={busy || !amountOk || amount.trim() === "" || to.trim() === "" || !spec}
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
