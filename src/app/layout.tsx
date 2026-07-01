import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import { baseUrl } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: {
    default: "FlowDex - Original n8n workflow templates to buy & download",
    template: "%s - FlowDex",
  },
  description:
    "Buy original, ready-to-import n8n workflow templates across 25 categories. Single templates, category bundles, or the full library - instant download after payment.",
  openGraph: {
    title: "FlowDex - Original n8n workflow templates to buy & download",
    description:
      "Original, ready-to-import n8n automation templates. Single, bundle, or full-library pricing with instant download.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowDex - Original n8n workflow templates to buy & download",
    description:
      "Original, ready-to-import n8n automation templates. Single, bundle, or full-library pricing with instant download.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
