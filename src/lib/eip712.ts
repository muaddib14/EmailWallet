/**
 * Shared EIP-712 typed-data shape for signing a message's content hash.
 *
 * Previously this signed the raw 32-byte hash directly via personal_sign
 * (`signMessage({ message: { raw: hash } })`). Wallets with phishing
 * heuristics (Phantom, and increasingly others) flag that as "this looks
 * like a transaction hash" and block it outright, because tricking someone
 * into blind-signing a raw hash is a known drainer technique. Wrapping the
 * same hash in a typed struct gives the wallet a labeled field to render
 * ("hash: 0x...") instead of a bare hex blob, which sidesteps the
 * heuristic while verifying the exact same thing. Used identically by the
 * client (wagmi's signTypedData) and the server (viem's
 * recoverTypedDataAddress) — keep this file free of "use client"/
 * "server-only" so both sides can import it.
 */
export const QUILL_MESSAGE_DOMAIN = { name: "Quill", version: "1" } as const;

export const QUILL_MESSAGE_TYPES = {
  Message: [{ name: "hash", type: "bytes32" }],
} as const;

export const QUILL_MESSAGE_PRIMARY_TYPE = "Message" as const;

export function messageTypedData(hash: `0x${string}`) {
  return {
    domain: QUILL_MESSAGE_DOMAIN,
    types: QUILL_MESSAGE_TYPES,
    primaryType: QUILL_MESSAGE_PRIMARY_TYPE,
    message: { hash },
  } as const;
}
