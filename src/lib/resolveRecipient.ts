import { isAddress } from "viem";

export type ResolvedRecipient = {
  address: string;
  encryptionPublicKey: string;
};

/**
 * Resolves a "0x..." address to its published encryption key. Anything else
 * (a typed alias like "Mom") must already have been normalized to an address
 * by the caller via the local address book — there is no global name
 * registry by design (privacy-first: no enumerable name -> address map).
 */
export async function resolveRecipient(input: string): Promise<ResolvedRecipient> {
  const trimmed = input.trim();

  if (!isAddress(trimmed)) {
    throw new Error("Unknown recipient — use a 0x address or pick a saved alias.");
  }
  const res = await fetch(`/api/wallets/${trimmed}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not find that wallet.");
  }
  const data = await res.json();
  return { address: data.address, encryptionPublicKey: data.encryptionPublicKey };
}
