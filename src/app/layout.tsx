import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Prism — Soroban Block Explorer",
  description: "Open-source block explorer with full Soroban smart contract support for the Stellar network.",
  openGraph: {
    title: "Prism Explorer",
    description: "Explore Stellar transactions, contracts, events, and storage.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-screen max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
