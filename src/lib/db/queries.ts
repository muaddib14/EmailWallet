import { randomUUID, randomBytes } from "crypto";
import { and, desc, eq, lt, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./client";
import { drafts, loginNonces, messageFlags, messageLabels, messages, labels, paymentReceipts, sessions, wallets, attachments } from "./schema";

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

/** Every message this address can currently see, with THEIR OWN flags joined in,
 * plus the OTHER side's read state (null for self-sends) so senders get read
 * receipts without a second query, plus any on-chain payment proof. */
export async function listMessagesForAddress(address: string) {
  const otherFlags = alias(messageFlags, "other_flags");
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
      readByRecipient: otherFlags.isRead,
      readAt: otherFlags.readAt,
      paidTxHash: paymentReceipts.txHash,
      paidAmountWei: paymentReceipts.amountWei,
      paidTokenAddress: paymentReceipts.tokenAddress,
    })
    .from(messageFlags)
    .innerJoin(messages, eq(messages.id, messageFlags.messageId))
    .leftJoin(
      otherFlags,
      and(eq(otherFlags.messageId, messages.id), ne(otherFlags.address, messageFlags.address))
    )
    .leftJoin(paymentReceipts, eq(paymentReceipts.messageId, messages.id))
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
  // A message to yourself has fromAddress === toAddress, so that's only ONE
  // row here — (messageId, address) is a unique key, and inserting it twice
  // for the same address in the same statement violates that constraint.
  const isSelfSend = input.fromAddress.toLowerCase() === input.toAddress.toLowerCase();
  const flagRows = isSelfSend
    ? [{ messageId: id, address: input.fromAddress, isRead: true }]
    : [
        { messageId: id, address: input.fromAddress, isRead: true }, // you obviously "read" what you just sent
        { messageId: id, address: input.toAddress, isRead: false },
      ];

  try {
    await db.insert(messageFlags).values(flagRows);
  } catch (err) {
    // A message row without flag rows is invisible everywhere (list queries
    // inner-join flags) yet undeletable — worse than failing outright. Roll
    // the message back so a flags failure surfaces as a send error instead
    // of a ghost message. (Real case seen 2026-09-21: one such orphan.)
    await db.delete(messages).where(eq(messages.id, id)).catch(() => {});
    throw err;
  }

  return id;
}

export async function markMessage(
  id: string,
  address: string,
  patch: Partial<{ isRead: boolean; isStarred: boolean; isArchived: boolean; isDeleted: boolean }>
) {
  const withTimestamps: Record<string, boolean | Date | null> = { ...patch };
  if ("isDeleted" in patch) withTimestamps.deletedAt = patch.isDeleted ? new Date() : null;
  // First open stamps readAt (drives the sender's read receipt); marking
  // unread clears it again so a re-read gets a fresh timestamp.
  if ("isRead" in patch) withTimestamps.readAt = patch.isRead ? new Date() : null;

  await db
    .update(messageFlags)
    .set(withTimestamps)
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

// --- Payment receipts ---
// A tx hash is public on-chain data, so no privacy is lost storing it. One
// receipt per request message, one request per tx hash — both enforced by
// unique indexes, which is what stops a single payment being claimed twice.

export async function getMessageById(id: string) {
  const [row] = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  return row ?? null;
}

export async function isTxHashUsed(txHash: string) {
  const [row] = await db
    .select({ id: paymentReceipts.id })
    .from(paymentReceipts)
    .where(eq(paymentReceipts.txHash, txHash.toLowerCase()))
    .limit(1);
  return !!row;
}

export async function insertPaymentReceipt(
  messageId: string,
  txHash: string,
  amountBaseUnits: string,
  tokenAddress: string | null
) {
  const id = randomUUID();
  await db.insert(paymentReceipts).values({
    id,
    messageId,
    txHash: txHash.toLowerCase(),
    amountWei: amountBaseUnits,
    tokenAddress: tokenAddress ? tokenAddress.toLowerCase() : null,
  });
  return id;
}

// --- Labels ---

export const LABEL_COLORS = [
  "green",
  "blue",
  "amber",
  "red",
  "violet",
  "neutral",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export function isLabelColor(value: unknown): value is LabelColor {
  return typeof value === "string" && (LABEL_COLORS as readonly string[]).includes(value);
}

export async function listLabelsForAddress(address: string) {
  return db.select().from(labels).where(eq(labels.ownerAddress, address)).orderBy(labels.createdAt);
}

export async function listMessageLabelsForAddress(address: string) {
  return db
    .select({ messageId: messageLabels.messageId, labelId: messageLabels.labelId })
    .from(messageLabels)
    .where(eq(messageLabels.address, address));
}

export async function createLabel(address: string, name: string, color: LabelColor) {
  const clean = name.trim().slice(0, 24);
  if (!clean) throw new Error("Label name is required.");
  await upsertWallet(address);
  const id = randomUUID();
  try {
    await db.insert(labels).values({ id, ownerAddress: address, name: clean, color });
  } catch {
    throw new Error("You already have a label with that name.");
  }
  return id;
}

export async function deleteLabel(id: string, address: string) {
  await db.delete(labels).where(and(eq(labels.id, id), eq(labels.ownerAddress, address)));
}

/** Replaces one viewer's label set on a message (message rows untouched). */
export async function setMessageLabels(messageId: string, address: string, labelIds: string[]) {
  // Only the viewer's own labels can be attached — no borrowing someone
  // else's label ids to smuggle rows in.
  const owned =
    labelIds.length === 0
      ? []
      : await db
          .select({ id: labels.id })
          .from(labels)
          .where(and(eq(labels.ownerAddress, address)));
  const ownedIds = new Set(owned.map((l) => l.id));
  const valid = [...new Set(labelIds)].filter((lid) => ownedIds.has(lid));

  await db
    .delete(messageLabels)
    .where(and(eq(messageLabels.messageId, messageId), eq(messageLabels.address, address)));
  if (valid.length > 0) {
    await db
      .insert(messageLabels)
      .values(valid.map((labelId) => ({ messageId, address, labelId })));
  }
}

// --- Attachments ---

export type NewAttachmentInput = {
  messageId: string;
  blobUrl: string;
  sizeBytes: string;
  mime: string;
  filenameCt: string;
  filenameNonce: string;
  wrappedKey: string;
  wrapNonce: string;
};

export async function insertAttachment(input: NewAttachmentInput) {
  const id = randomUUID();
  await db.insert(attachments).values({ id, ...input });
  return id;
}

/** Metadata for messages this viewer can see (flag-row scoped, like everything else). */
export async function listAttachmentsForMessages(messageIds: string[], address: string) {
  if (messageIds.length === 0) return [];
  const rows = await db
    .select({
      id: attachments.id,
      messageId: attachments.messageId,
      blobUrl: attachments.blobUrl,
      sizeBytes: attachments.sizeBytes,
      mime: attachments.mime,
      filenameCt: attachments.filenameCt,
      filenameNonce: attachments.filenameNonce,
      wrappedKey: attachments.wrappedKey,
      wrapNonce: attachments.wrapNonce,
    })
    .from(attachments)
    .innerJoin(
      messageFlags,
      and(
        eq(messageFlags.messageId, attachments.messageId),
        eq(messageFlags.address, address)
      )
    );
  const wanted = new Set(messageIds);
  return rows.filter((r) => wanted.has(r.messageId));
}

// --- Drafts ---
// Encrypted to the owner's OWN public key (not a recipient's — there may not
// be a valid one yet), so the server never sees plaintext even for unsent mail.

export type DraftInput = {
  ownerAddress: string;
  toRaw: string;
  subjectCiphertext: string;
  bodyCiphertext: string;
  threadId?: string | null;
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
  }  const newId = randomUUID();
  await upsertWallet(input.ownerAddress);
  await db.insert(drafts).values({ id: newId, ...input });
  return newId;
}

export async function deleteDraft(id: string, ownerAddress: string) {
  await db.delete(drafts).where(and(eq(drafts.id, id), eq(drafts.ownerAddress, ownerAddress)));
}
