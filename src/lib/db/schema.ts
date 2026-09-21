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
//
// Deliberately holds NO per-viewer state (read/starred/archived/deleted) —
// one message row is shared between sender and recipient, so "archived" or
// "deleted" living here would apply to both sides of a conversation at once.
// That state lives in messageFlags instead, one row per (message, viewer).
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// One row per (message, viewer) — a message has exactly two of these created
// at send time (one for the sender, one for the recipient), so each side's
// read/star/archive/delete state is independent. `listMessagesForAddress`
// inner-joins on this table, so deleting a viewer's own row here removes the
// message from their view without touching the other side's copy.
export const messageFlags = pgTable(
  "message_flags",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    address: text("address")
      .notNull()
      .references(() => wallets.address),
    isRead: boolean("is_read").default(false).notNull(),
    // When this viewer first opened the message (set alongside isRead).
    // The OTHER side's row drives read receipts: a sender sees their mail as
    // "Read <readAt>" by looking at the recipient's flag row, never their own.
    // Null for unread mail and for rows written before this column existed.
    readAt: timestamp("read_at", { withTimezone: true }),
    isStarred: boolean("is_starred").default(false).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("message_flags_pk").on(table.messageId, table.address)]
);

// Drafts are self-encrypted (owner's own public key, not the recipient's —
// the recipient may not even be resolved yet while still typing) so the
// server never sees plaintext even for unsent mail. `toRaw` keeps whatever
// the user typed in "To" verbatim (address or unresolved name) since a
// draft doesn't require a valid recipient to exist yet.
export const drafts = pgTable("drafts", {
  id: text("id").primaryKey(),
  ownerAddress: text("owner_address")
    .notNull()
    .references(() => wallets.address, { onDelete: "cascade" }),
  toRaw: text("to_raw").default("").notNull(),
  subjectCiphertext: text("subject_ciphertext").default("").notNull(),
  bodyCiphertext: text("body_ciphertext").default("").notNull(),
  // Carries the thread through a reply saved as draft and reopened later —
  // without this, sending from a draft would silently start a new thread.
  threadId: text("thread_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// One-time login nonces (SIWE-style). SESSION_MESSAGE embeds one of these, so
// a signature is only ever valid for a single login attempt within a short
// window — without this, the signed message was a fixed string per address,
// meaning a leaked signature (e.g. from the sessionStorage cache, or an XSS)
// could be replayed forever to mint new sessions with no private key needed.
export const loginNonces = pgTable("login_nonces", {
  nonce: text("nonce").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
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
