import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { db } from "@/lib/db/client";
import { wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.address, address.toLowerCase()))
    .limit(1);

  if (!wallet || !wallet.encryptionPublicKey) {
    return NextResponse.json(
      { error: "This wallet hasn't published an encryption key yet." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    address: wallet.address,
    encryptionPublicKey: wallet.encryptionPublicKey,
  });
}
