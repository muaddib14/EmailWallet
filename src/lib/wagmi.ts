import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// NOTE: Robinhood Chain's public chain ID / RPC endpoint isn't published anywhere
// verifiable yet, so wiring it in here would mean guessing values into a config
// people will actually connect wallets to — worse than leaving it out. Swap the
// `mainnet` entry below for the real chain definition once you have it from
// Robinhood's own docs, and the rest of the auth flow (connect + sign) needs no changes.
export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
