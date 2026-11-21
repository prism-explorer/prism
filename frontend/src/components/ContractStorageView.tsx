import EmptyState from "./EmptyState";
import ExpandableValue from "./ExpandableValue";
import StorageLookup from "./StorageLookup";
import { storageStateLabel } from "@/lib/storage-state";
import type { StorageEntry } from "@/types";

interface Props { contractId: string; instanceStorage: StorageEntry[]; fullStorage?: StorageEntry[] }

export default function ContractStorageView({ contractId, instanceStorage, fullStorage }: Props) {
  const hasFullStorage = fullStorage !== undefined && fullStorage.length > 0;

  return (
    <div>
      {hasFullStorage ? (
        <div>
          <p className="text-xs text-prism-muted mb-2">
            Full storage indexed since the indexer started — {fullStorage!.length} keys observed
            (persistent/temporary/instance). Not full chain history, just everything touched since launch.
            State compares each key&apos;s TTL with the latest ledger: an expired temporary key is deleted,
            while an archived persistent key can still be restored.
          </p>
          <div className="rounded-xl border border-prism-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-prism-surface border-b border-prism-border">
                <tr>
                  <th className="text-left px-4 py-3 text-prism-muted font-medium">Durability</th>
                  <th className="text-left px-4 py-3 text-prism-muted font-medium">Key</th>
                  <th className="text-left px-4 py-3 text-prism-muted font-medium">State</th>
                  <th className="text-left px-4 py-3 text-prism-muted font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {fullStorage!.map((e, i) => (
                  <tr key={i} className="border-b border-prism-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-prism-accent">{e.durability}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.key}</td>
                    <td className={`px-4 py-3 font-mono text-xs ${
                      e.state === "expired"
                        ? "text-prism-red"
                        : e.state === "archived"
                        ? "text-prism-accent"
                        : "text-prism-muted"
                    }`}>
                      {storageStateLabel(e.state ?? "live")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-prism-muted"><ExpandableValue value={e.value} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : instanceStorage.length === 0 ? (
        <EmptyState>No instance storage entries found for this contract.</EmptyState>
      ) : (
        <div className="rounded-xl border border-prism-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-prism-surface border-b border-prism-border">
              <tr>
                <th className="text-left px-4 py-3 text-prism-muted font-medium">Key</th>
                <th className="text-left px-4 py-3 text-prism-muted font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {instanceStorage.map((e, i) => (
                <tr key={i} className="border-b border-prism-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{e.key}</td>
                  <td className="px-4 py-3 font-mono text-xs text-prism-muted"><ExpandableValue value={e.value} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <StorageLookup contractId={contractId} />
    </div>
  );
}
