import { VerifyForm } from "@/components/verify/VerifyPanel";
import Link from "next/link";

export const metadata = {
  title: "Verify a message — Wallet Mail",
  description: "Check who really signed a Wallet Mail message. No wallet or login needed.",
};

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight font-geist">
          Wallet Mail
        </Link>
        <Link
          href="/inbox"
          className="text-sm font-geist text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          Open inbox
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-xs font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Public proof
        </p>
        <h1 className="mt-2 text-4xl font-geist font-semibold tracking-tighter">
          Verify a message
        </h1>
        <p className="mt-2 text-sm text-neutral-500 font-geist leading-relaxed">
          Got a proof link from someone? Paste it below to check their signature — no wallet,
          no login, content stays encrypted.
        </p>
        <div className="mt-6 rounded-3xl border border-neutral-200/80 bg-white shadow-[0_24px_80px_-32px_rgba(0,0,0,0.25)] p-6">
          <VerifyForm />
        </div>
      </main>
    </div>
  );
}
