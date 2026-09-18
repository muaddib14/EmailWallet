import { NextResponse } from "next/server";
import { resolveName } from "@/lib/db/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const result = await resolveName(name);

  if (!result) {
    return NextResponse.json({ error: "Name not found." }, { status: 404 });
  }

  return NextResponse.json({
    name: result.id,
    address: result.ownerAddress,
    encryptionPublicKey: result.encryptionPublicKey,
  });
}
