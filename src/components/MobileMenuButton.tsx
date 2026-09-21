"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavConnectButton } from "@/components/ConnectWalletButton";

const LINKS = [
  { href: "#intelligence", label: "Protocol" },
  { href: "#services", label: "Features" },
  { href: "#pricing", label: "Naming" },
];

export default function MobileMenuButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  return (
    <div className="md:hidden relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="inline-flex text-sm font-medium font-geist bg-white border-neutral-200 border rounded-lg pt-2 pr-3 pb-2 pl-3 shadow-sm gap-x-2 gap-y-2 items-center text-neutral-700"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        Menu
      </button>

      {open && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/20 cursor-default"
          />
          <div className="absolute right-0 top-full mt-2 z-40 w-56 rounded-2xl border border-neutral-200 bg-white shadow-xl p-2 [animation:modal-dialog-in_0.18s_cubic-bezier(0.16,1,0.3,1)]">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium font-geist text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-1 pt-2 border-t border-neutral-100 px-1 pb-1">
              <NavConnectButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
