import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// Public proof endpoint — NO auth. Returns only what anyone needs to check
// authorship client-side: who claims to have sent it, the signed hash, and
// the signature. Deliberately EXCLUDES toAddress (would leak the social
// graph), both ciphertexts (would leak the encrypted content itself), and
// threadId (would leak conversation structure). IDs are unguessable UUIDs
// and the route is IP rate-limited against enumeration.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!checkRateLimit(`verify:${clientIp(_request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  if (typeof id !== "string" || id.length > 64) {
    return NextResponse.json({ error: "Invalid proof id." }, { status: 400 });
  }

  const [row] = await db
    .select({
      fromAddress: messages.fromAddress,
      messageHash: messages.messageHash,
      senderSignature: messages.senderSignature,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Proof not found." }, { status: 404 });
  }

  return NextResponse.json(row);
}
