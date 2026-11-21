import type { StorageEntry, StorageEntryState } from "@/types";

/**
 * A temporary entry past its TTL is deleted by the protocol, while a
 * persistent one is only archived and can be restored with a bump. Compare the
 * entry's TTL with the latest ledger so the two aren't mistaken for a live
 * entry — or for a key that never existed.
 */
export function classifyStorageEntry(
  durability: StorageEntry["durability"],
  liveUntilLedgerSeq: number | null | undefined,
  latestLedgerSeq: number
): StorageEntryState {
  if (liveUntilLedgerSeq == null || latestLedgerSeq < liveUntilLedgerSeq) return "live";
  return durability === "temporary" ? "expired" : "archived";
}

/** Human-readable label that makes the restore-vs-gone difference explicit. */
export function storageStateLabel(state: StorageEntryState): string {
  switch (state) {
    case "expired":
      return "expired (temporary — deleted)";
    case "archived":
      return "archived (persistent — restorable)";
    case "live":
      return "live";
  }
}

/** Attach the computed state to a storage entry, leaving unknown TTLs as live. */
export function withStorageState(entry: StorageEntry, latestLedgerSeq: number): StorageEntry {
  return {
    ...entry,
    state: classifyStorageEntry(entry.durability, entry.liveUntilLedgerSeq, latestLedgerSeq),
  };
}
