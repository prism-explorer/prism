import type { ContractEvent, StorageEntry } from "@/types";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

async function rpc(method: string, params: unknown) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    next: { revalidate: 10 },
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export async function getContractData(contractId: string): Promise<StorageEntry[]> {
  // TODO: paginate getLedgerEntries for all contract storage keys
  const result = await rpc("getLedgerEntries", { keys: [] });
  return [];
}

export async function getContractEvents(contractId: string, limit = 50): Promise<ContractEvent[]> {
  const result = await rpc("getEvents", {
    startLedger: 0,
    filters: [{ type: "contract", contractIds: [contractId] }],
    pagination: { limit },
  });
  return (result?.events ?? []).map((e: any) => ({
    id: e.id,
    contractId: e.contractId,
    type: e.type,
    topic: e.topic ?? [],
    value: e.value?.xdr ?? "",
    ledger: e.ledger,
    timestamp: e.ledgerClosedAt,
  }));
}

export async function simulateTransaction(xdr: string) {
  return rpc("simulateTransaction", { transaction: xdr });
}
