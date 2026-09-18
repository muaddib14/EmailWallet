import { NextRequest, NextResponse } from "next/server";
import { isAddress, recoverMessageAddress } from "viem";
import { currentAddress } from "@/lib/session";
import { insertMessage, listMessagesForAddress } from "@/lib/db/queries";

export async function GET() {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rows = await listMessagesForAddress(address);
  return NextResponse.json({ messages: rows });
}

export async function POST(request: NextRequest) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { toAddress, subjectCiphertext, bodyCiphertext, messageHash, senderSignature, threadId } =
    body ?? {};

  if (
    typeof toAddress !== "string" ||
    !isAddress(toAddress) ||
    typeof subjectCiphertext !== "string" ||
    typeof bodyCiphertext !== "string" ||
    typeof messageHash !== "string" ||
    typeof senderSignature !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  // The sender signs messageHash client-side (a hash of the plaintext) before
  // encrypting it. Verifying it here, against the session's own address, is
  // what lets a public proof link later show "this really came from X"
  // without ever decrypting the body.
  let recovered: string;
  try {
    recovered = await recoverMessageAddress({
      message: { raw: messageHash as `0x${string}` },
      signature: senderSignature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ error: "Malformed sender signature." }, { status: 400 });
  }

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json(
      { error: "senderSignature does not match the signed-in wallet." },
      { status: 401 }
    );
  }

  const id = await insertMessage({
    fromAddress: address,
    toAddress: toAddress.toLowerCase(),
    subjectCiphertext,
    bodyCiphertext,
    messageHash,
    senderSignature,
    threadId,
  });

  return NextResponse.json({ id }, { status: 201 });
}
