import { formatUnits, keccak256, toHex } from "viem";
import { robinhoodChain, robinhoodChainTestnet } from "@/lib/wagmi";

// USDG on Robinhood Chain mainnet — verified 2026-09-22 against three
// independent sources that all agree:
// - docs.robinhood.com/chain/contracts (official token table)
// - OpenSea + Robinscan + Splitshot (verified contract pages)
// 6 decimals (NOT 18 — Paxos-style stablecoin). No testnet deployment found,
// so on testnet USDG simply isn't offered; any ERC-20 can be used via the
// custom-token path instead.
export const USDG_MAINNET_ADDRESS = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
export const USDG_DECIMALS = 6;

export type TokenSpec =
  | { kind: "native"; symbol: string; decimals: 18 }
  | { kind: "erc20"; address: `0x${string}`; symbol: string; decimals: number };

export const NATIVE_TETH: TokenSpec = { kind: "native", symbol: "tETH", decimals: 18 };

// keccak256("Transfer(address,address,uint256)")
export const TRANSFER_TOPIC = keccak256(
  toHex("Transfer(address,address,uint256)")
) as `0x${string}`;

// Minimal ERC-20 surface we need: metadata reads + transfer() writes.
export const ERC20_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export function formatTokenAmount(amountBaseUnits: string, decimals: number, symbol: string) {
  try {
    return `${formatUnits(BigInt(amountBaseUnits), decimals)} ${symbol}`;
  } catch {
    return `${amountBaseUnits} ${symbol}`;
  }
}

export function chainForTestnet(isTestnet: boolean) {
  return isTestnet ? robinhoodChainTestnet : robinhoodChain;
}
