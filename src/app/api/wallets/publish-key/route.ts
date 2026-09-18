import { NextRequest, NextResponse } from "next/server";
import { currentAddress } from "@/lib/session";
import { db } from "@/lib/db/client";
import { wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const encryptionPublicKey = body?.encryptionPublicKey;
  if (typeof encryptionPublicKey !== "string" || encryptionPublicKey.length === 0) {
    return NextResponse.json({ error: "encryptionPublicKey is required." }, { status: 400 });
  }

  // Scoped to the signed-in session's own address — a wallet can only ever
  // publish its own public key, never overwrite someone else's.
  await db
    .update(wallets)
    .set({ encryptionPublicKey })
    .where(eq(wallets.address, address));

  return NextResponse.json({ ok: true });
}
