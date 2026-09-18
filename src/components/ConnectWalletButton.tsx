"use client";

import { useWalletAuth } from "@/lib/useWalletAuth";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const LABELS: Record<string, string> = {
  disconnected: "Connect Wallet",
  connecting: "Connecting...",
  signing: "Sign to Continue",
};

export function NavConnectButton() {
  const { address, step, error, isBusy, connectAndSign, signOut } = useWalletAuth();

  if (step === "ready" && address) {
    return (
      <button
        onClick={signOut}
        className="relative z-10 overflow-hidden text-white bg-neutral-900/60 border-white/20 border pt-3 pr-6 pb-3 pl-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-xs rounded-full cursor-pointer inline-flex items-center gap-2 font-geist font-medium"
        title="Click to disconnect"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        {shortAddress(address)}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={connectAndSign}
        disabled={isBusy}
        className="relative z-10 overflow-hidden transition-[transform] duration-150 ease-out active:scale-[0.98] text-white bg-neutral-900/60 border-white/20 border pt-3 pr-6 pb-3 pl-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-xs rounded-full cursor-pointer inline-flex disabled:opacity-60 disabled:cursor-wait"
      >
        <span className="z-10 inline-flex items-center gap-2 text-xs font-medium font-geist rounded-full relative">
          {LABELS[step] ?? "Connect Wallet"}
        </span>
        <span className="pointer-events-none absolute bottom-0 left-1/2 right-1/2 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 transition-[left,right] duration-500 ease-out group-hover:left-0 group-hover:right-0 text-xs rounded-full" />
      </button>
      {error && (
        <p className="absolute top-full right-0 mt-2 w-64 text-[11px] text-red-400 font-geist text-right z-20">
          {error} Click to try again.
        </p>
      )}
    </div>
  );
}

export function HeroConnectButton() {
  const { step, error, isBusy, connectAndSign } = useWalletAuth();

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={connectAndSign}
        disabled={isBusy || step === "ready"}
        className="group relative inline-flex min-w-[140px] cursor-pointer transition-all duration-[1000ms] ease-[cubic-bezier(0.15,0.83,0.66,1)] hover:-translate-y-[3px] hover:text-white shadow-[0_2.8px_2.2px_rgba(0,0,0,0.3),_0_6.7px_5.3px_rgba(0,0,0,0.35),_0_12.5px_10px_rgba(0,0,0,0.4)] overflow-hidden font-semibold text-neutral-400 tracking-tight bg-neutral-800 border-neutral-600 border rounded-full pt-[12px] pr-[20px] pb-[12px] pl-[20px] items-center justify-center disabled:cursor-wait"
      >
        <span className="relative z-10 font-medium rounded-full transition-all duration-500 ease-out group-hover:transform group-hover:translate-y-8 group-hover:opacity-0 group-hover:blur-md font-geist">
          {step === "ready" ? "Inbox Unlocked" : "Open Inbox"}
        </span>
        <span className="absolute inset-0 z-10 flex items-center justify-center transition-all duration-300 ease-in-out transform -translate-y-8 group-hover:translate-y-0 group-hover:opacity-100 group-hover:blur-none font-medium opacity-0 rounded-full blur-md font-geist">
          {step === "connecting"
            ? "Connecting..."
            : step === "signing"
              ? isBusy
                ? "Check Your Wallet"
                : "Retry Sign In"
              : "Connect & Sign In"}
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-1/2 h-[1px] w-[70%] -translate-x-1/2 transition-all duration-[1000ms] ease-[cubic-bezier(0.15,0.83,0.66,1)] group-hover:opacity-80 bg-gradient-to-r from-transparent via-neutral-200 to-transparent rounded-full blur-[2px]"
        />
      </button>
      {error && (
        <p className="text-xs text-red-400 font-geist text-center max-w-sm">{error}</p>
      )}
    </div>
  );
}
