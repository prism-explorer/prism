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
  envelopeXdr: string;
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
  txHash: string;
  ledger: number;
  timestamp: string;
}

export interface StorageEntry {
  key: string;
  value: string;
  durability: "persistent" | "temporary" | "instance";
}

/** Info derivable from a contract's instance ledger entry alone (always fetchable from just a contract ID). */
export interface ContractInfo {
  executable: "wasm" | "stellar_asset";
  wasmHash?: string;
  liveUntilLedgerSeq?: number;
  lastModifiedLedgerSeq?: number;
  instanceStorage: StorageEntry[];
}

export interface ContractFunctionSpec {
  name: string;
  inputs: { name: string; type: string }[];
  outputs: string[];
}

export interface ContractWasmInfo {
  size: number;
  functions: ContractFunctionSpec[];
}

/** A Soroban invocation decoded from a transaction's InvokeHostFunction operation. */
export interface SorobanInvocation {
  contractId: string;
  functionName: string;
  args: string[];
}

export interface ResourceUsage {
  instructions: number;
  readBytes: number;
  writeBytes: number;
  resourceFeeStroops: string;
}

/** One entry in a contract's recent activity, derived from its emitted events
 *  (bounded by the RPC node's retention window — not full history). */
export interface InvocationHistoryItem {
  txHash: string;
  ledger: number;
  timestamp: string;
  functionName?: string;
  args?: string[];
  successful: boolean;
}

export type Network = "testnet" | "mainnet";
