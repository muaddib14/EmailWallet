"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { SESSION_MESSAGE, ENCRYPTION_MESSAGE } from "@/lib/authMessages";

export type AuthStep = "disconnected" | "connecting" | "signing" | "ready";

/**
 * Two-signature wallet auth, matching the flow described in the product spec:
 * 1) a session signature -> POSTed to /api/session, which verifies it and
 *    sets an httpOnly cookie for a real 24h server-side session
 * 2) an encryption-key signature -> kept client-side only; it's the seed
 *    for deriving the E2E encryption key, so it must never leave the browser
 */
export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [sessionSignature, setSessionSignature] = useState<string | null>(null);
  const [encryptionSignature, setEncryptionSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const step: AuthStep = useMemo(() => {
    if (!isConnected) return isConnecting ? "connecting" : "disconnected";
    if (!sessionSignature || !encryptionSignature) return "signing";
    return "ready";
  }, [isConnected, isConnecting, sessionSignature, encryptionSignature]);

  const connectAndSign = useCallback(async () => {
    setError(null);
    try {
      let currentAddress = address;

      if (!isConnected) {
        const injectedConnector = connectors.find((c) => c.type === "injected") ?? connectors[0];
        if (!injectedConnector) {
          setError("No wallet found. Install MetaMask, Rabby, or another EVM wallet.");
          return;
        }
        const result = await connectAsync({ connector: injectedConnector });
        currentAddress = result.accounts[0];
      }

      if (!currentAddress) {
        setError("No account returned by wallet.");
        return;
      }

      const session = await signMessageAsync({ message: SESSION_MESSAGE(currentAddress) });

      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: currentAddress, signature: session }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Server rejected the session signature.");
      }
      setSessionSignature(session);

      const encryptionKey = await signMessageAsync({
        message: ENCRYPTION_MESSAGE(currentAddress),
      });
      setEncryptionSignature(encryptionKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection was rejected.";
      setError(message);
    }
  }, [address, isConnected, connectors, connectAsync, signMessageAsync]);

  const signOut = useCallback(() => {
    setSessionSignature(null);
    setEncryptionSignature(null);
    disconnect();
    void fetch("/api/session", { method: "DELETE" });
  }, [disconnect]);

  return {
    address,
    step,
    error,
    connectAndSign,
    signOut,
    isAuthenticated: step === "ready",
  };
}
