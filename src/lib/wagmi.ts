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
  // Satu `injected()` sudah cukup untuk MetaMask, Rabby, dan wallet EVM
  // lain yang inject `window.ethereum` — wagmi mendeteksi semuanya lewat
  // EIP-6963 (`window.evmproviders`) dan mengekspos tiap wallet sebagai
  // entri terpisah di `useConnect().connectors` (nama + icon + rdns asli
  // dari wallet-nya). Jangan hardcode `connectors[0]` — biarkan user pilih
  // lewat WalletPickerModal. Kalau nanti butuh QR/mobile (WalletConnect)
  // atau Coinbase SDK, tambah connector-nya di array ini.
  connectors: [injected({ shimDisconnect: true })],
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
