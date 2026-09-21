import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

// Verified against an archived snapshot of docs.robinhood.com/chain/connecting
// (web.archive.org, captured 2026-09-13) — the live domain resolves through
// Indonesia's ISP-level DNS filter (internetpositif.id) from this sandbox's
// network, which made an earlier attempt look like the data was fabricated.
// It wasn't; the archived page confirms these values directly from
// Robinhood's own docs table. Re-confirm from the live site if you're ever
// unsure — this sandbox's network just can't reach it.
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

export const robinhoodChainTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://explorer.testnet.chain.robinhood.com" },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [robinhoodChain, robinhoodChainTestnet],
  connectors: [injected()],
  transports: {
    [robinhoodChain.id]: http(),
    [robinhoodChainTestnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
