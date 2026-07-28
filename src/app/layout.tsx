import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import CartProvider from "@/components/CartProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ChatWidget from "@/components/Chatbot/ChatWidget";
import { baseUrl } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: {
    default: "WorkflowCrate - Original n8n workflow templates to buy & download",
    template: "%s - WorkflowCrate",
  },
  description:
    "Buy original, ready-to-import n8n workflow templates across 25 categories. Single templates, category bundles, or the full library - instant download after payment.",
  openGraph: {
    title: "WorkflowCrate - Original n8n workflow templates to buy & download",
    description:
      "Original, ready-to-import n8n automation templates. Single, bundle, or full-library pricing with instant download.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkflowCrate - Original n8n workflow templates to buy & download",
    description:
      "Original, ready-to-import n8n automation templates. Single, bundle, or full-library pricing with instant download.",
  },
    verification: { google: "sEsWxsYSgOCTmAl2rIPmwySSX7sheLPDQ9Fdjp2d5jQ" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#content"
          className="sr-only rounded-lg font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow-lg focus:outline focus:outline-2 focus:outline-violet-500"
        >
          Skip to content
        </a>
        <AuthProvider>
          <CartProvider>
            <Header />
            <main id="content" className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
          <ChatWidget />
        </AuthProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
