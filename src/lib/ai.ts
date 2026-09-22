"use client";

export type InboxAIResult = {
  summary: string;
  urgent: { id: string; reason: string }[];
  actionItems: { id: string; item: string }[];
  modelUsed: string;
};

export class AIError extends Error {}

/**
 * Calls our own /api/ai/summarize, which holds the OpenRouter key server-side
 * (OPENROUTER_API_KEY) and fans out across 3 free models as fallback. The
 * browser never sees the API key — it only sends the messages it already
 * decrypted client-side, over the same authenticated session as everything
 * else in the app.
 */
export async function summarizeInboxWithAI(
  items: { id: string; from: string; subject: string; body: string }[]
): Promise<InboxAIResult> {
  if (items.length === 0) {
    return { summary: "Inbox is empty — nothing to summarize.", urgent: [], actionItems: [], modelUsed: "" };
  }

  const res = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AIError(data?.error || "AI summary failed.");
  }

  return {
    summary: typeof data.summary === "string" ? data.summary : "",
    urgent: Array.isArray(data.urgent) ? data.urgent : [],
    actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
    modelUsed: typeof data.modelUsed === "string" ? data.modelUsed : "",
  };
}
