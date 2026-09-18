import { isAddress } from "viem";

export type ResolvedRecipient = {
  address: string;
  encryptionPublicKey: string;
};

/** Resolves a "0x..." address or a ".mail" name to an address + published encryption key. */
export async function resolveRecipient(input: string): Promise<ResolvedRecipient> {
  const trimmed = input.trim();

  if (isAddress(trimmed)) {
    const res = await fetch(`/api/wallets/${trimmed}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not find that wallet.");
    }
    const data = await res.json();
    return { address: data.address, encryptionPublicKey: data.encryptionPublicKey };
  }

  const res = await fetch(`/api/names/${encodeURIComponent(trimmed)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not resolve that name.");
  }
  const data = await res.json();
  if (!data.encryptionPublicKey) {
    throw new Error(`${trimmed} hasn't published an encryption key yet.`);
  }
  return { address: data.address, encryptionPublicKey: data.encryptionPublicKey };
}
