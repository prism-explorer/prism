import { Account, Address, BASE_FEE, Contract, Keypair, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import type {
  ContractEvent,
  ContractInfo,
  ContractWasmInfo,
  InvocationHistoryItem,
  SimulationFootprint,
  StorageEntry,
} from "@/types";
import {
  decodeInvocation,
  decodeScVal,
  decodeSimulationEvents,
  decodeSimulationFootprint,
  describeAuthorizations,
  parseContractEvents,
  parseContractSpec,
  parseContractTypes,
  scValToDisplay,
} from "./xdr";
import { config } from "./config";
import type { HistoryPage, PageRequest } from "./history-cursor";
import { EVENT_PAGE_SIZE, INVOCATION_PAGE_SIZE } from "./contract-lists";
import {
  isIndexerConfigured,
  getIndexedContract,
  getIndexedInvocations,
  getIndexedEvents,
  getIndexedStorageEntries,
  getIndexedInvocationReturnValue,
} from "./indexed-db";

const RPC_URL = config.sorobanRpcUrl;

let _server: rpc.Server | undefined;
function server(): rpc.Server {
  if (!_server) _server = new rpc.Server(RPC_URL, { timeout: 10_000 });
  return _server;
}

/**
 * Stellar Asset Contracts don't keep `name` / `symbol` / `decimals` as separate
 * instance keys — they pack all three into a single map under a `METADATA` key.
 * Read that map (and still accept the direct keys as a fallback for other
 * layouts), rendering the map's `decimal` field as `decimals`.
 */
export function extractSacAssetDetails(
  storage: xdr.ScMapEntry[]
): { name?: string; symbol?: string; decimals?: number } | undefined {
  const details: { name?: string; symbol?: string; decimals?: number } = {};
  for (const entry of storage) {
    const key = scValToDisplay(entry.key());
    if (key.includes("METADATA")) {
      const meta = decodeScVal(entry.val());
      if (meta && typeof meta === "object" && !Array.isArray(meta)) {
        const map = meta as Record<string, unknown>;
        if (typeof map.name === "string") details.name = map.name;
        if (typeof map.symbol === "string") details.symbol = map.symbol;
        const dec = Number(map.decimal);
        if (Number.isFinite(dec)) details.decimals = dec;
      }
      continue;
    }
    if (key === "name") details.name = scValToDisplay(entry.val());
    if (key === "symbol") details.symbol = scValToDisplay(entry.val());
    if (key === "decimals") {
      const dec = Number(scValToDisplay(entry.val()));
      if (Number.isFinite(dec)) details.decimals = dec;
    }
  }
  return details.name || details.symbol || details.decimals !== undefined ? details : undefined;
}

export async function getContractInfo(contractId: string): Promise<ContractInfo | null> {
  let info: ContractInfo;
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

    const assetDetails = isWasm ? undefined : extractSacAssetDetails(instance.storage() ?? []);

    info = {
      executable: isWasm ? "wasm" : "stellar_asset",
      wasmHash: isWasm ? executable.wasmHash().toString("hex") : undefined,
      liveUntilLedgerSeq: entry.liveUntilLedgerSeq,
      lastModifiedLedgerSeq: entry.lastModifiedLedgerSeq,
      instanceStorage,
      assetDetails,
    };
  } catch {
    return null;
  }

  const indexed = await getIndexedContract(contractId);
  return {
    ...info,
    creator: indexed?.creator,
    deploymentLedger: indexed?.deploymentLedger,
  };
}

export type StorageKeyKind = "symbol" | "string" | "u32" | "address";

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

export async function getFullStorageEntries(contractId: string): Promise<StorageEntry[]> {
  if (!isIndexerConfigured()) return [];
  const indexed = await getIndexedStorageEntries(contractId);
  return indexed.map((e) => ({
    key: e.keyDisplay,
    value: e.valueDisplay,
    durability: e.durability as StorageEntry["durability"],
  }));
}

/**
 * Cache of parsed WASM ABI results keyed by the WASM hash (hex string). A
 * WASM with a given hash is immutable on-chain, so the parsed result never
 * changes. The cache is bounded to 200 entries; the oldest entry is evicted
 * when the cap is reached.
 */
const wasmAbiCache = new Map<string, ContractWasmInfo>();
const WASM_CACHE_MAX = 200;

/** Fetch WASM bytecode size and best-effort parse its embedded ABI (contract spec), if any. */
export async function getContractWasmInfo(contractId: string): Promise<ContractWasmInfo | null> {
  try {
    // Read the WASM hash from the contract instance entry first so we can
    // serve a cache hit without downloading the bytecode at all.
    const info = await getContractInfo(contractId);
    if (info?.wasmHash && wasmAbiCache.has(info.wasmHash)) {
      return wasmAbiCache.get(info.wasmHash)!;
    }

    const wasm = await server().getContractWasmByContractId(contractId);
    const result: ContractWasmInfo = {
      size: wasm.length,
      functions: parseContractSpec(wasm),
      events: parseContractEvents(wasm),
      types: parseContractTypes(wasm),
    };

    if (info?.wasmHash) {
      if (wasmAbiCache.size >= WASM_CACHE_MAX) {
        // Evict the oldest entry (Map preserves insertion order).
        const firstKey = wasmAbiCache.keys().next().value;
        if (firstKey !== undefined) wasmAbiCache.delete(firstKey);
      }
      wasmAbiCache.set(info.wasmHash, result);
    }

    return result;
  } catch {
    return null;
  }
}

/** Exported for testing only — clears the in-memory WASM ABI cache. */
export function _clearWasmAbiCacheForTesting(): void {
  wasmAbiCache.clear();
}

/**
 * Fetch recent events emitted by a contract. Uses the indexer's full
 * (forward-only, since-launch) history when one is configured
 * (DATABASE_URL set); otherwise falls back to the RPC node's retention
 * window (public nodes typically retain ~24h) — not full history.
 */
export async function getContractEvents(contractId: string, limit = EVENT_PAGE_SIZE): Promise<ContractEvent[]> {
  return (await getContractEventsPage(contractId, { limit })).items;
}

export interface ContractEventsPage extends HistoryPage<ContractEvent> {
  /**
   * Human-readable reason the RPC lookup failed, or null on success. Kept
   * separate from `items` so an RPC outage isn't mistaken for a contract that
   * genuinely emitted no events.
   */
  error: string | null;
}

/**
 * One page of a contract's events, newest first. The indexer's history pages
 * by cursor. The RPC fallback only has its retention window, so it returns that
 * window once and never offers a next page; it has nothing older to continue to.
 */
export async function getContractEventsPage(
  contractId: string,
  request: PageRequest
): Promise<ContractEventsPage> {
  if (isIndexerConfigured()) {
    const indexed = await getIndexedEvents(contractId, request);
    return {
      items: indexed.items.map((e) => ({
        id: e.eventId,
        contractId,
        type: e.type,
        topic: e.topic,
        value: e.value,
        txHash: e.txHash,
        ledger: e.ledger,
        timestamp: e.createdAt,
      })),
      nextCursor: indexed.nextCursor,
      error: null,
    };
  }
  if (request.before) return { items: [], nextCursor: null, error: null };
  return { ...(await getContractEventsFromRpc(contractId, request.limit)), nextCursor: null };
}

interface RpcEventsResult {
  items: ContractEvent[];
  error: string | null;
}

async function getContractEventsFromRpc(contractId: string, limit: number): Promise<RpcEventsResult> {
  try {
    const s = server();
    const latest = await s.getLatestLedger();
    const startLedger = Math.max(1, latest.sequence - 17280);
    const res = await s.getEvents({
      startLedger,
      filters: [{ type: "contract", contractIds: [contractId] }],
      limit,
    });
    const items = res.events
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
    return { items, error: null };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getInvocationHistory(
  contractId: string,
  limit = INVOCATION_PAGE_SIZE
): Promise<InvocationHistoryItem[]> {
  return (await getInvocationHistoryPage(contractId, { limit })).items;
}

/** One page of a contract's invocation history. The RPC fallback pages as getContractEventsPage does. */
export async function getInvocationHistoryPage(
  contractId: string,
  request: PageRequest
): Promise<HistoryPage<InvocationHistoryItem>> {
  if (isIndexerConfigured()) {
    const indexed = await getIndexedInvocations(contractId, request);
    return {
      items: indexed.items.map((i) => ({
        txHash: i.txHash,
        ledger: i.ledger,
        timestamp: i.createdAt,
        functionName: i.functionName,
        args: Array.isArray(i.args) ? i.args.map((a) => String(a)) : undefined,
        successful: i.successful,
      })),
      nextCursor: indexed.nextCursor,
    };
  }
  if (request.before) return { items: [], nextCursor: null };
  return { items: await getInvocationHistoryFromRpc(contractId, request.limit), nextCursor: null };
}

async function getInvocationHistoryFromRpc(contractId: string, limit: number): Promise<InvocationHistoryItem[]> {
  const { items: events } = await getContractEventsFromRpc(contractId, 200);
  const txHashes = Array.from(new Set(events.map((e) => e.txHash))).slice(0, limit);

  const CONCURRENCY = 4;
  const items: (InvocationHistoryItem | null)[] = [];
  for (let i = 0; i < txHashes.length; i += CONCURRENCY) {
    const batch = txHashes.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (txHash): Promise<InvocationHistoryItem | null> => {
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
    items.push(...results);
  }

  return items
    .filter((i): i is InvocationHistoryItem => i !== null)
    .sort((a, b) => b.ledger - a.ledger);
}

export async function getInvocationReturnValue(txHash: string): Promise<string | null> {
  const indexed = await getIndexedInvocationReturnValue(txHash);
  if (indexed !== null) return indexed;

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
  /** Human-readable "signer authorizes call" lines from `result.auth`. */
  auth?: string[];
  /** Contract events emitted during the simulation. */
  events?: ContractEvent[];
  /** Storage footprint and I/O figures from `transactionData`. */
  footprint?: SimulationFootprint;
  needsRestore?: {
    minResourceFeeStroops: string;
  };
}

export async function simulateInvocation(
  contractId: string,
  functionName: string,
  args: xdr.ScVal[]
): Promise<SimulationResult> {

  try {
    const network = config.networkPassphrase;
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
    if (rpc.Api.isSimulationRestore(sim)) {
      return {
        success: false,
        error: "Simulation requires restoring archived entries",
        needsRestore: {
          minResourceFeeStroops: sim.restorePreamble.minResourceFee,
        },
      };
    }
    const resources = sim.transactionData.build().resources();
    return {
      success: true,
      returnValue: sim.result?.retval ? scValToDisplay(sim.result.retval) : undefined,
      resourceFeeStroops: String(sim.minResourceFee),
      instructions: resources.instructions(),
      auth: sim.result?.auth ? describeAuthorizations(sim.result.auth) : undefined,
      events: decodeSimulationEvents(sim.events, contractId),
      footprint: decodeSimulationFootprint(resources),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
