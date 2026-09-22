"use client";

import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from "tweetnacl-util";
import { publicKeyFromBase64 } from "@/lib/crypto";

export type AttachmentMeta = {
  id: string;
  messageId: string;
  blobUrl: string;
  sizeBytes: string;
  mime: string;
  filenameCt: string;
  filenameNonce: string;
  wrappedKey: string;
  wrapNonce: string;
};

export type EncryptedAttachment = {
  cipherBytes: Uint8Array;
  filenameCt: string;
  filenameNonce: string;
  wrappedKey: string;
  wrapNonce: string;
};

/**
 * File envelope: a random 32-byte file key seals the bytes (secretbox) and
 * the filename; the file key itself is NaCl-boxed so BOTH sides can unwrap it
 * with their own secret key (Diffie-Hellman symmetry — one wrapped copy
 * serves sender and recipient). urls, sizes, and mimes stay visible to the
 * server; everything else is opaque.
 */
export function encryptAttachment(
  fileBytes: Uint8Array,
  filename: string,
  recipientPublicKeyB64: string,
  senderSecretKey: Uint8Array
): EncryptedAttachment {
  const fileKey = nacl.randomBytes(nacl.secretbox.keyLength);
  const fileNonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const cipherBytes = nacl.secretbox(fileBytes, fileNonce, fileKey);

  const nameNonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const filenameCt = nacl.secretbox(decodeUTF8(filename), nameNonce, fileKey);

  const wrapNonce = nacl.randomBytes(nacl.box.nonceLength);
  const wrappedKey = nacl.box(
    fileKey,
    wrapNonce,
    publicKeyFromBase64(recipientPublicKeyB64),
    senderSecretKey
  );

  // Nonces ride alongside (base64) — only the key material is secret.
  const combined = new Uint8Array(fileNonce.length + cipherBytes.length);
  combined.set(fileNonce);
  combined.set(cipherBytes, fileNonce.length);

  return {
    cipherBytes: combined,
    filenameCt: encodeBase64(filenameCt),
    filenameNonce: encodeBase64(nameNonce),
    wrappedKey: encodeBase64(wrappedKey),
    wrapNonce: encodeBase64(wrapNonce),
  };
}

/** Unwraps the file key using this side's secret key + the other side's public key. */
export function unwrapFileKey(
  meta: Pick<AttachmentMeta, "wrappedKey" | "wrapNonce">,
  counterpartyPublicKeyB64: string,
  ownSecretKey: Uint8Array
): Uint8Array | null {
  try {
    const opened = nacl.box.open(
      decodeBase64(meta.wrappedKey),
      decodeBase64(meta.wrapNonce),
      publicKeyFromBase64(counterpartyPublicKeyB64),
      ownSecretKey
    );
    return opened ?? null;
  } catch {
    return null;
  }
}

export function decryptAttachmentName(
  meta: Pick<AttachmentMeta, "filenameCt" | "filenameNonce">,
  fileKey: Uint8Array
): string {
  try {
    const opened = nacl.secretbox.open(
      decodeBase64(meta.filenameCt),
      decodeBase64(meta.filenameNonce),
      fileKey
    );
    return opened ? encodeUTF8(opened) : "attachment";
  } catch {
    return "attachment";
  }
}

export function decryptAttachmentBytes(
  combined: Uint8Array,
  fileKey: Uint8Array
): Uint8Array | null {
  try {
    const nonce = combined.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = combined.slice(nacl.secretbox.nonceLength);
    return nacl.secretbox.open(ciphertext, nonce, fileKey);
  } catch {
    return null;
  }
}

/** Copies bytes into a fresh exact ArrayBuffer (narrowing-safe for BlobPart). */
export function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer;
}
