import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { robinhoodChainTestnet } from "@/lib/wagmi";
import { ERC20_ABI } from "@/lib/tokens";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// Read-only ERC-20 metadata for the custom-token path (testnet). Lets the
// request UI show a symbol/decimals for any pasted token contract instead of
// trusting user typing. No auth needed — everything returned is public
// on-chain data.
export async function GET(request: NextRequest) {
  if (!checkRateLimit(`tokens:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const address = new URL(request.url).searchParams.get("address");
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "A valid token address is required." }, { status: 400 });
  }

  const client = createPublicClient({ chain: robinhoodChainTestnet, transport: http() });
  try {
    const [code, decimals, symbol] = await Promise.all([
      client.getBytecode({ address }),
      client.readContract({ address, abi: ERC20_ABI, functionName: "decimals" }),
      client.readContract({ address, abi: ERC20_ABI, functionName: "symbol" }),
    ]);
    if (!code || code === "0x") {
      return NextResponse.json({ error: "Address is not a token contract." }, { status: 422 });
    }
    return NextResponse.json({ address: address.toLowerCase(), decimals, symbol });
  } catch {
    return NextResponse.json({ error: "Could not read token metadata on testnet." }, { status: 422 });
  }
}
