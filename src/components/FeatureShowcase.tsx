"use client";

import { useEffect, useState, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Banknote, Check, Lock, Pause, Play, ShieldCheck } from "lucide-react";

const AUTO_ADVANCE_MS = 5000;

export type ShowcaseFeature = {
  title: string;
  body: string;
  image: string;
  linkColor: string;
  linkLabel: string;
  href: string;
  Visual: ComponentType;
};

function SignatureVisual() {
  return (
    <div className="w-full rounded-xl border border-neutral-200/80 bg-white p-4 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-mono text-white">
          0x
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-neutral-900 font-geist">Maya</p>
          <p className="truncate text-[10px] font-mono text-neutral-400">0x71C9...4aB2</p>
        </div>
        <span className="text-[10px] text-neutral-400 font-geist">now</span>
      </div>

      <div className="mt-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
        <p className="text-[10px] text-neutral-400 font-geist">Message hash</p>
        <p className="truncate text-[11px] font-mono text-neutral-700">0x9f3c8a21…e74b</p>
      </div>

      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700 font-geist">
        <Check className="h-3 w-3" />
        Signature valid
      </div>
    </div>
  );
}

function EncryptionVisual() {
  return (
    <div className="w-full rounded-xl border border-neutral-200/80 bg-white p-4 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.45)]">
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-geist">You write</p>
      <p className="mt-1 text-xs text-neutral-800 font-geist">Wire the retainer today.</p>

      <div className="my-3 flex items-center gap-2">
        <span className="h-px flex-1 bg-neutral-100" />
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 font-geist">
          <Lock className="h-2.5 w-2.5" />
          Encrypted in browser
        </span>
        <span className="h-px flex-1 bg-neutral-100" />
      </div>

      <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-geist">
        Server stores
      </p>
      <p className="mt-1 break-all text-[11px] font-mono leading-relaxed text-neutral-400">
        U2FsdGVkX1+9k2Rr7mQxPb4tVz8hLd0c…
      </p>
    </div>
  );
}

function PaymentVisual() {
  return (
    <div className="w-full rounded-xl border border-neutral-200/80 bg-white p-4 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-900 font-geist">Payment confirmed</p>
        <span className="text-[10px] text-neutral-400 font-geist">now</span>
      </div>
      <p className="mt-0.5 truncate text-[10px] font-mono text-neutral-400">0x71C9...4aB2</p>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-100">
            <Banknote className="h-3 w-3 text-amber-700" />
          </span>
          <span className="text-[11px] text-neutral-600 font-geist">Settled on-chain</span>
        </span>
        <span className="text-[11px] font-mono font-medium text-neutral-900">0.5 ETH</span>
      </div>

      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700 font-geist">
        <ShieldCheck className="h-3 w-3" />
        Signed &amp; verified
      </div>
    </div>
  );
}

// Each feature's photo lives at /public/<image> — drop a JPG/PNG with that
// exact filename and it appears behind the floating UI card automatically.
// Recommended source size: ~1200x1150px (roughly 4:3.85), landscape-ish
// portrait/lifestyle shot with clear empty space in the lower-left third
// for the card to sit over.
// Lives here (not in the server page) because client components can't
// receive component references as props — the configurator must own them.
const FEATURES: ShowcaseFeature[] = [
  {
    Visual: SignatureVisual,
    image: "/1.png",
    linkColor: "text-green-700 hover:text-green-800",
    title: "Signed & Verifiable",
    body: "Every message carries a wallet signature over a hash of the plaintext.",
    linkLabel: "See a proof link",
    href: "/verify",
  },
  {
    Visual: EncryptionVisual,
    image: "/2.png",
    linkColor: "text-blue-700 hover:text-blue-800",
    title: "End-to-End Encrypted",
    body: "Subject and body are encrypted in your browser — the server only ever sees ciphertext it can't open.",
    linkLabel: "How encryption works",
    href: "#process",
  },
  {
    Visual: PaymentVisual,
    image: "/3.png",
    linkColor: "text-amber-700 hover:text-amber-800",
    title: "In-App Payments",
    body: "Request or receive payment directly inside a thread, settled and verified on-chain.",
    linkLabel: "Explore payments",
    href: "/inbox",
  },
];

export default function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Auto-advance while playing — paused the instant the person takes manual
  // control (a dot or the play/pause button), same as Proton's carousel.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % FEATURES.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const feature = FEATURES[active];
  const Visual = feature.Visual;

  return (
    <div className="grid lg:grid-cols-[1.15fr_1fr] gap-14 lg:gap-20 items-center">
      <div className="animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.3s_both]">
        <div className="relative">
          <div className="relative aspect-[4/3.1] w-full overflow-hidden rounded-3xl bg-neutral-100">
            {FEATURES.map((f, i) => (
              <Image
                key={f.image}
                src={f.image}
                alt=""
                fill
                priority={i === 0}
                className={`object-cover transition-opacity duration-700 ease-out ${
                  i === active ? "opacity-100" : "opacity-0"
                }`}
                sizes="(min-width: 1024px) 55vw, 90vw"
              />
            ))}
          </div>
          <div
            key={active}
            className="absolute left-5 right-5 bottom-5 sm:left-8 sm:right-auto sm:bottom-8 sm:w-[300px] [animation:fadeSlideIn_0.4s_ease-out_both]"
          >
            <Visual />
          </div>
        </div>

        {/* Progress dots + manual play/pause, matching the reference carousel */}
        <div className="mt-6 inline-flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-2">
            {FEATURES.map((f, i) => (
              <button
                key={f.title}
                onClick={() => {
                  setActive(i);
                  setPlaying(false);
                }}
                aria-label={`Show ${f.title}`}
                aria-current={i === active}
                className="relative h-1.5 rounded-full overflow-hidden bg-neutral-200 transition-all duration-300"
                style={{ width: i === active ? 22 : 6 }}
              >
                {i === active && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-neutral-900"
                    style={{
                      width: playing ? undefined : "100%",
                      animation: playing ? `showcaseProgress ${AUTO_ADVANCE_MS}ms linear` : undefined,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
          >
            {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {FEATURES.map((f, i) => {
          const isActive = i === active;
          return (
            <button
              key={f.title}
              onClick={() => {
                setActive(i);
                setPlaying(false);
              }}
              className={`block w-full text-left animate-on-scroll transition-opacity ${
                isActive ? "opacity-100" : "opacity-50 hover:opacity-80"
              }`}
              style={{ animation: `fadeSlideIn 1s ease-out ${0.4 + i * 0.1}s both` }}
            >
              <h3 className="text-lg font-medium tracking-tight text-neutral-900 font-geist">
                {f.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-500 font-geist">{f.body}</p>
              <Link
                href={f.href}
                onClick={(e) => e.stopPropagation()}
                className={`mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium font-geist transition-colors ${f.linkColor}`}
              >
                {f.linkLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </button>
          );
        })}
      </div>
    </div>
  );
}

