import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Robinhood Chain's public chain ID / RPC endpoint STILL isn't verifiably
// published anywhere. A WebSearch pass turned up a plausible-looking chain ID
// (4663) and RPC URL, but a direct DNS check showed both
// rpc.mainnet.chain.robinhood.com and docs.robinhood.com resolving to
// internetpositif.id — Indonesia's ISP-level redirect for domains that don't
// actually exist. That data was very likely search-engine hallucination, not
// real, so it was deliberately NOT wired in here. Get the real chain
// definition from Robinhood's own docs (verified by someone who can actually
// load the page) before touching this — the rest of the auth flow (connect +
// sign) needs no changes once you do.
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
