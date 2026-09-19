import { NextRequest, NextResponse } from "next/server";
import { currentAddress } from "@/lib/session";
import { listDraftsForAddress, upsertDraft } from "@/lib/db/queries";

export async function GET() {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rows = await listDraftsForAddress(address);
  return NextResponse.json({ drafts: rows });
}

export async function POST(request: NextRequest) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { toRaw, subjectCiphertext, bodyCiphertext } = body ?? {};

  if (
    typeof toRaw !== "string" ||
    typeof subjectCiphertext !== "string" ||
    typeof bodyCiphertext !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  try {
    const id = await upsertDraft(undefined, {
      ownerAddress: address,
      toRaw,
      subjectCiphertext,
      bodyCiphertext,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save draft.";
    return NextResponse.json({ error: message }, { status: 413 });
  }
}
