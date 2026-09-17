import type { Wallet } from "./wallet-data";

export default function WalletMark({ wallet }: { wallet: Wallet }) {
  if (wallet.mark.kind === "svg") {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0"
        style={{ backgroundColor: `#${wallet.hex}1a` }}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
          <path d={wallet.mark.path} fill={`#${wallet.hex}`} />
        </svg>
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-geist font-semibold shrink-0"
      style={{ backgroundColor: `#${wallet.hex}1a`, color: `#${wallet.hex}` }}
      aria-hidden="true"
    >
      {wallet.mark.letter}
    </span>
  );
}
