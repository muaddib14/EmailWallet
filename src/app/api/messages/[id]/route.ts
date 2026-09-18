import { NextRequest, NextResponse } from "next/server";
import { currentAddress } from "@/lib/session";
import { markMessage } from "@/lib/db/queries";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const patch: Record<string, boolean> = {};
  if (typeof body?.isRead === "boolean") patch.isRead = body.isRead;
  if (typeof body?.isStarred === "boolean") patch.isStarred = body.isStarred;
  if (typeof body?.isArchived === "boolean") patch.isArchived = body.isArchived;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  // markMessage scopes the update to toAddress = address, so a wallet can
  // only flag mail addressed to it — not tamper with someone else's message.
  await markMessage(id, address, patch);

  return NextResponse.json({ ok: true });
}
