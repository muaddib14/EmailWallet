import { NextRequest, NextResponse } from "next/server";
import { currentAddress } from "@/lib/session";
import { markMessage, purgeMessageForAddress, setMessageLabels } from "@/lib/db/queries";

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
  if (typeof body?.isDeleted === "boolean") patch.isDeleted = body.isDeleted;

  // Labels travel separately (array of the viewer's own label ids) but ride
  // the same endpoint so one optimistic update covers everything.
  const labelIds =
    Array.isArray(body?.labelIds) && body.labelIds.every((v: unknown) => typeof v === "string")
      ? (body.labelIds as string[])
      : null;

  if (Object.keys(patch).length === 0 && labelIds === null) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  // markMessage scopes the update to this viewer's own flag row, so a wallet
  // can only change how a message looks in its own mailbox — never the other
  // side's copy of the same conversation.
  if (Object.keys(patch).length > 0) await markMessage(id, address, patch);
  if (labelIds !== null) await setMessageLabels(id, address, labelIds);

  return NextResponse.json({ ok: true });
}

/** Permanently deletes a message from this viewer's mailbox — only valid from Trash. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  await purgeMessageForAddress(id, address);

  return NextResponse.json({ ok: true });
}
