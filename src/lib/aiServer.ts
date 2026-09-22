import "server-only";

const CHAT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Free-tier OpenRouter models, tried in order. A `:free` model can be
 * rate-limited or briefly unavailable — if one fails we fall through to the
 * next rather than surfacing a single provider's outage as "AI is broken".
 *
 * Picked from a live check against openrouter.ai/api/v1/models (2026-09-22)
 * for ones that (a) actually responded 200, not 404/deprecated, and (b)
 * followed the "JSON only" instruction correctly on the real prompt shape
 * below — several other `:free` models returned 200 but ignored the format
 * or got cut off mid-JSON by their own reasoning tokens. Spread across three
 * different upstream providers (Nvidia, Nex AGI, Cohere) so one provider's
 * shared-pool rate limit doesn't take out all three at once.
 */
export const FREE_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nex-agi/nex-n2.5-pro:free",
  "cohere/north-mini-code:free",
] as const;

export type InboxAIResult = {
  summary: string;
  urgent: { id: string; reason: string }[];
  actionItems: { id: string; item: string }[];
  modelUsed: string;
};

export class AIError extends Error {}

function buildPrompt(items: { id: string; from: string; subject: string; body: string }[]) {
  const listing = items
    .map((m) => `[${m.id}] From: ${m.from}\nSubject: ${m.subject}\nBody: ${m.body.slice(0, 500)}`)
    .join("\n\n");
  return `You are triaging a wallet-signed email inbox. Below are messages, each tagged with an id in [brackets].

${listing}

Respond with ONLY valid JSON, no markdown fences, no commentary before or after, matching this shape:
{"summary": "2-4 sentence plain-English summary of what's in the inbox", "urgent": [{"id": "<message id>", "reason": "short reason"}], "actionItems": [{"id": "<message id>", "item": "short action description"}]}

Only include a message in "urgent" if it genuinely needs prompt attention (deadlines, payment requests, security issues, time-sensitive asks). Only include "actionItems" for messages that ask the reader to do something concrete. Omit a message from both lists if it needs neither.`;
}

/** Pulls the first {...} block out of a reply, for models that ignore "JSON only" and wrap it in prose or ```json fences. */
function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return content.slice(start, end + 1);
  return content;
}

async function callModel(
  apiKey: string,
  model: string,
  items: { id: string; from: string; subject: string; body: string }[]
): Promise<InboxAIResult> {
  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://wallet-mail.app",
      "X-Title": "Quil",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a precise, concise inbox-triage assistant. You only output JSON, nothing else." },
        { role: "user", content: buildPrompt(items) },
      ],
      temperature: 0.2,
      // Some free models spend tokens on hidden reasoning before the JSON —
      // too low a cap truncates the answer mid-object (seen at 400 on one
      // of the reasoning-heavy candidates during testing).
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AIError(body?.error?.message || `${model} request failed (${res.status}).`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new AIError(`${model} returned an empty response.`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new AIError(`${model} returned malformed JSON.`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new AIError(`${model} returned malformed JSON.`);
  }
  const obj = parsed as Record<string, unknown>;
  return {
    summary: typeof obj.summary === "string" ? obj.summary : "",
    urgent: Array.isArray(obj.urgent) ? (obj.urgent as InboxAIResult["urgent"]) : [],
    actionItems: Array.isArray(obj.actionItems) ? (obj.actionItems as InboxAIResult["actionItems"]) : [],
    modelUsed: model,
  };
}

/**
 * Server-side only: uses OPENROUTER_API_KEY from env, never exposed to the
 * browser. This is the one place in the app where decrypted plaintext
 * (subjects/bodies the caller already decrypted client-side) passes through
 * our server — it's forwarded straight to OpenRouter and never persisted.
 *
 * Tries each free model in order and returns the first success; throws the
 * last error only if every model failed.
 */
export async function summarizeInboxWithAI(
  items: { id: string; from: string; subject: string; body: string }[],
  models: readonly string[] = FREE_MODELS
): Promise<InboxAIResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AIError("AI summaries aren't configured on this server yet.");
  if (items.length === 0) {
    return { summary: "Inbox is empty — nothing to summarize.", urgent: [], actionItems: [], modelUsed: "" };
  }
  if (models.length === 0) throw new AIError("No models configured.");

  let lastError: unknown;
  for (const model of models) {
    try {
      return await callModel(apiKey, model, items);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof AIError
    ? lastError
    : new AIError("All fallback models failed. Try again shortly.");
}
