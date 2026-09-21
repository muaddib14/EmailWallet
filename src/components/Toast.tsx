"use client";

import { useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";

type ToastItem = { id: number; message: string; kind: ToastKind };

const EVENT = "walletmail:toast";
const AUTO_DISMISS_MS = 4000;

/** Fire-and-forget toast from anywhere: `toast("Message sent")`. */
export function toast(message: string, kind: ToastKind = "success") {
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: { message, kind, id: Date.now() + Math.random() } })
  );
}

const DOTS: Record<ToastKind, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<Omit<ToastItem, "id"> & { id: number }>).detail;
      if (!detail?.message) return;
      setItems((prev) => [...prev.slice(-2), detail]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== detail.id));
      }, AUTO_DISMISS_MS);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] w-[calc(100%-2rem)] max-w-md space-y-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className="flex items-start gap-3 rounded-xl border border-white/10 bg-neutral-900/95 px-4 py-3 shadow-2xl backdrop-blur [animation:modal-dialog-in_0.22s_cubic-bezier(0.16,1,0.3,1)]"
        >
          <span
            className={`mt-1.5 h-2 w-2 rounded-full ${DOTS[t.kind]} shrink-0`}
            aria-hidden="true"
          />
          <p className="flex-1 text-[13px] leading-snug text-white/90 font-geist">{t.message}</p>
          <button
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
            className="p-1 -m-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
