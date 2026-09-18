import { randomUUID } from "crypto";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "./client";
import { messages, names, sessions, wallets } from "./schema";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export async function upsertWallet(address: string) {
  await db.insert(wallets).values({ address }).onConflictDoNothing({ target: wallets.address });
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

export async function listMessagesForAddress(address: string) {
  return db
    .select()
    .from(messages)
    .where(or(eq(messages.fromAddress, address), eq(messages.toAddress, address)))
    .orderBy(desc(messages.createdAt));
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
  const id = randomUUID();
  await upsertWallet(input.fromAddress);
  await upsertWallet(input.toAddress);
  await db.insert(messages).values({ id, ...input });
  return id;
}

export async function markMessage(
  id: string,
  address: string,
  patch: Partial<{ isRead: boolean; isStarred: boolean; isArchived: boolean }>
) {
  await db
    .update(messages)
    .set(patch)
    .where(and(eq(messages.id, id), eq(messages.toAddress, address)));
}
