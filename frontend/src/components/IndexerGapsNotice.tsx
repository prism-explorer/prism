import type { IndexedGap } from "@/lib/indexed-db";

interface Props {
  /** Ledger ranges the indexer skipped; an empty list renders nothing. */
  gaps: IndexedGap[];
}

/**
 * Warning shown above indexer-backed history lists. Indexed history has holes
 * when the indexer skipped ledgers, so presenting it as complete would be
 * misleading. Renders no markup at all when there are no gaps.
 */
export default function IndexerGapsNotice({ gaps }: Props) {
  if (gaps.length === 0) return null;

  return (
    <div
      role="status"
      className="mb-6 rounded border border-prism-red bg-prism-red/10 px-4 py-3 text-sm text-prism-red"
    >
      <p className="font-semibold mb-1">
        Indexed history is incomplete — the indexer skipped {gaps.length}{" "}
        {gaps.length === 1 ? "range" : "ranges"}:
      </p>
      <ul className="list-disc list-inside space-y-0.5">
        {gaps.map((gap) => (
          <li key={`${gap.fromLedger}-${gap.toLedger}`}>
            No data for ledgers {gap.fromLedger}–{gap.toLedger}: {gap.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
