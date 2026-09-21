"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import type { Connector } from "wagmi";
import { useRouter } from "next/navigation";
import { SESSION_MESSAGE, ENCRYPTION_MESSAGE } from "@/lib/authMessages";
import { deriveKeyPair, publicKeyToBase64, type BoxKeyPair } from "@/lib/crypto";
import { saveAuthCache, loadAuthCache, clearAuthCache } from "@/lib/authSessionCache";

export type AuthStep = "disconnected" | "connecting" | "signing" | "ready";

export type WalletAuthValue = {
  address: `0x${string}` | undefined;
  step: AuthStep;
  error: string | null;
  isBusy: boolean;
  /** Pass an explicit connector from the picker (EIP-6963 entry). Falls back to the first injected connector when omitted. */
  connectAndSign: (connector?: Connector) => Promise<void>;
  signOut: () => void;
  /** Dismiss the current auth error (used by the global error toast). */
  clearError: () => void;
  isAuthenticated: boolean;
  /** NaCl box keypair derived from the encryption signature. Secret key never leaves the browser. */
  keyPair: BoxKeyPair | null;
  /** All discovered wallet connectors (EIP-6963: MetaMask, Rabby, dll). Rendered by WalletPickerModal. */
  connectors: readonly Connector[];
};

export const WalletAuthContext = createContext<WalletAuthValue | null>(null);

/**
 * wagmi/viem rejection errors are verbose and wallet-jargony
 * ("User rejected the request. Details: ... Version: viem@2.x.x").
 * Map the common cases to one-line copy users can act on. Unknown
 * errors pass through minus the viem version suffix.
 */
function friendlyAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Connection was rejected.";
  const lower = raw.toLowerCase();
  const code = (err as { code?: number })?.code;
  if (
    code === 4001 ||
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("action_rejected")
  ) {
    return "Signature was rejected in your wallet. Click to try again — you'll get two prompts (session + encryption key).";
  }
  const cleaned = raw.replace(/\s*version:\s*viem@\S+/gi, "").replace(/\s*details:\s*/gi, " ").trim();
  return cleaned || "Connection was rejected.";
}

/**
 * Two-signature wallet auth, matching the flow described in the product spec:
 * 1) a session signature -> POSTed to /api/session, which verifies it and
 *    sets an httpOnly cookie for a real 24h server-side session
 * 2) an encryption-key signature -> kept client-side only; it's the seed
 *    for deriving the E2E encryption key, so it must never leave the browser
 *
 * This lives in one Provider (mounted once in the root layout) rather than
 * inside the hook every button calls — auth state that lived per-component
 * meant the nav button and hero button each ran their own independent copy
 * of "am I signed in", so finishing sign-in from one button left the other
 * looking like nothing happened.
 */
export function WalletAuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();

  const [sessionSignature, setSessionSignature] = useState<string | null>(null);
  const [encryptionSignature, setEncryptionSignature] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<BoxKeyPair | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restoreAttempted = useRef(false);

  // Restore a cached sign-in once wagmi reports the wallet reconnected after
  // a refresh. Runs once per address change (guards on restoreAttempted so
  // it doesn't fight with a fresh connectAndSign() call in the same tab).
  useEffect(() => {
    if (!isConnected || !address || restoreAttempted.current) return;
    restoreAttempted.current = true;

    const cached = loadAuthCache();
    if (!cached || cached.address.toLowerCase() !== address.toLowerCase()) {
      if (cached) clearAuthCache();
      return;
    }

    // Restoring from sessionStorage (an external system) once the wallet
    // reconnects is exactly the "subscribe to an external system" case the
    // lint rule carves out — not the accidental-sync-setState case it guards
    // against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionSignature(cached.sessionSignature);
    setKeyPair(deriveKeyPair(cached.encryptionSignature));
    setEncryptionSignature(cached.encryptionSignature);
    // The httpOnly session cookie is still attached to every request by the
    // browser regardless of this reload, so there's no need to re-hit
    // /api/session here — only the client-side signatures needed restoring.
  }, [isConnected, address]);

  const step: AuthStep = useMemo(() => {
    if (!isConnected) return isConnecting ? "connecting" : "disconnected";
    if (!sessionSignature || !encryptionSignature) return "signing";
    return "ready";
  }, [isConnected, isConnecting, sessionSignature, encryptionSignature]);

  const isBusy = isConnecting || isSigning;

  const connectAndSign = useCallback(async (picked?: Connector) => {
    setError(null);
    setIsSigning(true);
    try {
      let currentAddress = address;

      // Switching wallets mid-flow (e.g. "use a different wallet" from the
      // picker while half-signed): drop the previous wallet's partial
      // signatures first, otherwise the new wallet inherits a session
      // signature it never made.
      const switching =
        !!picked && (!isConnected || picked.uid !== activeConnector?.uid);
      if (switching) {
        setSessionSignature(null);
        setEncryptionSignature(null);
        setKeyPair(null);
        clearAuthCache();
        currentAddress = undefined;
      }

      if (!isConnected || switching) {
        const target =
          picked ??
          connectors.find((c) => c.type === "injected") ??
          connectors[0];
        if (!target) {
          setError("No wallet found. Install MetaMask, Rabby, or another EVM wallet.");
          return;
        }
        const result = await connectAsync({ connector: target });
        currentAddress = result.accounts[0];
      }

      if (!currentAddress) {
        setError("No account returned by wallet.");
        return;
      }

      const nonceRes = await fetch("/api/session/nonce");
      if (!nonceRes.ok) {
        throw new Error("Could not start sign-in (nonce request failed). Try again.");
      }
      const { nonce } = await nonceRes.json();

      const session = await signMessageAsync({ message: SESSION_MESSAGE(currentAddress, nonce) });

      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: currentAddress, signature: session, nonce }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Server rejected the session signature.");
      }
      setSessionSignature(session);

      const encryptionKey = await signMessageAsync({
        message: ENCRYPTION_MESSAGE(currentAddress),
      });
      const pair = deriveKeyPair(encryptionKey);
      setKeyPair(pair);
      setEncryptionSignature(encryptionKey);
      saveAuthCache({ address: currentAddress, sessionSignature: session, encryptionSignature: encryptionKey });

      // Straight to the inbox — no "click again to continue" after signing.
      // replace() (not push) so Back doesn't land on a stale signed-out view.
      router.replace("/inbox");

      // Publish only the public half so others can encrypt to this wallet.
      // Failure here shouldn't block sign-in — it just means composing to
      // this address won't work for other people until it succeeds later.
      fetch("/api/wallets/publish-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptionPublicKey: publicKeyToBase64(pair.publicKey) }),
      }).catch((publishError) => {
        console.error("[WalletAuthProvider] failed to publish encryption key:", publishError);
      });
    } catch (err) {
      console.error("[WalletAuthProvider] connectAndSign failed:", err);
      setError(friendlyAuthError(err));
    } finally {
      setIsSigning(false);
    }
  }, [address, isConnected, activeConnector, connectors, connectAsync, signMessageAsync, router]);

  const signOut = useCallback(() => {
    setSessionSignature(null);
    setEncryptionSignature(null);
    setKeyPair(null);
    setError(null);
    clearAuthCache();
    restoreAttempted.current = false;
    disconnect();
    void fetch("/api/session", { method: "DELETE" });
  }, [disconnect]);

  const clearError = useCallback(() => setError(null), []);

  const value: WalletAuthValue = {
    address,
    step,
    error,
    isBusy,
    connectAndSign,
    signOut,
    clearError,
    isAuthenticated: step === "ready",
    keyPair,
    connectors,
  };

  return <WalletAuthContext.Provider value={value}>{children}</WalletAuthContext.Provider>;
}
