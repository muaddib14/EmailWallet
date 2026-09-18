"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";

export type AuthStep = "disconnected" | "connecting" | "signing" | "ready";

const SESSION_MESSAGE = (address: string) =>
  `Sign in to Wallet Mail\n\nThis signature opens a 24-hour session for ${address}. It does not cost gas and will not trigger a blockchain transaction.`;

const ENCRYPTION_MESSAGE = (address: string) =>
  `Unlock Wallet Mail encryption\n\nThis signature derives the private key that decrypts mail for ${address}. Only sign this on wallet-mail.app.`;

/**
 * Two-signature wallet auth, matching the flow described in the product spec:
 * 1) a session signature (stands in for a 24h session token)
 * 2) an encryption-key signature (stands in for deriving the E2E encryption key)
 *
 * Nothing here is sent to a server yet — there's no backend to receive it. This
 * wires up the real wallet-side half (connect + both signatures) so the button
 * in the UI does something true, instead of a static link.
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
