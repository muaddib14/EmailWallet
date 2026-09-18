"use client";

import { useContext } from "react";
import { WalletAuthContext } from "@/lib/WalletAuthProvider";

/** Reads the shared wallet-auth state set up by <WalletAuthProvider> in the root layout. */
export function useWalletAuth() {
  const context = useContext(WalletAuthContext);
  if (!context) {
    throw new Error("useWalletAuth must be used within a WalletAuthProvider.");
  }
  return context;
}
