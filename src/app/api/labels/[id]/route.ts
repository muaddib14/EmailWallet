import { NextRequest, NextResponse } from "next/server";
import { currentAddress } from "@/lib/session";
import { deleteLabel } from "@/lib/db/queries";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  await deleteLabel(id, address);
  return NextResponse.json({ ok: true });
}
