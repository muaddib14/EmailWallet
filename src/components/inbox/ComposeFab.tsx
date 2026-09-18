"use client";

import { PenSquare } from "lucide-react";

export default function ComposeFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="New mail"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-white text-black font-medium font-geist h-14 px-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:bg-neutral-200 hover:-translate-y-0.5 active:translate-y-0 transition-all"
    >
      <PenSquare className="w-5 h-5" />
      New mail
    </button>
  );
}
