import { NextResponse } from "next/server";
import { createLoginNonce } from "@/lib/db/queries";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export async function GET(request: Request) {
  if (!checkRateLimit(`nonce:${clientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { nonce, expiresAt } = await createLoginNonce();
  return NextResponse.json({ nonce, expiresAt });
}
