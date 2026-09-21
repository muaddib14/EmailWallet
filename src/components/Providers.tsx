"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletAuthProvider } from "@/lib/WalletAuthProvider";
import AuthErrorToast from "@/components/AuthErrorToast";
import ToastHost from "@/components/Toast";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletAuthProvider>
          {children}
          <AuthErrorToast />
          <ToastHost />
        </WalletAuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
