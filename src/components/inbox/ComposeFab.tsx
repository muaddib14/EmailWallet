"use client";

import { PenSquare } from "lucide-react";

export default function ComposeFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="New mail"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-green-600 text-white font-medium font-geist h-14 px-6 shadow-[0_8px_30px_-4px_rgba(22,163,74,0.5)] hover:bg-green-700 hover:-translate-y-0.5 active:translate-y-0 transition-all"
    >
      <PenSquare className="w-5 h-5" />
      New mail
    </button>
  );
}
