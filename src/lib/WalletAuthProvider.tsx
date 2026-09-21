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
import { requestAuthFromSibling, serveAuthToSiblings } from "@/lib/authBridge";
import { toast } from "@/components/Toast";

export type AuthStep = "disconnected" | "connecting" | "signing" | "ready";

export type WalletAuthValue = {
  address: `0x${string}` | undefined;
  step: AuthStep;
  isBusy: boolean;
  /** Pass an explicit connector from the picker (EIP-6963 entry). Falls back to the first injected connector when omitted. */
  connectAndSign: (connector?: Connector) => Promise<void>;
  signOut: () => void;
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
  const restoreAttempted = useRef(false);

  // Answer auth requests from sibling tabs (e.g. a proof link opened in a
  // new tab while the inbox is still open elsewhere).
  useEffect(() => serveAuthToSiblings(loadAuthCache), []);

  // Restore a cached sign-in once wagmi reports the wallet reconnected after
  // a refresh. Runs once per address change (guards on restoreAttempted so
  // it doesn't fight with a fresh connectAndSign() call in the same tab).
  // Falls back to asking sibling tabs when this tab's own cache is empty —
  // all state updates happen in async callbacks, never synchronously here.
  useEffect(() => {
    if (!isConnected || !address || restoreAttempted.current) return;
    restoreAttempted.current = true;
    // Snapshot for the async flow below — closure narrowing doesn't carry
    // the guard above into `restore()`.
    const walletAddress = address;
    let cancelled = false;

    function applyCached(cached: { sessionSignature: string; encryptionSignature: string }) {
      setSessionSignature(cached.sessionSignature);
      setKeyPair(deriveKeyPair(cached.encryptionSignature));
      setEncryptionSignature(cached.encryptionSignature);
      // The httpOnly session cookie is still attached to every request by the
      // browser regardless of this reload, so there's no need to re-hit
      // /api/session here — only the client-side signatures needed restoring.
    }

    async function restore() {
      const direct = loadAuthCache();
      if (direct) {
        if (direct.address.toLowerCase() === walletAddress.toLowerCase()) {
          if (!cancelled) applyCached(direct);
          return;
        }
        clearAuthCache();
      }
      const bridged = await requestAuthFromSibling();
      if (cancelled) return;
      if (bridged && bridged.address.toLowerCase() === walletAddress.toLowerCase()) {
        applyCached(bridged);
        saveAuthCache(bridged); // seed this tab so refreshes don't re-ask
        toast("Signed in via your open tab — no signatures needed");
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  const step: AuthStep = useMemo(() => {
    if (!isConnected) return isConnecting ? "connecting" : "disconnected";
    if (!sessionSignature || !encryptionSignature) return "signing";
    return "ready";
  }, [isConnected, isConnecting, sessionSignature, encryptionSignature]);

  const isBusy = isConnecting || isSigning;

  const connectAndSign = useCallback(async (picked?: Connector) => {
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
          toast("No wallet found. Install MetaMask, Rabby, or another EVM wallet.", "error");
          return;
        }
        const result = await connectAsync({ connector: target });
        currentAddress = result.accounts[0];
        // Remember which wallet entry was used (stable rdns like
        // "io.metamask" / "app.phantom", falling back to the name) so the
        // picker can badge it "Last used" next time.
        try {
          const key = (target as Connector & { rdns?: string }).rdns ?? target.name;
          localStorage.setItem("walletmail:last-wallet", key);
        } catch {
          // Storage unavailable — the badge just won't show.
        }
      }

      if (!currentAddress) {
        toast("No account returned by wallet.", "error");
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
      toast(friendlyAuthError(err), "error");
    } finally {
      setIsSigning(false);
    }
  }, [address, isConnected, activeConnector, connectors, connectAsync, signMessageAsync, router]);

  const signOut = useCallback(() => {
    setSessionSignature(null);
    setEncryptionSignature(null);
    setKeyPair(null);
    clearAuthCache();
    restoreAttempted.current = false;
    disconnect();
    void fetch("/api/session", { method: "DELETE" });
    // Explicit logout (or expired session): go home now. The inbox gate's
    // tolerance timer is only for restores that might still land — after a
    // deliberate disconnect there is nothing to wait for, and waiting shows
    // a blank white page.
    router.replace("/");
  }, [disconnect, router]);

  const value: WalletAuthValue = {
    address,
    step,
    isBusy,
    connectAndSign,
    signOut,
    isAuthenticated: step === "ready",
    keyPair,
    connectors,
  };

  return <WalletAuthContext.Provider value={value}>{children}</WalletAuthContext.Provider>;
}
