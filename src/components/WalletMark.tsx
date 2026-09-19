import { useId } from "react";
import type { Wallet } from "./wallet-data";

export default function WalletMark({ wallet }: { wallet: Wallet }) {
  // useId gives a stable id unique per rendered instance, so if this same
  // wallet is rendered twice (e.g. a looping marquee), each copy's gradient
  // ids in Rabby's rawSvg markup don't collide in the DOM.
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");

  if (wallet.mark.kind === "rawSvg") {
    const markup = wallet.mark.markup.replaceAll("{{UID}}", rawId);
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0"
        style={{ backgroundColor: `#${wallet.hex}1a` }}
      >
        <svg
          viewBox={wallet.mark.viewBox}
          className="h-3.5 w-3.5"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </span>
    );
  }

  if (wallet.mark.kind === "svg") {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0"
        style={{ backgroundColor: `#${wallet.hex}1a` }}
      >
        <svg viewBox={wallet.mark.viewBox ?? "0 0 24 24"} className="h-3.5 w-3.5" aria-hidden="true">
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
