import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isHash } from "viem";
import { currentAddress } from "@/lib/session";
import {
  getMessageById,
  insertPaymentReceipt,
  isTxHashUsed,
} from "@/lib/db/queries";
import { robinhoodChainTestnet } from "@/lib/wagmi";
import { checkRateLimit } from "@/lib/rateLimit";

// Records an on-chain payment for a payment-request message — testnet only,
// native currency only. The server verifies hard on-chain facts (real tx,
// right parties, successful receipt, exact native value, hash never reused)
// and stores the OBSERVED value. It never sees the expected amount (that
// lives encrypted in the message body); the client compares observed vs
// expected to show full vs partial payment.
export async function POST(request: NextRequest) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!checkRateLimit(`pay:${address}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const { messageId, txHash } = body ?? {};
  if (typeof messageId !== "string" || typeof txHash !== "string" || !isHash(txHash)) {
    return NextResponse.json({ error: "messageId and a valid txHash are required." }, { status: 400 });
  }

  const message = await getMessageById(messageId);
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  // Only the intended payer (the request's recipient) can submit proof, and
  // self-payments are meaningless.
  if (message.toAddress.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Only the requested wallet can submit payment." }, { status: 403 });
  }
  if (message.fromAddress.toLowerCase() === message.toAddress.toLowerCase()) {
    return NextResponse.json({ error: "Cannot pay yourself." }, { status: 400 });
  }
  if (await isTxHashUsed(txHash)) {
    return NextResponse.json({ error: "This transaction was already claimed." }, { status: 409 });
  }

  const client = createPublicClient({
    chain: robinhoodChainTestnet,
    transport: http(),
  });

  let tx;
  try {
    tx = await client.getTransaction({ hash: txHash });
  } catch {
    return NextResponse.json({ error: "Transaction not found on Robinhood Chain Testnet." }, { status: 422 });
  }
  const receipt = await client.getTransactionReceipt({ hash: txHash }).catch(() => null);
  if (!receipt || receipt.status !== "success") {
    return NextResponse.json({ error: "Transaction is not confirmed successful." }, { status: 422 });
  }
  // Native transfer straight to the requester — contract calls (tx.to =
  // contract) and wrong recipients are rejected. Amount is NOT checked here
  // (see header comment); the observed value is stored for the client.
  if (!tx.to || tx.to.toLowerCase() !== message.fromAddress.toLowerCase()) {
    return NextResponse.json({ error: "Transaction was not sent to the requester." }, { status: 422 });
  }
  if (tx.from.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Transaction was not sent by you." }, { status: 422 });
  }
  if (tx.value <= BigInt(0)) {
    return NextResponse.json({ error: "Transaction carries no value." }, { status: 422 });
  }

  try {
    await insertPaymentReceipt(messageId, txHash, tx.value.toString());
  } catch {
    // Lost a race with another claim of the same hash — unique index wins.
    return NextResponse.json({ error: "This transaction was already claimed." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, txHash: txHash.toLowerCase(), valueWei: tx.value.toString() }, { status: 201 });
}
