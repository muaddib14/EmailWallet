import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, decodeUTF8, encodeUTF8 } from "tweetnacl-util";
import { keccak256, toBytes } from "viem";

/**
 * Real end-to-end encryption using curve25519-xsalsa20-poly1305 (the same
 * primitive MetaMask used for its old eth_getEncryptionPublicKey/encrypt
 * flow). The wallet signature never leaves the browser as a "key" — it's
 * hashed once to seed a proper NaCl keypair, and only the *public* half of
 * that keypair is ever sent to the server (so others can encrypt to it).
 *
 * Box encryption gives both sides the same shared secret via Diffie-Hellman
 * (box(pubkey_them, seckey_me) === box(pubkey_me, seckey_them)), so a sender
 * can also decrypt their own sent messages using the recipient's public key.
 */

export type BoxKeyPair = nacl.BoxKeyPair;

/** Deterministically derives a NaCl box keypair from the wallet's encryption signature. */
export function deriveKeyPair(encryptionSignature: string): BoxKeyPair {
  const seed = keccak256(toBytes(encryptionSignature));
  const seedBytes = toBytes(seed).slice(0, nacl.box.secretKeyLength);
  return nacl.box.keyPair.fromSecretKey(seedBytes);
}

export function publicKeyToBase64(publicKey: Uint8Array): string {
  return encodeBase64(publicKey);
}

export function publicKeyFromBase64(b64: string): Uint8Array {
  return decodeBase64(b64);
}

/** Encrypts `plaintext` so only `theirPublicKey` + the matching secret key can read it. */
export function encryptFor(
  theirPublicKeyB64: string,
  mySecretKey: Uint8Array,
  plaintext: string
): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const theirPublicKey = publicKeyFromBase64(theirPublicKeyB64);
  const messageBytes = decodeUTF8(plaintext);
  const ciphertext = nacl.box(messageBytes, nonce, theirPublicKey, mySecretKey);

  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);
  return encodeBase64(combined);
}

/** Decrypts a blob produced by encryptFor. Returns null if it can't be opened. */
export function decryptFrom(
  theirPublicKeyB64: string,
  mySecretKey: Uint8Array,
  blobB64: string
): string | null {
  try {
    const combined = decodeBase64(blobB64);
    const nonce = combined.slice(0, nacl.box.nonceLength);
    const ciphertext = combined.slice(nacl.box.nonceLength);
    const theirPublicKey = publicKeyFromBase64(theirPublicKeyB64);
    const opened = nacl.box.open(ciphertext, nonce, theirPublicKey, mySecretKey);
    return opened ? encodeUTF8(opened) : null;
  } catch {
    return null;
  }
}

/** Hash of the plaintext subject+body, used as the thing the sender's wallet signs. */
export function hashPlaintext(subject: string, body: string): `0x${string}` {
  return keccak256(toBytes(`${subject}\n\n${body}`));
}
