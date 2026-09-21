import { NextRequest, NextResponse } from "next/server";
import { currentAddress } from "@/lib/session";
import { deleteDraft, upsertDraft } from "@/lib/db/queries";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { toRaw, subjectCiphertext, bodyCiphertext, threadId } = body ?? {};

  if (
    typeof toRaw !== "string" ||
    typeof subjectCiphertext !== "string" ||
    typeof bodyCiphertext !== "string" ||
    (threadId !== undefined && threadId !== null && typeof threadId !== "string")
  ) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  try {
    await upsertDraft(id, {
      ownerAddress: address,
      toRaw,
      subjectCiphertext,
      bodyCiphertext,
      threadId: threadId ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update draft.";
    return NextResponse.json({ error: message }, { status: 413 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  await deleteDraft(id, address);
  return NextResponse.json({ ok: true });
}
