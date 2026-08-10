import { Address, rpc, xdr } from "@stellar/stellar-sdk";
import type {
  ContractEvent,
  ContractInfo,
  ContractWasmInfo,
  InvocationHistoryItem,
  StorageEntry,
} from "@/types";
import { decodeInvocation, parseContractSpec, scValToDisplay } from "./xdr";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

let _server: rpc.Server | undefined;
function server(): rpc.Server {
  if (!_server) _server = new rpc.Server(RPC_URL, { timeout: 10_000 });
  return _server;
}

/**
 * Fetch a contract's instance entry: executable info + instance storage.
 * This is always derivable from just the contract ID via a single RPC call.
 * Arbitrary persistent/temporary storage keys are NOT enumerable this way —
 * Soroban RPC has no "list all storage for a contract" method, only
 * lookups by known key (see lookupStorageEntry).
 */
export async function getContractInfo(contractId: string): Promise<ContractInfo | null> {
  try {
    const entry = await server().getContractData(
      contractId,
      xdr.ScVal.scvLedgerKeyContractInstance(),
      rpc.Durability.Persistent
    );
    const instance = entry.val.contractData().val().instance();
    const executable = instance.executable();
    const isWasm = executable.switch().name === "contractExecutableWasm";
    const instanceStorage: StorageEntry[] = (instance.storage() ?? []).map((e) => ({
      key: scValToDisplay(e.key()),
      value: scValToDisplay(e.val()),
      durability: "instance" as const,
    }));
    return {
      executable: isWasm ? "wasm" : "stellar_asset",
      wasmHash: isWasm ? executable.wasmHash().toString("hex") : undefined,
      liveUntilLedgerSeq: entry.liveUntilLedgerSeq,
      lastModifiedLedgerSeq: entry.lastModifiedLedgerSeq,
      instanceStorage,
    };
  } catch {
    return null;
  }
}

export type StorageKeyKind = "symbol" | "string" | "u32" | "address";

/**
 * Build the ScVal key for a persistent/temporary storage lookup from user input.
 * There is no way to enumerate arbitrary storage keys via RPC — the caller
 * must already know the key (its type and value) they're looking for.
 */
export function parseStorageKeyInput(raw: string, kind: StorageKeyKind): xdr.ScVal {
  switch (kind) {
    case "symbol":
      return xdr.ScVal.scvSymbol(raw);
    case "string":
      return xdr.ScVal.scvString(raw);
    case "u32":
      return xdr.ScVal.scvU32(Number(raw));
    case "address":
      return new Address(raw).toScVal();
  }
}

export async function lookupStorageEntry(
  contractId: string,
  key: xdr.ScVal,
  durability: "persistent" | "temporary"
): Promise<StorageEntry | null> {
  try {
    const entry = await server().getContractData(
      contractId,
      key,
      durability === "temporary" ? rpc.Durability.Temporary : rpc.Durability.Persistent
    );
    return {
      key: scValToDisplay(key),
      value: scValToDisplay(entry.val.contractData().val()),
      durability,
    };
  } catch {
    return null;
  }
}

/** Fetch WASM bytecode size and best-effort parse its embedded ABI (contract spec), if any. */
export async function getContractWasmInfo(contractId: string): Promise<ContractWasmInfo | null> {
  try {
    const wasm = await server().getContractWasmByContractId(contractId);
    return {
      size: wasm.length,
      functions: parseContractSpec(wasm),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch recent events emitted by a contract. Bounded by the RPC node's
 * retention window (public nodes typically retain ~24h) — not full history.
 */
export async function getContractEvents(contractId: string, limit = 50): Promise<ContractEvent[]> {
  try {
    const s = server();
    const latest = await s.getLatestLedger();
    const startLedger = Math.max(1, latest.sequence - 17280);
    const res = await s.getEvents({
      startLedger,
      filters: [{ type: "contract", contractIds: [contractId] }],
      limit,
    });
    return res.events
      .map((e) => ({
        id: e.id,
        contractId,
        type: e.type,
        topic: e.topic.map(scValToDisplay),
        value: scValToDisplay(e.value),
        txHash: e.txHash,
        ledger: e.ledger,
        timestamp: e.ledgerClosedAt,
      }))
      .reverse();
  } catch {
    return [];
  }
}

/**
 * Derive a contract's recent invocation history from its emitted events:
 * each event names the transaction that produced it, so we resolve the
 * unique set of recent transaction hashes and decode each one's invoked
 * function + args. This is a proxy for "invocation history" — contracts
 * that never emit events won't show up here, and coverage is bounded by
 * the same RPC retention window as getContractEvents.
 */
export async function getInvocationHistory(contractId: string, limit = 20): Promise<InvocationHistoryItem[]> {
  const events = await getContractEvents(contractId, 200);
  const txHashes = Array.from(new Set(events.map((e) => e.txHash))).slice(0, limit);

  const items = await Promise.all(
    txHashes.map(async (txHash): Promise<InvocationHistoryItem | null> => {
      try {
        const res = await server().getTransaction(txHash);
        if (res.status === rpc.Api.GetTransactionStatus.NOT_FOUND) return null;
        const invocation = decodeInvocation(res.envelopeXdr);
        return {
          txHash,
          ledger: res.ledger,
          timestamp: new Date(res.createdAt * 1000).toISOString(),
          functionName: invocation?.functionName,
          args: invocation?.args,
          successful: res.status === rpc.Api.GetTransactionStatus.SUCCESS,
        };
      } catch {
        return null;
      }
    })
  );

  return items
    .filter((i): i is InvocationHistoryItem => i !== null)
    .sort((a, b) => b.ledger - a.ledger);
}

/**
 * Best-effort fetch of a Soroban invocation's return value, for a
 * transaction the RPC node still has in its retention window. Returns
 * null for older transactions Horizon can still show but the RPC node
 * has already pruned.
 */
export async function getInvocationReturnValue(txHash: string): Promise<string | null> {
  try {
    const res = await server().getTransaction(txHash);
    if (res.status !== rpc.Api.GetTransactionStatus.SUCCESS) return null;
    return res.returnValue ? scValToDisplay(res.returnValue) : null;
  } catch {
    return null;
  }
}

export interface NetworkActivityItem {
  contractId: string;
  topic: string;
  txHash: string;
  ledger: number;
  timestamp: string;
}

/** Recent contract events across the whole network (not scoped to one contract) — real activity, for display purposes like a landing page feed. */
export async function getRecentNetworkActivity(limit = 5): Promise<NetworkActivityItem[]> {
  try {
    const s = server();
    const latest = await s.getLatestLedger();
    const res = await s.getEvents({
      startLedger: Math.max(1, latest.sequence - 100),
      filters: [{ type: "contract" }],
      limit,
    });
    return res.events
      .map((e) => ({
        contractId: e.contractId?.toString() ?? "",
        topic: e.topic[0] ? scValToDisplay(e.topic[0]) : "event",
        txHash: e.txHash,
        ledger: e.ledger,
        timestamp: e.ledgerClosedAt,
      }))
      .reverse();
  } catch {
    return [];
  }
}

export interface SimulationResult {
  success: boolean;
  returnValue?: string;
  error?: string;
  resourceFeeStroops?: string;
  instructions?: number;
}

/**
 * Simulate a contract function call (read-only preview — no signing, no
 * submission, no funds at risk). Builds a throwaway unsigned transaction
 * against a fresh, never-funded keypair purely to run simulateTransaction —
 * simulation doesn't require the source account to actually exist.
 */
export async function simulateInvocation(
  contractId: string,
  functionName: string,
  args: xdr.ScVal[]
): Promise<SimulationResult> {
  const { Contract, TransactionBuilder, Account, BASE_FEE, Networks, Keypair } = await import(
    "@stellar/stellar-sdk"
  );
  try {
    const network = process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
    const source = new Account(Keypair.random().publicKey(), "0");
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(30)
      .build();

    const sim = await server().simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      return { success: false, error: sim.error };
    }
    const resources = sim.transactionData.build().resources();
    return {
      success: true,
      returnValue: sim.result?.retval ? scValToDisplay(sim.result.retval) : undefined,
      resourceFeeStroops: String(sim.minResourceFee),
      instructions: resources.instructions(),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
