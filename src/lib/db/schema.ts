import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

// A wallet is the account itself — no email, no password. Row is created the
// first time an address completes the two-signature auth flow.
export const wallets = pgTable("wallets", {
  address: text("address").primaryKey(), // lowercased 0x... address
  encryptionPublicKey: text("encryption_public_key"), // derived client-side, published here for senders to encrypt to
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Human-readable names (".mail" style), minted as NFTs on-chain. This table is
// a fast-read cache of on-chain ownership, not the source of truth — the NFT
// contract is. Kept here so the inbox can resolve "maya.mail" -> address without
// an RPC round trip on every compose.
export const names = pgTable(
  "names",
  {
    id: text("id").primaryKey(), // e.g. "maya.mail"
    ownerAddress: text("owner_address")
      .notNull()
      .references(() => wallets.address, { onDelete: "cascade" }),
    tokenId: text("token_id"), // ERC-721 token id once minted on-chain
    mintTxHash: text("mint_tx_hash"),
    mintedAt: timestamp("minted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("names_owner_idx").on(table.ownerAddress)]
);

// Messages store ciphertext only. subjectCiphertext/bodyCiphertext are opaque
// blobs encrypted client-side with a key derived from the recipient's wallet
// signature — this server can never read them. senderSignature is what a
// public verifier checks against messageHash to prove authorship.
export const messages = pgTable("messages", {
  id: text("id").primaryKey(), // uuid, generated client- or server-side
  fromAddress: text("from_address")
    .notNull()
    .references(() => wallets.address),
  toAddress: text("to_address")
    .notNull()
    .references(() => wallets.address),
  subjectCiphertext: text("subject_ciphertext").notNull(),
  bodyCiphertext: text("body_ciphertext").notNull(),
  messageHash: text("message_hash").notNull(), // hash of the plaintext, signed by sender
  senderSignature: text("sender_signature").notNull(), // personal_sign over messageHash
  threadId: text("thread_id"), // groups replies; null/self for a new thread
  isRead: boolean("is_read").default(false).notNull(),
  isStarred: boolean("is_starred").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// A session is just a record that a session-signature was issued and hasn't
// expired — there's no password to check, so this table is the entire auth
// state. Verify the signature again at read time if you need non-repudiation;
// this row is for cheap "is this still a valid 24h session" checks.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // uuid
  address: text("address")
    .notNull()
    .references(() => wallets.address),
  sessionSignature: text("session_signature").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
