import "server-only";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { db } from "@/lib/db/client";
import { wallets } from "@/lib/db/schema";
import { ENCRYPTION_MESSAGE } from "@/lib/authMessages";
import { deriveKeyPair, encryptFor, hashPlaintext, publicKeyToBase64, type BoxKeyPair } from "@/lib/crypto";
import { insertMessage } from "@/lib/db/queries";

/**
 * "Wallet Mail Team" — the app's own wallet, used only to send official
 * mail (welcome message on first login, future system notices). It goes
 * through the exact same signing + encryption + storage path as any user's
 * message, so it shows up with a real, verifiable signature — not a
 * server-side special case that bypasses the trust model.
 */

type SystemWallet = { account: PrivateKeyAccount; keyPair: BoxKeyPair; publicKeyB64: string };

let cached: SystemWallet | null = null;
let readyPromise: Promise<SystemWallet | null> | null = null;

async function getSystemWallet() {
  if (cached) return cached;
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    const privateKey = process.env.SYSTEM_WALLET_PRIVATE_KEY;
    if (!privateKey) return null;

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const address = account.address.toLowerCase();

    // The system's own encryption key is derived the same way a user's is —
    // by signing ENCRYPTION_MESSAGE with its private key — so it's consistent
    // with the rest of the security model, just done with a server-held key
    // instead of a browser wallet prompt.
    const encryptionSignature = await account.signMessage({ message: ENCRYPTION_MESSAGE(address) });
    const keyPair = deriveKeyPair(encryptionSignature);
    const publicKeyB64 = publicKeyToBase64(keyPair.publicKey);

    await db
      .insert(wallets)
      .values({ address, encryptionPublicKey: publicKeyB64 })
      .onConflictDoUpdate({ target: wallets.address, set: { encryptionPublicKey: publicKeyB64 } });

    cached = { account, keyPair, publicKeyB64 };
    return cached;
  })();

  return readyPromise;
}

const WELCOME_MESSAGES = [
  {
    subject: "Welcome to Wallet Mail",
    body: "This is your first message — and proof the whole system works. It was signed by our wallet and encrypted for yours before it ever touched our database. We can't read it, and neither can anyone else but you.",
  },
  {
    subject: "How your inbox actually works",
    body: "Every message you send is signed with your wallet and encrypted in your browser before it leaves. Star, archive, and trash are private to you too — the other side of a conversation never sees your organizing. Nothing here depends on a password, because there isn't one.",
  },
  {
    subject: "Naming is coming",
    body: "Right now people have to send mail to your full 0x address. A short, human-readable name for your wallet is on the way — we'll let you know the moment it's ready to claim.",
  },
];

/** Sends the onboarding messages to a newly-signed-up wallet. Best-effort — never blocks sign-up. */
export async function sendWelcomeMessages(toAddress: string, toPublicKeyB64: string) {
  try {
    const system = await getSystemWallet();
    if (!system) {
      console.warn("[systemWallet] SYSTEM_WALLET_PRIVATE_KEY not set — skipping welcome mail.");
      return;
    }

    for (const { subject, body } of WELCOME_MESSAGES) {
      const subjectCiphertext = encryptFor(toPublicKeyB64, system.keyPair.secretKey, subject);
      const bodyCiphertext = encryptFor(toPublicKeyB64, system.keyPair.secretKey, body);
      const messageHash = hashPlaintext(subject, body);
      const senderSignature = await system.account.signMessage({ message: { raw: messageHash } });

      await insertMessage({
        fromAddress: system.account.address.toLowerCase(),
        toAddress,
        subjectCiphertext,
        bodyCiphertext,
        messageHash,
        senderSignature,
      });
    }
  } catch (err) {
    console.error("[systemWallet] Failed to send welcome messages:", err);
  }
}
