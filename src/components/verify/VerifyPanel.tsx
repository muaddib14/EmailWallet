"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { recoverMessageAddress } from "viem";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Copy,
  Fingerprint,
  LoaderCircle,
  Lock,
  TriangleAlert,
  Wallet,
} from "lucide-react";

type Proof = {
  fromAddress: string;
  messageHash: `0x${string}`;
  senderSignature: `0x${string}`;
  createdAt: string;
};

function extractId(input: string): string {
  const trimmed = input.trim();
  // Accept a pasted full proof URL as well as a bare id.
  const m = trimmed.match(/\/verify\/([A-Za-z0-9-]+)\/?$/);
  return (m?.[1] ?? trimmed).slice(0, 64);
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

function CopyChip({ text, label }: { text: string; label: string }) {
  const [copied, copy] = useCopyFlash();
  const done = copied === text;
  return (
    <button
      onClick={() => copy(text)}
      title={label}
      className="p-1.5 -m-1 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
    >
      {done ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function VerifyForm({ initial }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const id = extractId(value);
        if (id) router.push(`/verify/${encodeURIComponent(id)}`);
      }}
      className="flex items-center gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste a proof link or id…"
        className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-geist text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 transition-colors"
      />
      <button
        type="submit"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium font-geist text-white hover:bg-neutral-700 transition-colors"
      >
        Verify
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}

const STEPS = ["Fetch proof", "Recover signer", "Match sender"];

function StepRail({ stage }: { stage: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Verification progress">
      {STEPS.map((label, i) => {
        const done = stage > i;
        const active = stage === i;
        return (
          <li key={label} className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0 transition-colors ${
                  done
                    ? "bg-green-600 text-white"
                    : active
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {done ? (
                  <Check className="w-3 h-3" />
                ) : active ? (
                  <LoaderCircle className="w-3 h-3 animate-spin" />
                ) : (
                  <span className="text-[10px] font-geist font-semibold">{i + 1}</span>
                )}
              </span>
              <span
                className={`text-[11px] font-geist truncate ${
                  done || active ? "text-neutral-900 font-medium" : "text-neutral-400"
                }`}
              >
                {label}
              </span>
            </div>
            <div
              className={`mt-1.5 h-0.5 rounded-full transition-colors ${
                done ? "bg-green-500" : "bg-neutral-100"
              }`}
            />
          </li>
        );
      })}
    </ol>
  );
}

export function VerifyPanel({ id }: { id: string }) {
  const [proof, setProof] = useState<Proof | null>(null);
  const [recovered, setRecovered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setError(null);
      setProof(null);
      setRecovered(null);
      try {
        const res = await fetch(`/api/verify/${encodeURIComponent(id)}`);
        if (res.status === 404) throw new Error("Proof not found. Check the link and try again.");
        if (res.status === 429)
          throw new Error("Too many checks. Wait a minute and try again.");
        if (!res.ok) throw new Error("Couldn't load this proof. Try again.");
        const data: Proof = await res.json();
        // Trustless check, in the browser: recover the signer from the
        // signature and compare it to the claimed sender. The server is
        // never taken at its word.
        const signer = await recoverMessageAddress({
          message: { raw: data.messageHash },
          signature: data.senderSignature,
        });
        if (!cancelled) {
          setProof(data);
          setRecovered(signer);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Verification failed.");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const match =
    proof && recovered ? recovered.toLowerCase() === proof.fromAddress.toLowerCase() : null;
  const stage: 0 | 1 | 2 | 3 = error ? 0 : !proof ? 0 : 3;

  return (
    <div className="min-h-screen bg-white text-neutral-900 relative overflow-hidden">
      {/* Soft glow, same language as the landing hero. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[420px] pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(34,197,94,0.12), transparent 70%)",
        }}
      />

      <header className="relative max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight font-geist">
          Quill
        </Link>
        <Link
          href="/inbox"
          className="text-sm font-medium font-geist text-white bg-neutral-900 rounded-full px-4 py-2 hover:bg-neutral-700 transition-colors"
        >
          Open inbox
        </Link>
      </header>

      <main className="relative max-w-2xl mx-auto px-6 pt-12 pb-16 [animation:modal-dialog-in_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-geist font-medium text-green-700">
            <Lock className="w-3 h-3" />
            Public proof · no login needed
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-geist font-semibold tracking-tighter">
            Who really sent this?
          </h1>
          <p className="mt-3 text-sm sm:text-base text-neutral-500 font-geist leading-relaxed max-w-lg mx-auto">
            Anyone can check a message&apos;s authorship here. The content itself stays
            encrypted — this page only proves <em>who signed</em>.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-200/80 bg-white shadow-[0_24px_80px_-32px_rgba(0,0,0,0.25)] p-6 sm:p-8">
          <StepRail stage={stage} />

          <div className="mt-6">
            {!proof && !error && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500 font-geist">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Checking signature in your browser…
              </div>
            )}

            {error && (
              <div className="py-4 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-200">
                  <TriangleAlert className="w-6 h-6 text-red-500" />
                </span>
                <p className="mt-3 text-sm font-medium font-geist">{error}</p>
                <div className="mt-5 text-left">
                  <VerifyForm />
                </div>
              </div>
            )}

            {proof && match === true && (
              <div className="text-center">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-600 shadow-[0_8px_30px_-8px_rgba(22,163,74,0.5)] [animation:modal-dialog-in_0.35s_cubic-bezier(0.16,1,0.3,1)]">
                  <BadgeCheck className="w-8 h-8 text-white" />
                </span>
                <h2 className="mt-4 text-2xl font-geist font-semibold tracking-tight">
                  Signature valid
                </h2>
                <p className="mt-1 text-sm text-neutral-500 font-geist">
                  This message was truly signed by the wallet below.
                </p>

                <dl className="mt-6 text-left space-y-2.5">
                  <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 border border-neutral-100 px-4 py-3.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-neutral-200 shrink-0">
                      <Wallet className="w-4 h-4 text-neutral-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <dt className="text-[11px] font-geist font-semibold uppercase tracking-wider text-neutral-400">
                        Signed by
                      </dt>
                      <dd className="mt-0.5 text-[13px] font-mono text-neutral-900 break-all">
                        {proof.fromAddress}
                      </dd>
                    </div>
                    <CopyChip text={proof.fromAddress} label="Copy address" />
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 border border-neutral-100 px-4 py-3.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-neutral-200 shrink-0">
                      <Clock3 className="w-4 h-4 text-neutral-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <dt className="text-[11px] font-geist font-semibold uppercase tracking-wider text-neutral-400">
                        Signed at
                      </dt>
                      <dd className="mt-0.5 text-[13px] font-geist text-neutral-900">
                        {new Date(proof.createdAt).toLocaleString()}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 border border-neutral-100 px-4 py-3.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-neutral-200 shrink-0">
                      <Fingerprint className="w-4 h-4 text-neutral-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <dt className="text-[11px] font-geist font-semibold uppercase tracking-wider text-neutral-400">
                        Proof id
                      </dt>
                      <dd className="mt-0.5 text-[13px] font-mono text-neutral-500 break-all">
                        {id}
                      </dd>
                    </div>
                    <CopyChip text={id} label="Copy proof id" />
                  </div>
                </dl>
              </div>
            )}

            {proof && match === false && (
              <div className="py-4 text-center">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-[0_8px_30px_-8px_rgba(220,38,38,0.5)]">
                  <TriangleAlert className="w-8 h-8 text-white" />
                </span>
                <h2 className="mt-4 text-2xl font-geist font-semibold tracking-tight">
                  Signature mismatch
                </h2>
                <p className="mt-1 text-sm text-neutral-500 font-geist">
                  Recovered signer <span className="font-mono break-all">{recovered}</span> does
                  not match the claimed sender. Do not trust this message.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-green-200 bg-green-50/60 px-4 py-3.5">
            <p className="text-xs font-geist font-semibold text-green-800">This proves</p>
            <p className="mt-1 text-xs text-green-700/80 font-geist leading-relaxed">
              The wallet above authored this message and it hasn&apos;t been altered since signing.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5">
            <p className="text-xs font-geist font-semibold text-neutral-700">This reveals nothing</p>
            <p className="mt-1 text-xs text-neutral-500 font-geist leading-relaxed">
              Subject, body, and recipient stay encrypted. Verification touches the signature only.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-neutral-900 px-6 py-8 text-center relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(34,197,94,0.25), transparent 65%)",
            }}
          />
          <h2 className="relative text-xl sm:text-2xl font-geist font-semibold tracking-tight text-white">
            Want signatures like this on your mail?
          </h2>
          <p className="relative mt-2 text-sm text-white/60 font-geist">
            No account. No password. Just your wallet.
          </p>
          <Link
            href="/"
            className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold font-geist text-white hover:bg-green-500 transition-colors"
          >
            Get Quill
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-geist text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quill
          </Link>
        </div>
      </main>
    </div>
  );
}
