"use client";

import { useState } from "react";
import { useChainId, useSendTransaction, useSwitchChain, useWriteContract } from "wagmi";
import { ArrowUpRight, Check, LoaderCircle } from "lucide-react";
import type { DecryptedMessage } from "@/lib/useInboxMessages";
import { ERC20_ABI, formatTokenAmount } from "@/lib/tokens";
import { robinhoodChainTestnet } from "@/lib/wagmi";
import { toast } from "@/components/Toast";

type PayState = "idle" | "switching" | "sending" | "verifying" | "error";

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";

function parsePositiveWei(value: string | null | undefined): bigint | null {
  if (!value) return null;
  try {
    const parsed = BigInt(value);
    return parsed > BigInt(0) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Renders a payment-request message: amount card with Pay (payer side),
 * waiting/paid states (requester side), and the on-chain receipt link.
 * Native tETH and any ERC-20 share this card — the envelope carries the
 * token contract + decimals. Testnet only — no real money moves.
 */
export function PaymentCard({
  message,
  onPaid,
}: {
  message: DecryptedMessage;
  onPaid: () => void;
}) {
  const payment = message.payment!;
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<PayState>("idle");
  const [error, setError] = useState<string | null>(null);

  const expected = parsePositiveWei(payment.amountWei);
  if (expected === null) return null;

  const showAmount = (wei: string) => formatTokenAmount(wei, payment.tokenDecimals, payment.token);

  const paidValue = parsePositiveWei(message.paidAmountWei);
  const hasReceipt = message.paidTxHash !== null && paidValue !== null;
  // The receipt must also be for the REQUESTED token, not just any token.
  const tokenOk = !hasReceipt
    ? true
    : payment.tokenAddress === null
      ? message.paidTokenAddress === null
      : (message.paidTokenAddress ?? "").toLowerCase() === payment.tokenAddress.toLowerCase();
  const full = hasReceipt && tokenOk && paidValue! >= expected;
  const iAmPayer = message.direction === "in";
  const isErc20 = payment.tokenAddress !== null;

  async function handlePay(expectedAmount: bigint, paidSoFar: bigint | null) {
    setError(null);
    try {
      const remainder = paidSoFar !== null ? expectedAmount - paidSoFar : expectedAmount;
      if (remainder <= BigInt(0)) return;
      if (chainId !== robinhoodChainTestnet.id) {
        setState("switching");
        await switchChainAsync({ chainId: robinhoodChainTestnet.id });
      }
      setState("sending");
      let hash: string;
      if (isErc20) {
        hash = await writeContractAsync({
          address: payment.tokenAddress! as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [message.counterparty as `0x${string}`, remainder],
          chainId: robinhoodChainTestnet.id,
        });
      } else {
        hash = await sendTransactionAsync({
          to: message.counterparty as `0x${string}`,
          value: remainder,
          chainId: robinhoodChainTestnet.id,
        });
      }
      setState("verifying");
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          txHash: hash,
          ...(isErc20 ? { tokenAddress: payment.tokenAddress } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Payment verification failed.");
      }
      setState("idle");
      toast("Payment sent — verifying on-chain");
      onPaid();
    } catch (err) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Payment failed.";
      // Wallet rejections are routine — keep them short, details go to console.
      const friendly = /reject|denied|cancel|user rejected/i.test(msg)
        ? "Payment cancelled in wallet."
        : msg;
      setError(friendly);
      console.error("[PaymentCard] pay failed:", err);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 overflow-hidden">
      <div className="px-4 py-4">
        <p className="text-[11px] font-geist font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Payment request · Testnet
        </p>
        <p className="mt-1 text-2xl font-geist font-semibold tracking-tight text-neutral-900">
          {showAmount(payment.amountWei)}
        </p>
        {payment.note && (
          <p className="mt-1 text-sm text-neutral-600 font-geist whitespace-pre-wrap">
            {payment.note}
          </p>
        )}

        <div className="mt-3">
          {full ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-geist font-medium text-green-700">
              <Check className="w-3.5 h-3.5" />
              Paid — verified on-chain
            </span>
          ) : hasReceipt && !tokenOk ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-geist font-medium text-amber-700">
              Paid in a different token — still waiting for {showAmount(payment.amountWei)}
            </span>
          ) : hasReceipt ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-geist font-medium text-amber-700">
              Partially paid ({showAmount(paidValue!.toString())} of{" "}
              {showAmount(payment.amountWei)})
            </span>
          ) : iAmPayer ? (
            <button
              onClick={() => void handlePay(expected, paidValue)}
              disabled={state !== "idle" && state !== "error"}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium font-geist text-white hover:bg-neutral-700 transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
              {(state === "switching" || state === "sending" || state === "verifying") && (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              )}
              {state === "switching"
                ? "Switching network…"
                : state === "sending"
                  ? "Confirm in wallet…"
                  : state === "verifying"
                    ? "Verifying on-chain…"
                    : `Pay ${showAmount(payment.amountWei)}`}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1.5 text-xs font-geist font-medium text-neutral-500">
              Waiting for payment…
            </span>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-red-600 font-geist">{error}</p>}

        {message.paidTxHash && (
          <a
            href={`${EXPLORER}/tx/${message.paidTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-geist text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition-colors"
          >
            View transaction
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
