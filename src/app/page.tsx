import Link from "next/link";
import { ArrowRight, Banknote, Check, Lock, ShieldCheck, X } from "lucide-react";
import SoftGlow from "@/components/SoftGlow";
import MobileMenuButton from "@/components/MobileMenuButton";
import EarlyAccessForm from "@/components/EarlyAccessForm";
import Marquee from "@/components/Marquee";
import { WALLETS } from "@/components/wallet-data";
import { NavConnectButton, HeroConnectButton } from "@/components/ConnectWalletButton";

const THEM_POINTS = [
  "Needs a password, phone number, or account",
  "No way to verify a sender's real identity",
  "Provider can read your messages",
  "No native way to send or request payment",
];

const US_POINTS = [
  "Sign in with your wallet, nothing else",
  "Every message cryptographically signed",
  "End-to-end encrypted, zero-knowledge storage",
  "Request & receive payment from any thread",
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Signed & Verifiable",
    body: "Every message carries a wallet signature over a hash of the plaintext. Anyone can verify who sent it via a public proof link — without ever seeing the content.",
  },
  {
    icon: Lock,
    title: "End-to-End Encrypted",
    body: "Subject and body are encrypted in your browser with a key derived from your wallet signature. The server only ever sees ciphertext it can't open.",
  },
  {
    icon: Banknote,
    title: "In-App Payments",
    body: "Request or receive payment directly inside a thread, settled and verified on-chain — no separate invoicing tool needed.",
  },
];

const PROTOCOL_STEPS = [
  {
    n: "01",
    title: "Connect Wallet",
    body: "Connect any EVM wallet — MetaMask, Rabby, Robinhood Wallet, or WalletConnect. No sign-up form, no email required.",
    active: false,
  },
  {
    n: "02",
    title: "Sign to Unlock",
    body: "Two signatures: one opens a 24-hour session, the other derives your personal encryption key. Nothing is stored server-side.",
    active: true,
  },
  {
    n: "03",
    title: "Send Verified Mail",
    body: "Message any wallet or name, encrypted and signed automatically. Recipients can verify authorship without seeing the content.",
    active: false,
  },
];

const STATS = [
  { label: "Wallets Signed In", value: "25", body: "With a real wallet signature. No accounts, no bots possible.", featured: false },
  { label: "Encryption Keys", value: "17", body: "Wallets ready to receive end-to-end encrypted mail.", featured: false },
  { label: ".mail Names", value: "9", body: "Claimed, now mintable as NFTs.", featured: true },
  { label: "Contact Books", value: "7", body: "People saving people, not addresses.", featured: false },
];

const CLAIMED_NAMES = ["deez.mail", "fatahh.mail", "glitcha.mail", "namiya.mail", "trump.mail"];

const SHIP_LOG = [
  { day: "D1", body: "Launch · names · signed mail · read receipts" },
  { day: "D2", body: "Labels · public verifier · E2E encryption" },
  { day: "D3", body: "Pay from the inbox · names as NFTs · furnace" },
];

export default function Home() {
  return (
    <div className="bg-white text-neutral-900 min-h-screen">
      <SoftGlow />
      <header className="relative">
        <div className="sm:px-6 lg:px-8 max-w-7xl mr-auto ml-auto pr-4 pl-4">
          <nav className="flex mt-6 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-semibold tracking-tight text-neutral-900 font-geist">
                Wallet Mail
              </span>
            </Link>

            <div className="hidden md:flex md:gap-x-2 bg-white border-neutral-200 border rounded-full pt-1 pr-1 pb-1 pl-1 shadow-sm gap-x-2 gap-y-1 items-center">
              <a href="#intelligence" className="hover:text-neutral-900 text-sm font-medium text-neutral-500 font-geist pt-2 pr-3 pb-2 pl-3">
                Protocol
              </a>
              <a href="#services" className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 font-geist">
                Features
              </a>
              <a href="#pricing" className="hover:text-neutral-900 text-sm font-medium text-neutral-500 font-geist pt-2 pr-3 pb-2 pl-3">
                Naming
              </a>
              <div className="relative inline-block group text-xs rounded-full animate-[slideInBlur_0.8s_ease-out_1.2s_forwards]">
                <NavConnectButton />
              </div>
            </div>

            <MobileMenuButton />
          </nav>

          <section className="sm:pt-20 md:pt-40 md:pb-24 text-center max-w-5xl z-10 mr-auto ml-auto pt-20 pb-32 relative">
            <h1
              className="sm:text-6xl md:text-7xl animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.2s_forwards] text-4xl tracking-tighter font-geist opacity-0 max-w-5xl mr-auto ml-auto text-neutral-900"
            >
              Your Wallet Is Your Mailbox.
              <br />
              Encrypted. Verified. Yours.
            </h1>
            <p
              className="sm:text-lg animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.3s_both] text-base font-normal text-neutral-500 font-geist max-w-2xl mt-6 mr-auto ml-auto"
            >
              No accounts, no passwords. Sign in with any EVM wallet, message any address by
              name, and every message is signed and end-to-end encrypted on Robinhood Chain.
            </p>
            <div
              className="flex flex-col sm:flex-row animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.4s_both] mt-8 gap-x-3 gap-y-3 items-center justify-center"
            >
              <HeroConnectButton />
              <a
                href="#services"
                className="inline-flex items-center gap-2 hover:bg-neutral-50 text-base font-medium text-neutral-700 bg-white border-neutral-200 border rounded-full pt-3 pr-6 pb-3 pl-6 shadow-sm font-geist transition-colors"
              >
                How It Works
              </a>
            </div>

            <p className="mt-8 text-xs text-neutral-400 font-geist">
              Trusted by wallet-native builders · Signed, not stored in plaintext
            </p>
          </section>
        </div>
      </header>

      {/* Trusted By */}
      <section className="z-10 font-semibold max-w-7xl mt-4 mr-auto ml-auto pb-16 relative">
        <p className="animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.5s_both] text-lg font-medium text-neutral-400 font-geist text-center mb-6 px-6">
          Works with the wallets you already have
        </p>
        <div className="animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.6s_both]">
          <Marquee items={WALLETS} speedSeconds={22} />
        </div>
      </section>

      {/* 1. THE MANIFESTO */}
      <section className="border-y border-neutral-100 bg-neutral-50 pt-24 pb-24 relative" id="intelligence">
        <div className="sm:px-6 lg:px-8 text-center max-w-4xl mr-auto ml-auto pr-6 pl-6">
          <h2 className="uppercase animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.1s_both] text-xs font-semibold text-green-700 tracking-wider font-geist inline-block border border-green-200 rounded-full px-3 py-1 bg-green-50">
            The Protocol
          </h2>
          <h3 className="mt-4 text-3xl sm:text-5xl font-geist tracking-tighter text-neutral-900 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.2s_both]">
            Email was built for accounts. <br />
            Web3 needs something built for wallets.
          </h3>

          <div className="sm:p-12 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.3s_both] bg-white border-neutral-200 border rounded-2xl shadow-sm mt-10 pt-8 pr-8 pb-8 pl-8 relative">
            <svg
              className="absolute top-6 left-6 h-8 w-8 text-neutral-200 transform -translate-x-2 -translate-y-2"
              fill="currentColor"
              viewBox="0 0 32 32"
              aria-hidden="true"
            >
              <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
            </svg>
            <p className="sm:text-xl leading-relaxed text-lg text-neutral-700 font-geist relative">
              Crypto communities are still stuck DMing on platforms that don&apos;t know a
              wallet from a username. Wallet Mail signs every message with your key, encrypts
              it before it leaves your browser, and lets anyone verify who really sent it — no
              account required, no server that can read your inbox.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-neutral-200" />
              <span className="text-sm font-medium text-neutral-400 font-geist">
                Built on Robinhood Chain
              </span>
              <div className="h-px w-12 bg-neutral-200" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. US VS THEM */}
      <section className="relative py-24 overflow-hidden">
        <div className="sm:px-6 lg:px-8 max-w-7xl mr-auto ml-auto pr-6 pl-6">
          <div className="text-center mb-16 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.1s_both]">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-geist tracking-tighter text-neutral-900">
              Built for Wallets, Not Inboxes
            </h2>
            <p className="mt-4 text-neutral-500 font-geist max-w-2xl mx-auto">
              Traditional email and Telegram DMs weren&apos;t designed for on-chain identity.
              We were.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.2s_both]">
            <div className="p-8 rounded-2xl border border-neutral-200 bg-neutral-50 flex flex-col gap-6">
              <h3 className="text-xl font-medium text-neutral-500 font-geist">
                Email &amp; Telegram DMs
              </h3>
              <ul className="space-y-4">
                {THEM_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-neutral-500">
                    <X className="w-5 h-5 text-neutral-400" />
                    <span className="font-geist">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative p-8 rounded-2xl border flex flex-col gap-6 shadow-[0_8px_30px_-8px_rgba(22,163,74,0.25)] border-green-200 bg-green-50">
              <div className="absolute -top-3 -right-3">
                <span className="relative flex h-6 w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-green-400" />
                  <span className="relative inline-flex rounded-full h-6 w-6 items-center justify-center bg-green-600">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                </span>
              </div>
              <h3 className="text-xl font-medium text-neutral-900 font-geist">Wallet Mail</h3>
              <ul className="space-y-4">
                {US_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-neutral-800">
                    <div className="p-1 rounded-full bg-green-600/15">
                      <Check className="w-4 h-4 text-green-700" />
                    </div>
                    <span className="font-geist font-medium">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SERVICES (Core Features) */}
      <section
        className="sm:px-6 lg:px-8 max-w-7xl z-10 mr-auto ml-auto pt-8 pr-6 pb-20 pl-6 relative"
        id="services"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-medium text-neutral-400 font-geist animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.1s_both]">
              Core Features
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-geist tracking-tighter text-neutral-900 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.2s_both]">
              Everything Email Should&apos;ve Been
            </h2>
            <p className="mt-3 text-base text-neutral-500 font-geist animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.3s_both]">
              Three pillars: identity, privacy, and payment — all native to your wallet.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 gap-x-6 gap-y-6">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm animate-on-scroll group hover:shadow-md hover:-translate-y-0.5 transition-all md:col-span-1"
                style={{ animation: `fadeSlideIn 1s ease-out ${0.5 + i * 0.1}s both` }}
              >
                <div className="sm:p-8 pt-6 pr-6 pb-6 pl-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-2 border rounded-lg bg-green-50 border-green-200">
                      <Icon className="w-6 h-6 text-green-700" />
                    </div>
                  </div>
                  <h3 className="text-xl font-medium tracking-tight font-geist text-neutral-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm text-neutral-500 font-geist leading-relaxed">
                    {feature.body}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900 md:col-span-3 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.4s_both] mt-6">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 80% 20%, rgba(34,197,94,0.25), transparent 60%)",
              }}
            />
            <div className="p-8 sm:p-12 relative z-20 h-full flex flex-col justify-center max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium font-geist border-green-400/30 bg-green-400/15 text-green-300">
                  Naming
                </span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-geist tracking-tighter text-white">
                Trade <span className="text-green-400">0x71C9...4aB2</span> for{" "}
                <span className="text-green-400">maya.mail</span>
              </h3>
              <p className="mt-4 text-base sm:text-lg text-white/70 font-geist">
                Mint a human-readable name as a transferable NFT. It resolves to your address
                and encryption key — no more copy-pasting 42-character wallet addresses into a
                &quot;To&quot; field.
              </p>
              <div className="mt-8">
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900 bg-white rounded-lg px-4 py-2 hover:bg-neutral-200 transition font-geist"
                >
                  See Naming Fees
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROCESS PATH */}
      <section className="border-y border-neutral-100 bg-neutral-50 pt-24 pb-24 relative">
        <div className="sm:px-6 lg:px-8 max-w-7xl mr-auto ml-auto pr-6 pl-6">
          <div className="text-center mb-16 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.1s_both]">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-geist tracking-tighter text-neutral-900">
              From Wallet to Inbox
            </h2>
            <p className="mt-4 text-neutral-500 font-geist">Three steps, no account creation.</p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8">
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            {PROTOCOL_STEPS.map((step, i) => (
              <div
                key={step.n}
                className="relative flex flex-col items-center text-center animate-on-scroll"
                style={{ animation: `fadeSlideIn 1s ease-out ${0.2 + i * 0.1}s both` }}
              >
                <div
                  className={`w-16 h-16 rounded-full bg-white border flex items-center justify-center relative z-10 mb-6 shadow-sm ${
                    step.active ? "border-green-500" : "border-neutral-200"
                  }`}
                >
                  <span
                    className={`text-xl font-bold font-geist ${
                      step.active ? "text-green-600" : "text-neutral-900"
                    }`}
                  >
                    {step.n}
                  </span>
                </div>
                <h3 className="text-xl font-medium text-neutral-900 font-geist mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-500 font-geist leading-relaxed max-w-xs">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        className="sm:p-8 sm:ml-8 sm:mr-8 sm:mb-10 mt-10 mr-8 mb-10 ml-8 pt-6 pr-6 pb-6 pl-6"
        id="pricing"
      >
        <div className="relative">
          <div className="relative max-w-5xl mx-auto text-center animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.1s_both]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 shadow-sm text-neutral-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-xs font-normal font-geist">Day 3 · Real Numbers</span>
            </div>
            <h2 className="text-[40px] sm:text-6xl leading-[0.95] text-neutral-900 mt-4 font-geist tracking-tighter">
              Small. Real.{" "}
              <span
                className="italic"
                style={{ fontFamily: "'Instrument Serif', serif", color: "#16a34a" }}
              >
                Wallet&#8209;signed.
              </span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-neutral-500 max-w-2xl mx-auto font-geist">
              Every number below is a wallet signature, not a signup form. Counted straight
              from the database.
            </p>
          </div>

          <div className="relative max-w-[1400px] mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <article
                key={stat.label}
                className={`relative overflow-hidden rounded-2xl border p-6 animate-on-scroll flex flex-col h-full transition-all duration-300 ${
                  stat.featured
                    ? "shadow-[0_8px_30px_-8px_rgba(22,163,74,0.25)] border-green-200 bg-green-50"
                    : "border-neutral-200 bg-white shadow-sm hover:shadow-md"
                }`}
                style={{ animation: `fadeSlideIn 1s ease-out ${0.2 + i * 0.1}s both` }}
              >
                <p
                  className={`relative text-xs font-geist uppercase tracking-wider mb-6 ${
                    stat.featured ? "text-green-700" : "text-neutral-400"
                  }`}
                >
                  {stat.label}
                </p>
                <p className="relative text-4xl lg:text-5xl text-neutral-900 font-geist tracking-tighter mb-4">
                  {stat.value}
                </p>
                <p
                  className={`relative text-sm font-geist leading-relaxed mt-auto ${
                    stat.featured ? "text-neutral-700" : "text-neutral-500"
                  }`}
                >
                  {stat.body}
                </p>
              </article>
            ))}
          </div>

          <div className="relative max-w-[1400px] mx-auto mt-6 grid md:grid-cols-2 gap-6">
            <article className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 sm:p-8 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.2s_both] hover:shadow-md transition-all duration-300">
              <h3 className="text-lg text-neutral-900 font-medium tracking-tight font-geist mb-2">
                Every number here is a wallet signature, not a signup form.
              </h3>
              <p className="text-sm text-neutral-500 font-geist leading-relaxed mb-6">
                No email lists, no fake accounts, no bought users. 25 wallets signed a
                sentence with their private key. That&apos;s the only way in.
              </p>
              <div className="flex flex-wrap gap-2">
                {CLAIMED_NAMES.map((name) => (
                  <span
                    key={name}
                    className="text-[11px] font-geist bg-neutral-50 border border-neutral-200 text-neutral-600 rounded-full px-3 py-1"
                  >
                    {name}
                  </span>
                ))}
                <span className="text-[11px] font-geist text-neutral-400 rounded-full px-3 py-1">
                  +4 more
                </span>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 sm:p-8 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.3s_both] hover:shadow-md transition-all duration-300">
              <h3 className="text-lg text-neutral-900 font-medium tracking-tight font-geist mb-4">
                Shipped in the same 3 days
              </h3>
              <ul className="space-y-3.5">
                {SHIP_LOG.map((entry) => (
                  <li key={entry.day} className="flex items-start gap-3">
                    <span className="text-[11px] font-geist text-green-700 mt-0.5 shrink-0 font-semibold">
                      {entry.day}
                    </span>
                    <span className="text-sm text-neutral-600 font-geist">{entry.body}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <p className="max-w-[1400px] mx-auto mt-6 text-center text-[11px] text-neutral-400 font-geist tracking-wide">
            Counted from the database, 2026-09-19 · Test wallets excluded · Robinhood Chain
          </p>
        </div>
      </section>

      {/* 5. APPLICATION FORM */}
      <section
        className="overflow-hidden relative py-24 bg-neutral-50 border-t border-neutral-100"
        id="application"
      >
        <div className="relative max-w-2xl mx-auto text-center px-6 animate-on-scroll [animation:fadeSlideIn_1s_ease-out_0.1s_both]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 shadow-sm text-neutral-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-xs font-normal font-geist">Early Access</span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-geist tracking-tighter text-neutral-900">
            Get Early Access
          </h2>
          <p className="mt-3 text-neutral-500 font-geist text-sm sm:text-base">
            Robinhood Chain wallets get priority access to name minting.
          </p>

          <EarlyAccessForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-100 bg-white px-6 py-14 relative">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10 text-sm">
          <div>
            <h4 className="font-geist font-medium mb-2 text-neutral-900">Wallet Mail</h4>
            <p className="text-neutral-500 font-geist max-w-xs">
              Email for wallets. Sign in with your key, message any address, every word
              encrypted and signed. Built on Robinhood Chain.
            </p>
          </div>
          <div>
            <h4 className="font-geist font-medium mb-3 text-neutral-900">Product</h4>
            <ul className="space-y-2 text-neutral-500 font-geist">
              <li>
                <a href="#intelligence" className="hover:text-neutral-900 transition-colors">
                  Protocol
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-neutral-900 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-neutral-900 transition-colors">
                  Naming
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-geist font-medium mb-3 text-neutral-900">Legal</h4>
            <ul className="space-y-2 text-neutral-500 font-geist">
              <li>
                <a href="#" className="hover:text-neutral-900 transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-neutral-900 transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="max-w-6xl mx-auto mt-10 pt-6 border-t border-neutral-100 text-xs text-neutral-400 font-geist">
          © 2026 Wallet Mail. Not affiliated with Robinhood Markets, Inc.
        </p>
      </footer>
    </div>
  );
}
