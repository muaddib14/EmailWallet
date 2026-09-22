"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, KeyRound, LogOut, UserRound, X } from "lucide-react";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { publicKeyToBase64 } from "@/lib/crypto";
import { useDisplayName } from "@/lib/displayName";

type Props = {
  open: boolean;
  onClose: () => void;
  myAddress: string;
};

type KeyStatus = "checking" | "published" | "missing" | "mismatch" | "error";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function useCopyFlash(): [string | null, (text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  return [copied, (text: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => setCopied(text),
      () => setCopied(null)
    );
  }];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, copy] = useCopyFlash();
  return (
    <button
      onClick={() => copy(text)}
      title={label}
      className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors shrink-0"
    >
      {copied === text ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function Group({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: typeof UserRound;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 py-5 border-b border-neutral-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100">
          <Icon className="h-3.5 w-3.5 text-neutral-500" />
        </span>
        <h3 className="text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400">
          {label}
        </h3>
      </div>
      {hint && (
        <p className="mt-2 text-xs text-neutral-500 font-geist leading-relaxed">{hint}</p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function SettingsModal({ open, onClose, myAddress }: Props) {
  const { keyPair, signOut } = useWalletAuth();
  const [name, saveName] = useDisplayName(myAddress);
  // Draft follows the saved name (or a blank slate while closed) via the
  // render-time adjustment pattern — reopening never shows stale input.
  const [draft, setDraft] = useState(name);
  const [seed, setSeed] = useState("");
  const seedKey = open ? `open:${name}` : "closed";
  if (seed !== seedKey) {
    setSeed(seedKey);
    setDraft(name);
  }
  const [savedFlash, setSavedFlash] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("checking");
  const [publishing, setPublishing] = useState(false);

  const myPublicKey = keyPair ? publicKeyToBase64(keyPair.publicKey) : null;
  const title = name || shortAddress(myAddress);
  const avatarLetter = name ? name.slice(0, 1).toUpperCase() : myAddress.slice(2, 4).toUpperCase();

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Saved flash timeout.
  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(false), 1500);
    return () => clearTimeout(timer);
  }, [savedFlash]);


  async function checkPublished() {
    if (!myPublicKey) {
      setKeyStatus("error");
      return;
    }
    setKeyStatus("checking");
    try {
      const res = await fetch(`/api/wallets/${myAddress}`);
      if (!res.ok) {
        setKeyStatus("missing");
        return;
      }
      const data = await res.json();
      setKeyStatus(data.encryptionPublicKey === myPublicKey ? "published" : "mismatch");
    } catch {
      setKeyStatus("error");
    }
  }

  // Check against the server every time the modal opens — fetching from an
  // external system on open, the case this lint rule carves out.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void checkPublished();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, myPublicKey]);

  async function publishNow() {
    if (!myPublicKey) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/wallets/publish-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptionPublicKey: myPublicKey }),
      });
      if (res.ok) setKeyStatus("published");
    } finally {
      setPublishing(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

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
        aria-label="Settings"
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border border-neutral-200/80 bg-white text-neutral-900 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)] [animation:modal-dialog-in_0.22s_cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Identity header — the anchor: who am I in this app. */}
        <div className="px-6 pt-6 pb-5 bg-gradient-to-b from-neutral-50 to-white rounded-t-3xl border-b border-neutral-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-base font-geist font-semibold text-white shrink-0">
                {avatarLetter}
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-geist font-semibold tracking-tight text-neutral-900 truncate">
                  {title}
                </h2>
                <div className="mt-1 flex items-center gap-2 min-w-0">
                  <code className="truncate text-xs font-mono text-neutral-500">{myAddress}</code>
                  <CopyButton text={myAddress} label="Copy address" />
                </div>
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
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-[11px] font-geist font-medium text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Connected
            </span>
            <span className="text-[11px] font-geist text-neutral-400">Robinhood Chain</span>
          </div>
        </div>

        <div className="pb-2">
          <Group
            icon={UserRound}
            label="Display name"
            hint="A pet name only you see — in the topbar instead of 0x…. Kept in this browser, never sent anywhere."
          >
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 32))}
                placeholder="e.g. Trading, Mom, Treasury…"
                maxLength={32}
                className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-geist text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 transition-colors"
              />
              <button
                onClick={() => {
                  saveName(draft);
                  setSavedFlash(true);
                }}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium font-geist text-white hover:bg-neutral-700 transition-colors"
              >
                {savedFlash && <Check className="w-4 h-4" />}
                {savedFlash ? "Saved" : "Save"}
              </button>
            </div>
          </Group>

          <Group
            icon={KeyRound}
            label="Encryption"
            hint="Others encrypt to your public key so only you can read your mail. Your secret key never leaves this browser — lose the device and you re-derive it by signing in again."
          >
            {myPublicKey ? (
              <>
                <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 pl-4 pr-1 py-1">
                  <code className="flex-1 min-w-0 truncate text-xs font-mono text-neutral-600">
                    {myPublicKey}
                  </code>
                  <CopyButton text={myPublicKey} label="Copy public key" />
                </div>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  {keyStatus === "published" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-[11px] font-geist font-medium text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Published — people can reach you
                    </span>
                  )}
                  {keyStatus === "checking" && (
                    <span className="text-[11px] font-geist text-neutral-400">Checking…</span>
                  )}
                  {(keyStatus === "missing" || keyStatus === "mismatch") && (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-geist font-medium text-amber-700">
                        {keyStatus === "missing" ? "Not published yet" : "Out of sync"}
                      </span>
                      <button
                        onClick={() => void publishNow()}
                        disabled={publishing}
                        className="text-[11px] font-geist font-medium text-neutral-900 underline underline-offset-2 disabled:opacity-50"
                      >
                        {publishing ? "Publishing…" : "Publish now"}
                      </button>
                    </>
                  )}
                  {keyStatus === "error" && (
                    <button
                      onClick={() => void checkPublished()}
                      className="text-[11px] font-geist font-medium text-neutral-900 underline underline-offset-2"
                    >
                      Couldn&apos;t check — retry
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-neutral-400 font-geist">
                Sign in fully to derive your encryption key.
              </p>
            )}
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium font-geist text-neutral-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out on this device
            </button>
          </Group>

          <p className="px-6 py-4 text-[11px] leading-relaxed text-neutral-400 font-geist">
            Quill MVP · Signed &amp; end-to-end encrypted on Robinhood Chain.
            Not affiliated with Robinhood Markets, Inc.
          </p>
          <div className="px-6 pb-5">
            <p className="text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-2">
              Keyboard shortcuts
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                ["C", "New mail"],
                ["/", "Search"],
                ["J / K", "Next / previous thread"],
                ["E", "Archive thread"],
                ["S", "Star latest"],
                ["R / F", "Reply / forward"],
                ["Esc", "Back"],
              ].map(([key, label]) => (
                <p key={key} className="flex items-center gap-2 text-[11px] font-geist text-neutral-500">
                  <kbd className="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-700 shrink-0">
                    {key}
                  </kbd>
                  {label}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
