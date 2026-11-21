import type {
  AccountRecord,
  LedgerRecord,
  OperationField,
  OperationRecord,
  TransactionRecord,
} from "@/types";
import { config } from "./config";
import { shortHash } from "./format";

const BASE_URL = config.horizonUrl;

/**
 * A non-ok response from Horizon, carrying the status so callers can tell
 * "this record doesn't exist" apart from "Horizon didn't answer". `detail` is
 * the problem JSON's explanation of the failure, when Horizon sent one.
 */
export class HorizonError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly detail?: string
  ) {
    super(`Horizon error ${status}: ${path}${detail ? ` (${detail})` : ""}`);
    this.name = "HorizonError";
  }
}

/** True only when Horizon positively reported the record as missing. */
export function isNotFound(error: unknown): boolean {
  return error instanceof HorizonError && error.status === 404;
}

const REVALIDATE_SHORT = 10;
const REVALIDATE_FINALIZED = 300;

async function get<T>(path: string, revalidate = REVALIDATE_SHORT): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await problemDetail(res);
    // A 404 is an ordinary answer ("no such record"), so it stays out of the log.
    if (res.status !== 404) console.error(`Horizon ${res.status} for ${path}: ${detail ?? "no detail"}`);
    throw new HorizonError(res.status, path, detail);
  }
  return res.json();
}

/**
 * Horizon answers failures with a problem JSON document whose `detail` (or
 * `title`) says what went wrong. A body that isn't JSON has nothing to add.
 */
async function problemDetail(res: Response): Promise<string | undefined> {
  try {
    const problem = (await res.json()) as { title?: string; detail?: string };
    return problem.detail || problem.title || undefined;
  } catch {
    return undefined;
  }
}

// Horizon's JSON as it actually arrives. Worth spelling out rather than
// reaching into `any`: Horizon returns several numeric fields as strings
// (anything that can exceed 2^53 — fees, balances, sequence numbers), and
// mapping those straight through produces values that lie about their own
// type. Only the fields Prism reads are modelled.

interface HorizonPage<T> {
  _embedded: { records: T[] };
}

interface HorizonLedger {
  sequence: number;
  hash: string;
  closed_at: string;
  operation_count: number;
  base_fee_in_stroops: number;
  successful_transaction_count: number;
  failed_transaction_count: number;
  protocol_version: number;
  max_tx_set_size: number;
  tx_set_operation_count: number;
}

interface HorizonTransaction {
  hash: string;
  ledger: number;
  created_at: string;
  source_account: string;
  /** A string in Horizon's JSON — fees are unbounded. */
  fee_charged: string | number;
  operation_count: number;
  successful: boolean;
  memo?: string | null;
  memo_type?: string;
  /** Fee bump fields. Horizon only sends these for a wrapped transaction. */
  fee_account?: string;
  fee_bump_transaction?: { hash: string };
  inner_transaction?: {
    hash: string;
    source_account?: string;
    /** Newer Horizon versions report the inner fee here; older ones use max_fee. */
    fee_charged?: string | number;
    max_fee?: string | number;
  };
  envelope_xdr: string;
  result_xdr: string;
  paging_token?: string;
}

/**
 * The subset of a Horizon operation record Prism renders. The index signature
 * covers the fields only present on some types (and the raw fallback).
 */
interface HorizonOperation {
  id: string;
  type: string;
  source_account?: string;
  from?: string;
  to?: string;
  account?: string;
  destination?: string;
  amount?: string;
  starting_balance?: string;
  limit?: string;
  offer_id?: string;
  price?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  source_asset_type?: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
  selling_asset_type?: string;
  selling_asset_code?: string;
  selling_asset_issuer?: string;
  buying_asset_type?: string;
  buying_asset_code?: string;
  buying_asset_issuer?: string;
  source_amount?: string;
  function?: string;
  bump_to?: string;
  [field: string]: unknown;
}

interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  liquidity_pool_id?: string;
  balance: string;
  limit?: string;
  is_authorized?: boolean;
  is_authorized_to_maintain_liabilities?: boolean;
  liabilities?: {
    buying?: string;
    selling?: string;
  };
}

interface HorizonSigner {
  key: string;
  weight: number;
  type: string;
}

interface HorizonAccount {
  account_id: string;
  /** A string in Horizon's JSON — sequence numbers are int64. */
  sequence: string;
  subentry_count: number;
  last_modified_ledger: number;
  thresholds: { low_threshold: number; med_threshold: number; high_threshold: number };
  flags: {
    auth_required: boolean;
    auth_revocable: boolean;
    auth_immutable: boolean;
    auth_clawback_enabled: boolean;
  };
  balances: HorizonBalance[];
  signers?: HorizonSigner[];
  home_domain?: string;
  sponsor?: string;
  num_sponsoring?: number;
  num_sponsored?: number;
}

export async function getLatestLedger(): Promise<LedgerRecord> {
  const data = await get<HorizonPage<HorizonLedger>>("/ledgers?order=desc&limit=1");
  return mapLedger(data._embedded.records[0]);
}

export async function getLedger(sequence: number): Promise<LedgerRecord> {
  const data = await get<HorizonLedger>(`/ledgers/${sequence}`, REVALIDATE_FINALIZED);
  return mapLedger(data);
}

export async function getTransaction(hash: string): Promise<TransactionRecord> {
  const data = await get<HorizonTransaction>(`/transactions/${hash}`, REVALIDATE_FINALIZED);
  return mapTransaction(data);
}

/**
 * Operations are a separate Horizon resource. A transaction holds at most 100
 * of them, so one page covers every case without following cursors.
 */
export async function getTransactionOperations(hash: string): Promise<OperationRecord[]> {
  const data = await get<HorizonPage<HorizonOperation>>(
    `/transactions/${hash}/operations?limit=200`,
    REVALIDATE_FINALIZED
  );
  return data._embedded.records.map(mapOperation);
}

export async function getRecentTransactions(limit = 20): Promise<TransactionRecord[]> {
  const data = await get<HorizonPage<HorizonTransaction>>(`/transactions?order=desc&limit=${limit}`);
  return data._embedded.records.map(mapTransaction);
}

export async function getAccount(id: string): Promise<AccountRecord> {
  const data = await get<HorizonAccount>(`/accounts/${id}`);
  return mapAccount(data);
}

export async function getAccountTransactions(
  id: string,
  limit = 20,
  cursor?: string
): Promise<{ records: TransactionRecord[]; nextCursor?: string }> {
  const params = new URLSearchParams({ order: "desc", limit: String(limit) });
  if (cursor) params.append("cursor", cursor);
  const data = await get<HorizonPage<HorizonTransaction>>(
    `/accounts/${id}/transactions?${params}`
  );

  const records = data._embedded.records.map(mapTransaction);

  // The cursor for the next page is the paging_token of the last record
  const nextCursor = records.length > 0 ? records[records.length - 1].pagingToken : undefined;

  return { records, nextCursor };
}

/**
 * Fetch all transactions in a ledger. Issue #279.
 */
export async function getLedgerTransactions(
  sequence: number,
  limit = 20,
  cursor?: string
): Promise<{ records: TransactionRecord[]; nextCursor?: string }> {
  const params = new URLSearchParams({ order: "desc", limit: String(limit) });
  if (cursor) params.append("cursor", cursor);
  const data = await get<HorizonPage<HorizonTransaction>>(
    `/ledgers/${sequence}/transactions?${params}`,
    REVALIDATE_FINALIZED
  );

  const records = data._embedded.records.map(mapTransaction);
  const nextCursor = records.length > 0 ? records[records.length - 1].pagingToken : undefined;

  return { records, nextCursor };
}

export interface NetworkPulse {
  sequence: number;
  transactionsPerSecond: number;
  closeTimeSeconds: number;
  operationCount: number;
  baseFee: number;
}

/**
 * A snapshot of network activity derived from the 10 most recent ledgers.
 * Transactions per second and close time are averaged over the sample window
 * to smooth out ledger-to-ledger noise. Issue #284.
 */
export async function getNetworkPulse(): Promise<NetworkPulse> {
  const data = await get<HorizonPage<HorizonLedger>>("/ledgers?order=desc&limit=10");
  const records = data._embedded.records;
  const latest = records[0];

  // Average close times and transaction counts across all 10 ledgers
  let totalCloseTime = 0;
  let totalTransactions = 0;

  for (let i = 0; i < records.length - 1; i++) {
    const current = records[i];
    const prev = records[i + 1];
    const closeTime =
      (new Date(current.closed_at).getTime() - new Date(prev.closed_at).getTime()) / 1000;
    const txCount = current.successful_transaction_count + current.failed_transaction_count;

    totalCloseTime += closeTime;
    totalTransactions += txCount;
  }

  const avgCloseTime = totalCloseTime / (records.length - 1);
  const avgTransactionsPerSecond = avgCloseTime > 0 ? totalTransactions / totalCloseTime : 0;

  return {
    sequence: latest.sequence,
    transactionsPerSecond: avgTransactionsPerSecond,
    closeTimeSeconds: avgCloseTime,
    operationCount: latest.operation_count,
    baseFee: latest.base_fee_in_stroops,
  };
}

/**
 * Horizon returns int64-capable fields as JSON strings. Prism formats fees as
 * numbers, and every fee is far below 2^53, so converting is safe here —
 * unlike balances, which can exceed it and stay strings all the way to the UI.
 */
function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapLedger(r: HorizonLedger): LedgerRecord {
  return {
    sequence: r.sequence,
    hash: r.hash,
    closedAt: r.closed_at,
    transactionCount: r.successful_transaction_count + r.failed_transaction_count,
    operationCount: r.operation_count,
    baseFee: r.base_fee_in_stroops,
    successfulTransactionCount: r.successful_transaction_count,
    failedTransactionCount: r.failed_transaction_count,
    protocolVersion: r.protocol_version,
    maxTxSetSize: r.max_tx_set_size,
    txSetOperationCount: r.tx_set_operation_count,
  };
}

function mapAccount(r: HorizonAccount): AccountRecord {
  return {
    id: r.account_id,
    sequence: r.sequence,
    subentryCount: r.subentry_count,
    lastModifiedLedger: r.last_modified_ledger,
    thresholds: {
      low: r.thresholds.low_threshold,
      med: r.thresholds.med_threshold,
      high: r.thresholds.high_threshold,
    },
    flags: {
      authRequired: r.flags.auth_required,
      authRevocable: r.flags.auth_revocable,
      authImmutable: r.flags.auth_immutable,
      authClawbackEnabled: r.flags.auth_clawback_enabled,
    },
    balances: r.balances.map((b) => ({
      assetType: b.asset_type,
      assetCode: b.asset_code,
      assetIssuer: b.asset_issuer,
      liquidityPoolId: b.liquidity_pool_id,
      balance: b.balance,
      limit: b.limit,
      isAuthorized: b.is_authorized,
      liabilities: b.liabilities,
    })),
    signerCount: r.signers?.length ?? 0,
    signers: r.signers?.map((s) => ({ key: s.key, weight: s.weight })),
    homeDomain: r.home_domain,
    sponsor: r.sponsor,
    numSponsoring: r.num_sponsoring,
    numSponsored: r.num_sponsored,
  };
}

function mapTransaction(r: HorizonTransaction): TransactionRecord {
  const inner = r.inner_transaction;
  const innerFee = inner?.fee_charged ?? inner?.max_fee;
  return {
    hash: r.hash,
    ledger: r.ledger,
    createdAt: r.created_at,
    sourceAccount: r.source_account,
    fee: toNumber(r.fee_charged),
    operationCount: r.operation_count,
    successful: r.successful,
    memo: r.memo ?? undefined,
    memoType: r.memo_type,
    feeAccount: r.fee_account,
    feeBumpTransaction: r.fee_bump_transaction
      ? { hash: r.fee_bump_transaction.hash }
      : undefined,
    innerTransaction: inner
      ? {
          hash: inner.hash,
          sourceAccount: inner.source_account,
          feeCharged: innerFee === undefined ? undefined : toNumber(innerFee),
        }
      : undefined,
    envelopeXdr: r.envelope_xdr,
    resultXdr: r.result_xdr,
    pagingToken: r.paging_token,
  };
}

/** A Horizon asset triplet reduced to one display label. */
function assetLabel(type?: string, code?: string, issuer?: string): string {
  if (type === "native") return "XLM";
  if (code && issuer) return `${code}:${shortHash(issuer, 6)}`;
  return code ?? type ?? "unknown asset";
}

/** snake_case Horizon field names become readable labels in the raw fallback. */
function fieldLabel(name: string): string {
  return name.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Pull the useful fields out of an operation. Prism only knows a handful of
 * operation types; for everything else it dumps the scalar fields verbatim so
 * the information is still on screen rather than silently disappearing.
 */
function mapOperation(r: HorizonOperation): OperationRecord {
  const fields: OperationField[] = [];
  switch (r.type) {
    case "payment":
      fields.push(
        { label: "From", value: String(r.from ?? ""), mono: true },
        { label: "To", value: String(r.to ?? ""), mono: true },
        { label: "Asset", value: assetLabel(r.asset_type, r.asset_code, r.asset_issuer) },
        { label: "Amount", value: String(r.amount ?? "") }
      );
      break;
    case "path_payment_strict_send":
    case "path_payment_strict_receive":
      fields.push(
        { label: "From", value: String(r.from ?? ""), mono: true },
        { label: "To", value: String(r.to ?? ""), mono: true },
        { label: "Asset", value: assetLabel(r.asset_type, r.asset_code, r.asset_issuer) },
        { label: "Amount", value: String(r.amount ?? "") },
        {
          label: "Source asset",
          value: assetLabel(r.source_asset_type, r.source_asset_code, r.source_asset_issuer),
        },
        { label: "Source amount", value: String(r.source_amount ?? "") }
      );
      break;
    case "create_account":
      fields.push(
        { label: "Account", value: String(r.account ?? ""), mono: true },
        { label: "Starting balance", value: String(r.starting_balance ?? "") }
      );
      break;
    case "change_trust":
      fields.push(
        { label: "Trustor", value: String(r.source_account ?? ""), mono: true },
        { label: "Asset", value: assetLabel(r.asset_type, r.asset_code, r.asset_issuer) },
        { label: "Limit", value: String(r.limit ?? "") }
      );
      break;
    case "manage_sell_offer":
    case "manage_buy_offer":
      fields.push(
        { label: "Offer ID", value: String(r.offer_id ?? "") },
        {
          label: "Selling",
          value: assetLabel(r.selling_asset_type, r.selling_asset_code, r.selling_asset_issuer),
        },
        {
          label: "Buying",
          value: assetLabel(r.buying_asset_type, r.buying_asset_code, r.buying_asset_issuer),
        },
        { label: "Amount", value: String(r.amount ?? "") },
        { label: "Price", value: String(r.price ?? "") }
      );
      break;
    case "invoke_host_function":
      fields.push({ label: "Function", value: String(r.function ?? "") });
      break;
    case "bump_sequence":
      fields.push({ label: "Bump to", value: String(r.bump_to ?? "") });
      break;
    default:
      // Unknown operation type: show every scalar field so nothing is hidden.
      for (const [key, value] of Object.entries(r)) {
        // type and source are already shown in the card header; _links is noise.
        if (["type", "source_account", "_links"].includes(key)) continue;
        if (value === null || typeof value === "object") continue;
        fields.push({ label: fieldLabel(key), value: String(value) });
      }
  }

  return {
    id: r.id,
    type: r.type,
    sourceAccount: r.source_account,
    // A field can be absent on a particular record (e.g. an unlimited trustline
    // still has `limit`, but some Horizon versions omit it). Don't render blanks.
    fields: fields.filter((f) => f.value !== ""),
    raw: ![
      "payment",
      "path_payment_strict_send",
      "path_payment_strict_receive",
      "create_account",
      "change_trust",
      "manage_sell_offer",
      "manage_buy_offer",
      "invoke_host_function",
      "bump_sequence",
    ].includes(r.type),
  };
}
