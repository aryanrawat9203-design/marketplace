import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { baseUrl } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: {
    default: "FlowDex — Discover 10,000+ n8n automation workflows",
    template: "%s · FlowDex",
  },
  description:
    "Search and explore 10,000+ free n8n workflow templates by industry, tool, and use case. The fastest way to find the automation you need.",
  openGraph: {
    title: "FlowDex — Discover 10,000+ n8n automation workflows",
    description: "Search 10,000+ free n8n workflow templates by industry, tool, and use case.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
