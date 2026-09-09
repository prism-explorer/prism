import type { Metadata } from "next";
import XdrDecoder from "@/components/XdrDecoder";

export const metadata: Metadata = {
  title: "XDR Decoder | Prism",
  description:
    "Decode raw base64 Stellar/Soroban XDR — transaction envelopes, results, meta, ledger entries and keys, contract spec entries, and ScVals.",
};

export default function XdrPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">XDR Decoder</h1>
      <p className="text-prism-muted text-sm mb-6 max-w-2xl">
        Paste any base64 XDR blob — a transaction envelope from Horizon, a result or meta field, a ledger
        entry or key, a contract spec entry, or a bare ScVal. XDR carries no type tag, so Prism identifies
        the type by decoding and re-encoding each candidate and keeping the one that reproduces your input
        exactly.
      </p>
      <XdrDecoder />
    </div>
  );
}
