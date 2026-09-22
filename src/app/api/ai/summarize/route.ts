import { NextRequest, NextResponse } from "next/server";
import { currentAddress } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { summarizeInboxWithAI, AIError } from "@/lib/aiServer";

const MAX_ITEMS = 20;
const MAX_FIELD_LENGTH = 2000;

export async function POST(request: NextRequest) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Each call fans out to an LLM provider — a much tighter budget than the
  // regular message endpoints so one wallet can't burn through the shared key.
  if (!checkRateLimit(`ai-summarize:${address}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many summary requests. Try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const items = body?.items;
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Missing items." }, { status: 400 });
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `At most ${MAX_ITEMS} messages per summary.` }, { status: 400 });
  }
  for (const item of items) {
    if (
      typeof item?.id !== "string" ||
      typeof item?.from !== "string" ||
      typeof item?.subject !== "string" ||
      typeof item?.body !== "string" ||
      item.id.length > 100 ||
      item.from.length > 100 ||
      item.subject.length > MAX_FIELD_LENGTH ||
      item.body.length > MAX_FIELD_LENGTH
    ) {
      return NextResponse.json({ error: "Malformed item in items." }, { status: 400 });
    }
  }

  try {
    const result = await summarizeInboxWithAI(items);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof AIError ? err.message : "AI summary failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
