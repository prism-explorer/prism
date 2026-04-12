export interface LedgerRecord {
  sequence: number;
  hash: string;
  closedAt: string;
  transactionCount: number;
  operationCount: number;
  baseFee: number;
  successfulTransactionCount: number;
  failedTransactionCount: number;
}

export interface TransactionRecord {
  hash: string;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  fee: number;
  operationCount: number;
  successful: boolean;
  memo?: string;
}

export interface ContractRecord {
  id: string;
  wasmHash: string;
  createdAt: string;
  creator: string;
  invocationCount?: number;
}

export interface ContractEvent {
  id: string;
  contractId: string;
  type: string;
  topic: string[];
  value: string;
  ledger: number;
  timestamp: string;
}

export interface StorageEntry {
  key: string;
  value: string;
  durability: "persistent" | "temporary" | "instance";
}

export type Network = "testnet" | "mainnet";
