import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import AuraBackground from "@/components/AuraBackground";
import ViewportAnimations from "@/components/ViewportAnimations";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Wallet Mail — Encrypted Mail for Wallets",
  description:
    "No accounts, no passwords. Sign in with any EVM wallet, message any address by name, and every message is signed and end-to-end encrypted on Robinhood Chain.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${inter.variable} h-full`}
      data-theme="dark"
    >
      <body className="antialiased text-white bg-black h-full overflow-x-hidden font-sans">
        <AuraBackground />
        <ViewportAnimations />
        <div className="site-content overflow-y-auto w-full h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
