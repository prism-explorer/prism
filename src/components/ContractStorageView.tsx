import { getContractData } from "@/lib/soroban";
import type { StorageEntry } from "@/types";

interface Props { contractId: string }

export default async function ContractStorageView({ contractId }: Props) {
  let entries: StorageEntry[] = [];
  try { entries = await getContractData(contractId); }
  catch {}

  if (entries.length === 0) {
    return (
      <p className="text-prism-muted text-sm">
        No storage entries found for this contract.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-prism-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-prism-surface border-b border-prism-border">
          <tr>
            <th className="text-left px-4 py-3 text-prism-muted font-medium">Key</th>
            <th className="text-left px-4 py-3 text-prism-muted font-medium">Value</th>
            <th className="text-left px-4 py-3 text-prism-muted font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-b border-prism-border last:border-0">
              <td className="px-4 py-3 font-mono text-xs">{e.key}</td>
              <td className="px-4 py-3 font-mono text-xs text-prism-muted break-all">{e.value}</td>
              <td className="px-4 py-3 text-xs">{e.durability}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
