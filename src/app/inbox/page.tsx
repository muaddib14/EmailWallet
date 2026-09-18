"use client";

import { useWalletAuth } from "@/lib/useWalletAuth";
import { HeroConnectButton } from "@/components/ConnectWalletButton";
import ComposeForm from "@/components/inbox/ComposeForm";
import MessageList from "@/components/inbox/MessageList";

export default function InboxPage() {
  const { isAuthenticated, address } = useWalletAuth();

  if (!isAuthenticated || !address) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 gap-6">
        <h1 className="text-3xl font-geist tracking-tighter text-white">
          Connect your wallet to open your inbox
        </h1>
        <p className="text-white/60 font-geist max-w-md">
          Your inbox is derived entirely from your wallet signature — there&apos;s nothing to
          load until you sign in.
        </p>
        <HeroConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-[1fr_1.3fr] gap-8">
      <ComposeForm myAddress={address} />
      <MessageList myAddress={address} />
    </div>
  );
}
