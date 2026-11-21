import type { IndexerCursorStatus } from "@/lib/indexed-db";

/** How old the cursor's last update may be before indexed lists are flagged as stale. */
export const INDEXER_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export interface IndexerStatusLabel {
  /** Human-readable freshness label, e.g. "Indexed through ledger 123 (2m ago)". */
  text: string;
  /** True when the cursor has not advanced for longer than the threshold. */
  stale: boolean;
}

function formatAge(ageMs: number): string {
  const seconds = Math.floor(Math.max(0, ageMs) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Turn an IndexerCursor snapshot into a display label. `now` is injectable so
 * the server render and tests agree on the "x ago" suffix.
 */
export function indexerStatusLabel(
  cursor: IndexerCursorStatus,
  now: number = Date.now(),
  thresholdMs: number = INDEXER_STALE_THRESHOLD_MS
): IndexerStatusLabel {
  const age = Math.max(0, now - new Date(cursor.updatedAt).getTime());
  const freshness = `Indexed through ledger ${cursor.lastLedger} (${formatAge(age)})`;
  if (age > thresholdMs) {
    return {
      text: `Warning: ${freshness} — the indexer may be behind and indexed lists may be out of date.`,
      stale: true,
    };
  }
  return { text: freshness, stale: false };
}

interface Props {
  cursor: IndexerCursorStatus | null;
  /** Injectable for deterministic rendering; defaults to render time. */
  now?: number;
  thresholdMs?: number;
}

/**
 * Freshness badge for indexer-backed lists. Renders nothing when no indexer is
 * configured, so RPC-only deployments do not see a misleading status.
 */
export default function IndexerStatus({ cursor, now, thresholdMs }: Props) {
  if (!cursor) return null;
  const { text, stale } = indexerStatusLabel(
    cursor,
    now ?? Date.now(),
    thresholdMs ?? INDEXER_STALE_THRESHOLD_MS
  );
  return (
    <p
      role="status"
      className={
        stale
          ? "mb-4 rounded border border-prism-red bg-prism-red/10 px-3 py-2 text-xs text-prism-red"
          : "mb-4 text-xs text-prism-muted"
      }
    >
      {stale ? "⚠ " : ""}
      {text}
    </p>
  );
}
