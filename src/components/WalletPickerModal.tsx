"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";
import type { Connector } from "wagmi";
import { useWalletAuth } from "@/lib/useWalletAuth";
import WalletMark from "@/components/WalletMark";
import { WALLETS } from "@/components/wallet-data";

type Props = {
  open: boolean;
  onClose: () => void;
};

const INSTALL_LINKS: { match: string; url: string }[] = [
  { match: "metamask", url: "https://metamask.io/download/" },
  { match: "rabby", url: "https://rabby.io" },
];

function brandFor(name: string) {
  const lower = name.toLowerCase();
  return WALLETS.find((w) => lower.includes(w.name.toLowerCase().split(" ")[0]));
}

function ConnectorIcon({ connector }: { connector: Connector }) {
  const brand = brandFor(connector.name);
  // wagmi EIP-6963 connectors carry the wallet's own icon (data URI / URL).
  // Prefer it when present so MetaMask vs Rabby vs Phantom is visually
  // distinct; fall back to our bundled official marks, then to a monogram.
  const icon = (connector as { icon?: string }).icon;
  if (icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={icon} alt="" className="h-9 w-9 rounded-xl shrink-0" aria-hidden="true" />
    );
  }
  if (brand) {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center shrink-0 [&>span]:h-9 [&>span]:w-9 [&>span]:rounded-xl [&_svg]:h-5 [&_svg]:w-5">
        <WalletMark wallet={brand} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-sm font-geist font-semibold text-neutral-600 shrink-0"
      aria-hidden="true"
    >
      {connector.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function WalletPickerModal({ open, onClose }: Props) {
  const { connectors, connectAndSign, isBusy, step, signOut } = useWalletAuth();
  const [pickedUid, setPickedUid] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  // Portal target: rendering straight into document.body keeps the modal
  // out of the landing page's filtered/animated wrappers — a lingering
  // `filter: blur(0)` from the entrance animations would otherwise trap
  // `position: fixed` inside the tiny nav pill instead of the viewport.
  // No mounted-state dance needed: `open` starts false and only flips via
  // click, so the server and first client render always output null here.

  const detected = useMemo(() => connectors.filter((c) => c.type === "injected"), [connectors]);

  const missingBrands = useMemo(() => {
    const names = detected.map((c) => c.name.toLowerCase()).join(" ");
    return (["MetaMask", "Rabby"] as const).filter(
      (brand) => !names.includes(brand.toLowerCase())
    );
  }, [detected]);

  // Auto-close once the two-signature flow completes (user picked + signed).
  useEffect(() => {
    if (open && step === "ready") onClose();
  }, [open, step, onClose]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  async function handlePick(connector: Connector) {
    setPickedUid(connector.uid);
    try {
      await connectAndSign(connector);
    } finally {
      setPickedUid(null);
    }
  }

  async function handleResume() {
    setResuming(true);
    try {
      await connectAndSign();
    } finally {
      setResuming(false);
    }
  }

  const signing = step === "signing";

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
        aria-label="Choose a wallet"
        className="relative w-full max-w-sm rounded-3xl border border-neutral-200/80 bg-white p-6 text-neutral-900 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)] [animation:modal-dialog-in_0.22s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-geist font-semibold tracking-tight">
              Connect a wallet
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-neutral-500 font-geist">
              {signing
                ? "Your wallet is connected — finish the two signatures, or switch to a different wallet below."
                : "Two signatures follow: a session key and your encryption key."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -m-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          {signing && (
            <>
              <button
                onClick={() => void handleResume()}
                disabled={isBusy}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-sm font-geist font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-wait"
              >
                {resuming && (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                )}
                {resuming ? "Check your wallet…" : "Continue signing"}
              </button>
              <div className="my-4 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-neutral-200" />
                <span className="text-[11px] font-geist text-neutral-400">
                  or use a different wallet
                </span>
                <span className="h-px flex-1 bg-neutral-200" />
              </div>
            </>
          )}
          {detected.length > 0 ? (
            <ul className="space-y-2">
              {detected.map((connector) => {
                const busy = isBusy && pickedUid === connector.uid;
                return (
                  <li key={connector.uid}>
                    <button
                      onClick={() => void handlePick(connector)}
                      disabled={isBusy}
                      className="group w-full flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left transition-all hover:border-neutral-400 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait"
                    >
                      <ConnectorIcon connector={connector} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="block text-sm font-geist font-medium truncate">
                            {connector.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-green-50 border border-green-200 px-2 py-px text-[10px] font-geist font-medium text-green-700">
                            Detected
                          </span>
                        </span>
                        <span className="block mt-0.5 text-xs text-neutral-400 font-geist">
                          {busy ? "Check your wallet…" : "Ready to connect"}
                        </span>
                      </span>
                      {busy ? (
                        <span className="h-4 w-4 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center">
              <p className="text-sm font-geist font-medium">No wallet detected</p>
              <p className="mt-1 text-xs text-neutral-500 font-geist">
                Install MetaMask or Rabby, then refresh this page.
              </p>
            </div>
          )}

          {missingBrands.length > 0 && !signing && (
            <div className="mt-4 flex items-center justify-center gap-1 text-xs font-geist text-neutral-400">
              <span>Need a wallet?</span>
              {missingBrands.map((brandName, i) => {
                const link = INSTALL_LINKS.find((l) =>
                  brandName.toLowerCase().includes(l.match)
                )!;
                return (
                  <span key={brandName} className="inline-flex items-center gap-1">
                    {i > 0 && <span aria-hidden="true">·</span>}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-neutral-700 underline underline-offset-2 decoration-neutral-300 hover:text-neutral-950 hover:decoration-neutral-950 transition-colors"
                    >
                      Get {brandName}
                    </a>
                  </span>
                );
              })}
            </div>
          )}
          {signing && (
            <div className="mt-4 text-center">
              <button
                onClick={signOut}
                disabled={isBusy}
                className="text-xs font-geist text-neutral-400 hover:text-neutral-900 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                Cancel connection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
