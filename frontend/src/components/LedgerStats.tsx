import Link from "next/link";
import type { LedgerRecord } from "@/types";
import { formatNumber, timeAgo } from "@/lib/format";

interface Props { ledger: LedgerRecord }

export default function LedgerStats({ ledger }: Props) {
  const stats = [
    { label: "Latest Ledger",  value: <Link href={`/ledger/${ledger.sequence}`} className="text-prism-accent hover:underline">#{formatNumber(ledger.sequence)}</Link> },
    { label: "Closed",         value: timeAgo(ledger.closedAt) },
    { label: "Transactions",   value: formatNumber(ledger.transactionCount) },
    { label: "Base Fee",       value: `${ledger.baseFee} stroops` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-prism-border bg-prism-surface p-4">
          <p className="text-prism-muted text-xs mb-1">{s.label}</p>
          <div className="text-lg font-semibold">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
