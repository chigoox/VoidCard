import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { jsonLdScript, organization, website } from "@/lib/jsonld";
import { ConsentBanner } from "@/components/consent-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UpdateToast } from "@/components/pwa/update-toast";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vcard.ed5enterprise.com"),
  title: {
    default: "VoidCard — NFC Cards & Living Profiles",
    template: "%s · VoidCard",
  },
  description:
    "Onyx-and-gold NFC business cards paired with a living profile that always reflects who you are right now.",
  applicationName: "VoidCard",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "VoidCard" },
  openGraph: {
    type: "website",
    siteName: "VoidCard",
    images: ["/og-default.svg"],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript([organization(), website()])}
        />
        {children}
        <Analytics />
        <ConsentBanner />
        <InstallPrompt />
        <UpdateToast />
      </body>
    </html>
  );
}
