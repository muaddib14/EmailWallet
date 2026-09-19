import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { recoverMessageAddress, isAddress } from "viem";
import { SESSION_MESSAGE } from "@/lib/authMessages";
import { consumeLoginNonce, createSession, deleteSession } from "@/lib/db/queries";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const SESSION_COOKIE = "wm_session";
const SESSION_TTL_SECONDS = 24 * 60 * 60;

export async function POST(request: NextRequest) {
  if (!checkRateLimit(`session:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const address = body?.address;
  const signature = body?.signature;
  const nonce = body?.nonce;

  if (
    typeof address !== "string" ||
    !isAddress(address) ||
    typeof signature !== "string" ||
    typeof nonce !== "string"
  ) {
    return NextResponse.json({ error: "address, signature, and nonce are required." }, { status: 400 });
  }

  let recovered: string;
  try {
    recovered = await recoverMessageAddress({
      message: SESSION_MESSAGE(address, nonce),
      signature: signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ error: "Malformed signature." }, { status: 400 });
  }

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Signature does not match the given address." }, { status: 401 });
  }

  // Consumed only after the signature checks out, so a garbage request can't
  // burn someone else's nonce. Atomic delete-and-check, so this also closes
  // the race where two requests both see the nonce as "still valid."
  const nonceOk = await consumeLoginNonce(nonce);
  if (!nonceOk) {
    return NextResponse.json(
      { error: "This login link has expired or was already used. Request a new one and sign again." },
      { status: 401 }
    );
  }

  const session = await createSession(address.toLowerCase(), signature);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return NextResponse.json({ address: address.toLowerCase(), expiresAt: session.expiresAt });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await deleteSession(sessionId);
    cookieStore.delete(SESSION_COOKIE);
  }
  return NextResponse.json({ ok: true });
}
