import type { LedgerRecord, TransactionRecord } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 10 } });
  if (!res.ok) throw new Error(`Horizon error ${res.status}: ${path}`);
  return res.json();
}

export async function getLatestLedger(): Promise<LedgerRecord> {
  const data = await get<any>("/ledgers?order=desc&limit=1");
  return mapLedger(data._embedded.records[0]);
}

export async function getLedger(sequence: number): Promise<LedgerRecord> {
  const data = await get<any>(`/ledgers/${sequence}`);
  return mapLedger(data);
}

export async function getTransaction(hash: string): Promise<TransactionRecord> {
  const data = await get<any>(`/transactions/${hash}`);
  return mapTransaction(data);
}

export async function getRecentTransactions(limit = 20): Promise<TransactionRecord[]> {
  const data = await get<any>(`/transactions?order=desc&limit=${limit}`);
  return data._embedded.records.map(mapTransaction);
}

function mapLedger(r: any): LedgerRecord {
  return {
    sequence: r.sequence,
    hash: r.hash,
    closedAt: r.closed_at,
    transactionCount: r.transaction_count,
    operationCount: r.operation_count,
    baseFee: r.base_fee_in_stroops,
    successfulTransactionCount: r.successful_transaction_count,
    failedTransactionCount: r.failed_transaction_count,
  };
}

function mapTransaction(r: any): TransactionRecord {
  return {
    hash: r.hash,
    ledger: r.ledger,
    createdAt: r.created_at,
    sourceAccount: r.source_account,
    fee: r.fee_charged,
    operationCount: r.operation_count,
    successful: r.successful,
    memo: r.memo,
  };
}
