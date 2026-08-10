import StorageLookup from "./StorageLookup";
import type { StorageEntry } from "@/types";

interface Props { contractId: string; instanceStorage: StorageEntry[] }

export default function ContractStorageView({ contractId, instanceStorage }: Props) {
  return (
    <div>
      {instanceStorage.length === 0 ? (
        <p className="text-prism-muted text-sm">No instance storage entries found for this contract.</p>
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
                  <td className="px-4 py-3 font-mono text-xs text-prism-muted break-all">{e.value}</td>
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
