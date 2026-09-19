import { randomUUID, randomBytes } from "crypto";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "./client";
import { drafts, loginNonces, messageFlags, messages, names, sessions, wallets } from "./schema";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const NONCE_TTL_MS = 5 * 60 * 1000; // signing prompt should take seconds, not minutes
const MAX_CIPHERTEXT_LENGTH = 20_000; // ~20KB per field; plenty for mail, bounds storage abuse

export async function upsertWallet(address: string) {
  await db.insert(wallets).values({ address }).onConflictDoNothing({ target: wallets.address });
}

/** Issues a one-time nonce for SESSION_MESSAGE. Also sweeps expired nonces so the table doesn't grow forever. */
export async function createLoginNonce() {
  await db.delete(loginNonces).where(lt(loginNonces.expiresAt, new Date()));

  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  await db.insert(loginNonces).values({ nonce, expiresAt });
  return { nonce, expiresAt };
}

/** Atomically checks-and-consumes a nonce. Returns false if it never existed, already got used, or expired. */
export async function consumeLoginNonce(nonce: string): Promise<boolean> {
  const deleted = await db
    .delete(loginNonces)
    .where(eq(loginNonces.nonce, nonce))
    .returning({ expiresAt: loginNonces.expiresAt });

  const row = deleted[0];
  if (!row) return false;
  return row.expiresAt.getTime() >= Date.now();
}

export async function createSession(address: string, signature: string) {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await upsertWallet(address);
  await db.insert(sessions).values({
    id,
    address,
    sessionSignature: signature,
    expiresAt,
  });
  return { id, expiresAt };
}

export async function getSession(sessionId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  return session;
}

export async function deleteSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function resolveName(name: string) {
  const [row] = await db.select().from(names).where(eq(names.id, name)).limit(1);
  if (!row) return null;
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.address, row.ownerAddress))
    .limit(1);
  return { ...row, encryptionPublicKey: wallet?.encryptionPublicKey ?? null };
}

/** Every message this address can currently see, with THEIR OWN flags joined in. */
export async function listMessagesForAddress(address: string) {
  return db
    .select({
      id: messages.id,
      fromAddress: messages.fromAddress,
      toAddress: messages.toAddress,
      subjectCiphertext: messages.subjectCiphertext,
      bodyCiphertext: messages.bodyCiphertext,
      threadId: messages.threadId,
      createdAt: messages.createdAt,
      isRead: messageFlags.isRead,
      isStarred: messageFlags.isStarred,
      isArchived: messageFlags.isArchived,
      isDeleted: messageFlags.isDeleted,
    })
    .from(messageFlags)
    .innerJoin(messages, eq(messages.id, messageFlags.messageId))
    .where(eq(messageFlags.address, address))
    .orderBy(desc(messages.createdAt));
}

export function assertCiphertextSize(value: string, field: string) {
  if (value.length > MAX_CIPHERTEXT_LENGTH) {
    throw new Error(`${field} is too large (max ${MAX_CIPHERTEXT_LENGTH} characters).`);
  }
}

export type NewMessageInput = {
  fromAddress: string;
  toAddress: string;
  subjectCiphertext: string;
  bodyCiphertext: string;
  messageHash: string;
  senderSignature: string;
  threadId?: string;
};

export async function insertMessage(input: NewMessageInput) {
  assertCiphertextSize(input.subjectCiphertext, "subjectCiphertext");
  assertCiphertextSize(input.bodyCiphertext, "bodyCiphertext");

  const id = randomUUID();
  await upsertWallet(input.fromAddress);
  await upsertWallet(input.toAddress);
  await db.insert(messages).values({ id, ...input });

  // Flag rows for both sides, created up front so every later query can rely
  // on an inner join instead of juggling "what if this side has no row yet."
  await db.insert(messageFlags).values([
    { messageId: id, address: input.fromAddress, isRead: true }, // you obviously "read" what you just sent
    { messageId: id, address: input.toAddress, isRead: false },
  ]);

  return id;
}

export async function markMessage(
  id: string,
  address: string,
  patch: Partial<{ isRead: boolean; isStarred: boolean; isArchived: boolean; isDeleted: boolean }>
) {
  const withDeletedAt =
    "isDeleted" in patch ? { ...patch, deletedAt: patch.isDeleted ? new Date() : null } : patch;

  await db
    .update(messageFlags)
    .set(withDeletedAt)
    .where(and(eq(messageFlags.messageId, id), eq(messageFlags.address, address)));
}

/** Permanently removes a message from just this viewer's mailbox (Trash -> Delete forever). */
export async function purgeMessageForAddress(id: string, address: string) {
  await db
    .delete(messageFlags)
    .where(
      and(
        eq(messageFlags.messageId, id),
        eq(messageFlags.address, address),
        eq(messageFlags.isDeleted, true) // only ever purge from Trash, never an active message
      )
    );
}

// --- Drafts ---
// Encrypted to the owner's OWN public key (not a recipient's — there may not
// be a valid one yet), so the server never sees plaintext even for unsent mail.

export type DraftInput = {
  ownerAddress: string;
  toRaw: string;
  subjectCiphertext: string;
  bodyCiphertext: string;
};

export async function listDraftsForAddress(address: string) {
  return db
    .select()
    .from(drafts)
    .where(eq(drafts.ownerAddress, address))
    .orderBy(desc(drafts.updatedAt));
}

export async function upsertDraft(id: string | undefined, input: DraftInput) {
  assertCiphertextSize(input.subjectCiphertext, "subjectCiphertext");
  assertCiphertextSize(input.bodyCiphertext, "bodyCiphertext");

  if (id) {
    const [existing] = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1);
    if (existing && existing.ownerAddress === input.ownerAddress) {
      await db
        .update(drafts)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(drafts.id, id));
      return id;
    }
  }

  const newId = randomUUID();
  await upsertWallet(input.ownerAddress);
  await db.insert(drafts).values({ id: newId, ...input });
  return newId;
}

export async function deleteDraft(id: string, ownerAddress: string) {
  await db.delete(drafts).where(and(eq(drafts.id, id), eq(drafts.ownerAddress, ownerAddress)));
}
