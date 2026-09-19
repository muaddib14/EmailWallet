import { NextRequest, NextResponse } from "next/server";
import { currentAddress } from "@/lib/session";
import { db } from "@/lib/db/client";
import { wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

// A NaCl box public key is 32 bytes, 44 base64 characters. Generous upper
// bound catches garbage without hardcoding an exact length.
const MAX_PUBLIC_KEY_LENGTH = 128;

export async function POST(request: NextRequest) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!checkRateLimit(`publish-key:${address}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const encryptionPublicKey = body?.encryptionPublicKey;
  if (
    typeof encryptionPublicKey !== "string" ||
    encryptionPublicKey.length === 0 ||
    encryptionPublicKey.length > MAX_PUBLIC_KEY_LENGTH
  ) {
    return NextResponse.json({ error: "encryptionPublicKey is required and must be a valid key." }, { status: 400 });
  }

  // Scoped to the signed-in session's own address — a wallet can only ever
  // publish its own public key, never overwrite someone else's.
  await db
    .update(wallets)
    .set({ encryptionPublicKey })
    .where(eq(wallets.address, address));

  return NextResponse.json({ ok: true });
}
