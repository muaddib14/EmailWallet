"use client";

import { Check, CheckCheck } from "lucide-react";
import type { DecryptedMessage } from "@/lib/useInboxMessages";

function isReceiptable(message: DecryptedMessage) {
  return message.direction === "out" && !message.isSelfSend;
}

function readTime(message: DecryptedMessage) {
  if (!message.readAt) return null;
  const d = new Date(message.readAt);
  return isNaN(d.getTime()) ? null : d;
}

/** WhatsApp-style ticks for the Sent list: double-green once read, single-gray while sent. */
export function ReceiptIcon({ message }: { message: DecryptedMessage }) {
  if (!isReceiptable(message)) return null;
  if (message.readByRecipient) {
    return (
      <span title="Read" className="shrink-0">
        <CheckCheck className="w-4 h-4 text-green-600" />
      </span>
    );
  }
  return (
    <span title="Sent — not read yet" className="shrink-0">
      <Check className="w-4 h-4 text-neutral-300" />
    </span>
  );
}

/** One-line receipt under the detail header, sender-side only. */
export function ReceiptLabel({ message }: { message: DecryptedMessage }) {
  if (!isReceiptable(message)) return null;
  if (message.readByRecipient) {
    const at = readTime(message);
    return (
      <span className="inline-flex items-center gap-1 text-green-700 font-medium">
        <CheckCheck className="w-3.5 h-3.5" />
        Read{at ? ` · ${at.toLocaleString()}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-neutral-400">
      <Check className="w-3.5 h-3.5" />
      Sent · not read yet
    </span>
  );
}
