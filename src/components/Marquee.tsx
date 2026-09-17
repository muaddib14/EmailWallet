import type { Wallet } from "./wallet-data";
import WalletMark from "./WalletMark";

type MarqueeProps = {
  items: Wallet[];
  speedSeconds?: number;
};

export default function Marquee({ items, speedSeconds = 25 }: MarqueeProps) {
  const track = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div
        className="flex w-max items-center gap-12 marquee-track"
        style={{ animationDuration: `${speedSeconds}s` }}
      >
        {track.map((wallet, i) => (
          <span
            key={`${wallet.name}-${i}`}
            className="flex items-center gap-2.5 font-geist text-white/60 hover:text-white transition-colors text-base font-medium whitespace-nowrap"
          >
            <WalletMark wallet={wallet} />
            {wallet.name}
          </span>
        ))}
      </div>
    </div>
  );
}
