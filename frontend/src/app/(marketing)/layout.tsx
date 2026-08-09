import type { Metadata } from "next";
import "../globals.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "Prism — Soroban block explorer",
  description:
    "See inside every Soroban contract: live storage, invocation history, events, and WASM — in one fast, open-source explorer.",
  openGraph: {
    title: "Prism — Soroban block explorer",
    description:
      "See inside every Soroban contract: live storage, invocation history, events, and WASM.",
    type: "website",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
