import { getTransaction } from "@/lib/horizon";
import { shortHash, formatDate, formatFee, stroopsToXlm } from "@/lib/format";
import { notFound } from "next/navigation";

interface Props { params: { hash: string } }

export default async function TxPage({ params }: Props) {
  let tx;
  try { tx = await getTransaction(params.hash); }
  catch { notFound(); }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Transaction</h1>
      <p className="text-prism-muted font-mono text-sm mb-8">{params.hash}</p>

      <div className="rounded-xl border border-prism-border bg-prism-surface p-6 space-y-4">
        <Row label="Status"    value={tx.successful ? "✓ Success" : "✗ Failed"} />
        <Row label="Ledger"    value={String(tx.ledger)} />
        <Row label="Timestamp" value={formatDate(tx.createdAt)} />
        <Row label="Source"    value={tx.sourceAccount} mono />
        <Row label="Fee"       value={`${formatFee(tx.fee)} (${stroopsToXlm(tx.fee)})`} />
        <Row label="Operations" value={String(tx.operationCount)} />
        {tx.memo && <Row label="Memo" value={tx.memo} />}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between border-b border-prism-border pb-3 last:border-0 last:pb-0">
      <span className="text-prism-muted text-sm">{label}</span>
      <span className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
