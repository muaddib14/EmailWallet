import { NextRequest, NextResponse } from "next/server";
import { currentAddress } from "@/lib/session";
import {
  createLabel,
  isLabelColor,
  listLabelsForAddress,
  listMessageLabelsForAddress,
} from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET() {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const [all, assigned] = await Promise.all([
    listLabelsForAddress(address),
    listMessageLabelsForAddress(address),
  ]);
  return NextResponse.json({ labels: all, assigned });
}

export async function POST(request: NextRequest) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!checkRateLimit(`labels:${address}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const { name, color } = body ?? {};
  if (typeof name !== "string" || !isLabelColor(color)) {
    return NextResponse.json(
      { error: "A name and a valid color are required." },
      { status: 400 }
    );
  }

  try {
    const id = await createLabel(address, name, color);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create label.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
