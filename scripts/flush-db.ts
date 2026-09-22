/**
 * DANGER: wipes ALL app data (wallets, messages, flags, labels, receipts,
 * attachments, drafts, sessions, nonces). Used to reset an environment to a
 * clean launch state. Requires BOTH guards or it refuses to run:
 *   CONFIRM_FLUSH=yes npx tsx scripts/flush-db.ts --confirm
 * Back up first (Neon: Branches -> Create branch, one click, free).
 */
import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

const KNOWN_TABLES = [
  "attachments",
  "drafts",
  "message_labels",
  "labels",
  "payment_receipts",
  "message_flags",
  "messages",
  "login_nonces",
  "sessions",
  "names", // dropped in 0008 — only present on stale databases
  "wallets",
];

async function main() {
  if (process.argv[2] !== "--confirm" || process.env.CONFIRM_FLUSH !== "yes") {
    console.error("Refusing to run without BOTH guards:");
    console.error("  CONFIRM_FLUSH=yes npx tsx scripts/flush-db.ts --confirm");
    process.exit(2);
  }

  const existing = await db.execute(
    sql`select tablename from pg_tables where schemaname = 'public'`
  );
  const present = (existing.rows as { tablename: string }[])
    .map((r) => r.tablename)
    .filter((t) => KNOWN_TABLES.includes(t));

  if (present.length === 0) {
    console.log("Nothing to flush.");
    return;
  }

  await db.execute(sql.raw(`TRUNCATE ${present.map((t) => `"${t}"`).join(", ")} CASCADE`));
  console.log(`Flushed: ${present.join(", ")}`);

  // neon-http returns rows differently for raw strings vs sql templates —
  // handle both shapes.
  const rawResult = (await db.execute(
    sql`select count(*)::int as n from wallets`
  )) as unknown as { rows?: { n: number }[] } | { n: number }[];
  const rows = Array.isArray(rawResult) ? rawResult : (rawResult.rows ?? []);
  console.log(`wallets now: ${rows[0]?.n ?? "?"}`);
  const msgs = (await db.execute(sql`select count(*)::int as n from messages`)) as unknown as
    | { rows?: { n: number }[] }
    | { n: number }[];
  const msgRows = Array.isArray(msgs) ? msgs : (msgs.rows ?? []);
  console.log(`messages now: ${msgRows[0]?.n ?? "?"}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("FLUSH FAILED:", err);
    process.exit(1);
  }
);
