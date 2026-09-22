import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import ViewportAnimations from "@/components/ViewportAnimations";
import Providers from "@/components/Providers";

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

const SITE_URL = "https://email-wallet-taupe.vercel.app";
const SITE_NAME = "Quill";
const TITLE = "Quill — Encrypted Mail for Wallets";
const DESCRIPTION =
  "No accounts, no passwords. Sign in with any EVM wallet, message any address by private alias, and every message is signed and end-to-end encrypted on Robinhood Chain.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "wallet email",
    "encrypted email",
    "web3 email",
    "end-to-end encryption",
    "EVM wallet",
    "signed messages",
    "Robinhood Chain",
  ],
  authors: [{ name: SITE_NAME }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${inter.variable} h-full`}
      data-theme="dark"
    >
      <body className="antialiased text-white bg-black h-full overflow-x-hidden font-sans">
        <Providers>
          <ViewportAnimations />
          <div className="site-content overflow-y-auto w-full h-full">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
