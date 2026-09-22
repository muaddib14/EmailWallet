import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isAddress, isHash, pad } from "viem";
import { currentAddress } from "@/lib/session";
import {
  getMessageById,
  insertPaymentReceipt,
  isTxHashUsed,
} from "@/lib/db/queries";
import { robinhoodChainTestnet } from "@/lib/wagmi";
import { TRANSFER_TOPIC } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rateLimit";

// Records an on-chain payment for a payment-request message — testnet only.
// Two paths, one trust split:
// - native: exact native transfer straight to the requester.
// - erc20: Transfer log(s) from payer to requester on the given token.
// The server verifies hard on-chain facts (real tx, right parties, success,
// value observed, hash never reused) and stores the OBSERVED value + token.
// It never sees the expected amount (encrypted in the message body); the
// client compares observed vs expected to show full vs partial payment.
export async function POST(request: NextRequest) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!checkRateLimit(`pay:${address}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const { messageId, txHash, tokenAddress } = body ?? {};
  if (typeof messageId !== "string" || typeof txHash !== "string" || !isHash(txHash)) {
    return NextResponse.json({ error: "messageId and a valid txHash are required." }, { status: 400 });
  }
  if (tokenAddress !== undefined && (typeof tokenAddress !== "string" || !isAddress(tokenAddress))) {
    return NextResponse.json({ error: "tokenAddress must be a valid address." }, { status: 400 });
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
  if (tx.from.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Transaction was not sent by you." }, { status: 422 });
  }

  let observedValue: bigint;
  let observedToken: string | null = null;

  if (tokenAddress) {
    // ERC-20 path: sum Transfer events from payer to requester on that token.
    // Approve-only or unrelated txs produce no matching log and are rejected.
    const token = tokenAddress.toLowerCase();
    const fromPad = pad(address as `0x${string}`, { size: 32 });
    const toPad = pad(message.fromAddress as `0x${string}`, { size: 32 });
    let sum = BigInt(0);
    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() === token &&
        log.topics[0]?.toLowerCase() === TRANSFER_TOPIC.toLowerCase() &&
        log.topics[1]?.toLowerCase() === fromPad.toLowerCase() &&
        log.topics[2]?.toLowerCase() === toPad.toLowerCase()
      ) {
        try {
          sum += BigInt(log.data);
        } catch {
          // Malformed log data — ignore this log, not the whole receipt.
        }
      }
    }
    if (sum <= BigInt(0)) {
      return NextResponse.json(
        { error: "No token transfer from you to the requester in this transaction." },
        { status: 422 }
      );
    }
    observedValue = sum;
    observedToken = token;
  } else {
    // Native path: direct transfer straight to the requester. Contract calls
    // (tx.to = contract) and wrong recipients are rejected.
    if (!tx.to || tx.to.toLowerCase() !== message.fromAddress.toLowerCase()) {
      return NextResponse.json({ error: "Transaction was not sent to the requester." }, { status: 422 });
    }
    if (tx.value <= BigInt(0)) {
      return NextResponse.json({ error: "Transaction carries no value." }, { status: 422 });
    }
    observedValue = tx.value;
  }

  try {
    await insertPaymentReceipt(messageId, txHash, observedValue.toString(), observedToken);
  } catch {
    // Lost a race with another claim of the same hash — unique index wins.
    return NextResponse.json({ error: "This transaction was already claimed." }, { status: 409 });
  }

  return NextResponse.json(
    { ok: true, txHash: txHash.toLowerCase(), valueBaseUnits: observedValue.toString(), tokenAddress: observedToken },
    { status: 201 }
  );
}
