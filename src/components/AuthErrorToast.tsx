"use client";

import { useEffect, useState } from "react";
import { useWalletAuth } from "@/lib/useWalletAuth";

const AUTO_DISMISS_MS = 6000;

/**
 * Single global toast for wallet-auth errors. Previously the same error
 * string rendered inline under every Connect button (nav + hero + modal),
 * so one rejection showed the same sentence two or three times on screen.
 * Now buttons stay clean and the error appears once, bottom-center,
 * auto-dismissing with a manual close.
 */
export default function AuthErrorToast() {
  const { error, clearError } = useWalletAuth();
  // The error string the user already dismissed (or that auto-expired).
  // Visibility derives from `error` so no state syncing inside effects.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const visible = error !== null && error !== dismissedFor;

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setDismissedFor(error), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error]);

  function dismiss() {
    setDismissedFor(error);
    clearError();
  }

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md"
    >
      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-neutral-900/95 px-4 py-3 shadow-2xl backdrop-blur">
        <span className="mt-1.5 h-2 w-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
        <p className="flex-1 text-[13px] leading-snug text-white/90 font-geist">{error}</p>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1 -m-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
