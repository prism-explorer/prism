import { createHash } from "node:crypto";
import { Address, StrKey, xdr, scValToNative } from "@stellar/stellar-sdk";

function toDisplaySafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  if (Array.isArray(value)) return value.map(toDisplaySafe);
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries()).map(([k, v]) => [String(toDisplaySafe(k)), toDisplaySafe(v)])
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toDisplaySafe(v)])
    );
  }
  return value;
}

/** Decode an ScVal to a compact display string. Mirrors frontend/src/lib/xdr.ts's scValToDisplay. */
export function scValToDisplay(val: xdr.ScVal): string {
  const switchName = val.switch().name;
  if (switchName === "scvVoid") return "void";
  if (switchName === "scvLedgerKeyContractInstance") return "__instance__";
  // scvContractInstance wraps an ScContractInstance struct (executable + storage
  // map), not plain data — scValToNative doesn't decode it, and JSON-stringifying
  // it directly dumps the internal js-xdr class. Callers that expect a contract
  // instance value should read it via .instance() instead of this function.
  if (switchName === "scvContractInstance") return "(contract instance)";
  try {
    const decoded = toDisplaySafe(scValToNative(val));
    return typeof decoded === "string" ? decoded : JSON.stringify(decoded);
  } catch {
    return "(unrepresentable value)";
  }
}

function scValToXdr(val: xdr.ScVal): string { return val.toXDR("base64"); }

export interface DecodedInvocation {
  contractId: string;
  functionName: string;
  args: unknown;
}

function unwrapTx(envelope: xdr.TransactionEnvelope) {
  return envelope.switch().name === "envelopeTypeTxFeeBump"
    ? envelope.feeBump().tx().innerTx().v1().tx()
    : envelope.v1().tx();
}

export function decodeInvocation(envelope: xdr.TransactionEnvelope): DecodedInvocation | null {
  try {
    const tx = unwrapTx(envelope);
    for (const op of tx.operations()) {
      if (op.body().switch().name !== "invokeHostFunction") continue;
      const hostFn = op.body().invokeHostFunctionOp().hostFunction();
      if (hostFn.switch().name !== "hostFunctionTypeInvokeContract") continue;
      const invoke = hostFn.invokeContract();
      return {
        contractId: Address.fromScAddress(invoke.contractAddress()).toString(),
        functionName: invoke.functionName().toString(),
        args: invoke.args().map(scValToDisplay),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function extractInvocationReturnValue(meta: xdr.TransactionMeta): string | null {
  const returnValue = sorobanReturnValue(meta);
  return returnValue ? scValToDisplay(returnValue) : null;
}

export interface DecodedContractCreation {
  contractId: string;
  creator: string;
}

export function decodeContractCreation(
  envelope: xdr.TransactionEnvelope,
  meta: xdr.TransactionMeta,
  creator: string
): DecodedContractCreation | null {
  try {
    const tx = unwrapTx(envelope);
    const createsContract = tx.operations().some((op) => {
      if (op.body().switch().name !== "invokeHostFunction") return false;
      const hostFunction = op.body().invokeHostFunctionOp().hostFunction();
      const kind = hostFunction.switch().name;
      return kind === "hostFunctionTypeCreateContract" || kind === "hostFunctionTypeCreateContractV2";
    });
    if (!createsContract) return null;
    const returnValue = sorobanReturnValue(meta);
    if (!returnValue) return null;
    if (returnValue.switch().name !== "scvAddress") return null;
    return {
      contractId: Address.fromScAddress(returnValue.address()).toString(),
      creator,
    };
  } catch {
    return null;
  }
}

/** Return every contract instance created by this transaction, including
 * instances created by a factory contract. */
export function decodeContractCreations(
  meta: xdr.TransactionMeta,
  creator: string
): DecodedContractCreation[] {
  const version = meta.switch();
  const value = version === 4 ? meta.v4() : version === 3 ? meta.v3() : null;
  if (!value) return [];
  const out: DecodedContractCreation[] = [];
  for (const operation of value.operations()) {
    for (const change of operation.changes()) {
      if (change.switch().name !== "ledgerEntryCreated") continue;
      const entry = change.created().data();
      if (entry.switch().name !== "contractData") continue;
      const data = entry.contractData();
      if (data.key().switch().name !== "scvLedgerKeyContractInstance") continue;
      try {
        out.push({ contractId: Address.fromScAddress(data.contract()).toString(), creator });
      } catch {
        // Ignore malformed ledger entries while retaining the rest of a page.
      }
    }
  }
  return out;
}

function sorobanReturnValue(meta: xdr.TransactionMeta): xdr.ScVal | null {
  try {
    if (meta.switch() === 3) return meta.v3().sorobanMeta()?.returnValue() ?? null;
    if (meta.switch() === 4) return meta.v4().sorobanMeta()?.returnValue() ?? null;
  } catch {
    return null;
  }
  return null;
}

export interface DecodedStorageChange {
  contractId: string;
  durability: "persistent" | "temporary" | "instance";
  keyDisplay: string;
  keyXdr: string;
  valueDisplay: string | null;
  changeType: "created" | "updated" | "removed" | "state";
  keyHash?: string;
}

/**
 * Extract every ContractData ledger-entry change from a transaction's
 * per-operation meta. Includes "state" rows (the entry's value immediately
 * before this operation) alongside created/updated/removed, giving a full
 * append-only change log rather than just latest-value snapshots.
 */
/** Hash the XDR LedgerKey exactly as Stellar TTL entries reference it. */
function contractDataKeyHash(cd: { contract(): xdr.ScAddress; key(): xdr.ScVal; durability(): xdr.ContractDataDurability }): string {
  const key = new xdr.LedgerKeyContractData({
    contract: cd.contract(),
    key: cd.key(),
    durability: cd.durability(),
  });
  return createHash("sha256").update(xdr.LedgerKey.contractData(key).toXDR()).digest("hex");
}

export interface DecodedTtlChange {
  keyHash: string;
  liveUntilLedger: number | null;
}

/** TTL ledger entries carry the hash of their corresponding contract-data key. */
export function extractTtlChanges(meta: xdr.TransactionMeta): DecodedTtlChange[] {
  const version = meta.switch();
  const value = version === 4 ? meta.v4() : version === 3 ? meta.v3() : null;
  if (!value) return [];
  const changes: DecodedTtlChange[] = [];
  for (const operation of value.operations()) {
    for (const change of operation.changes()) {
      const kind = change.switch().name;
      if (kind === "ledgerEntryRemoved") {
        const key = change.removed();
        if (key.switch().name === "ttl") {
          changes.push({ keyHash: Buffer.from(key.ttl().keyHash()).toString("hex"), liveUntilLedger: null });
        }
        continue;
      }
      const entry = kind === "ledgerEntryCreated" ? change.created()
        : kind === "ledgerEntryUpdated" ? change.updated() : null;
      if (!entry || entry.data().switch().name !== "ttl") continue;
      const ttl = entry.data().ttl();
      changes.push({ keyHash: Buffer.from(ttl.keyHash()).toString("hex"), liveUntilLedger: ttl.liveUntilLedgerSeq() });
    }
  }
  return changes;
}

export function extractStorageChanges(meta: xdr.TransactionMeta): DecodedStorageChange[] {
  const switchValue = meta.switch();
  const v = switchValue === 4 ? meta.v4() : switchValue === 3 ? meta.v3() : null;
  if (!v) return [];

  const out: DecodedStorageChange[] = [];
  for (const opMeta of v.operations()) {
    for (const change of opMeta.changes()) {
      const kind = change.switch().name;
      if (kind === "ledgerEntryRemoved") {
        const key = change.removed();
        if (key.switch().name !== "contractData") continue;
        const cd = key.contractData();
        out.push({
          contractId: Address.fromScAddress(cd.contract()).toString(),
          durability: cd.durability().name as "persistent" | "temporary",
          keyDisplay: scValToDisplay(cd.key()),
          keyXdr: scValToXdr(cd.key()),
          valueDisplay: null,
          changeType: "removed",
          keyHash: contractDataKeyHash(cd),
        });
        continue;
      }

      const entry =
        kind === "ledgerEntryCreated"
          ? change.created()
          : kind === "ledgerEntryUpdated"
            ? change.updated()
            : kind === "ledgerEntryState"
              ? change.state()
              : null;
      if (!entry) continue;

      const data = entry.data();
      if (data.switch().name !== "contractData") continue;
      const cd = data.contractData();
      const isInstanceKey = cd.key().switch().name === "scvLedgerKeyContractInstance";
      const changeType =
        kind === "ledgerEntryCreated" ? "created" : kind === "ledgerEntryUpdated" ? "updated" : "state";
      const contractId = Address.fromScAddress(cd.contract()).toString();

      if (isInstanceKey) {
        out.push(...expandInstanceEntry(contractId, cd.val(), changeType).map((row) => ({
          ...row, keyHash: contractDataKeyHash(cd),
        })));
        continue;
      }

      out.push({
        contractId,
        durability: cd.durability().name as "persistent" | "temporary",
        keyDisplay: scValToDisplay(cd.key()),
        keyXdr: scValToXdr(cd.key()),
        valueDisplay: scValToDisplay(cd.val()),
        changeType,
        keyHash: contractDataKeyHash(cd),
      });
    }
  }
  return out;
}

/**
 * The contract instance entry's value is an ScContractInstance struct
 * (executable + an instance-storage map), not plain data — unpack it into
 * one row for the WASM hash (tracks upgrades) plus one row per instance
 * storage entry, rather than dumping the struct as an opaque blob.
 */
function expandInstanceEntry(
  contractId: string,
  val: xdr.ScVal,
  changeType: DecodedStorageChange["changeType"]
): DecodedStorageChange[] {
  if (val.switch().name !== "scvContractInstance") return [];
  const instance = val.instance();
  const out: DecodedStorageChange[] = [];

  const executable = instance.executable();
  if (executable.switch().name === "contractExecutableWasm") {
    out.push({
      contractId,
      durability: "instance",
      keyDisplay: "__wasm_hash__",
      keyXdr: "__wasm_hash__",
      valueDisplay: executable.wasmHash().toString("hex"),
      changeType,
    });
  }

  for (const entry of instance.storage() ?? []) {
    out.push({
      contractId,
      durability: "instance",
      keyDisplay: scValToDisplay(entry.key()),
      keyXdr: scValToXdr(entry.key()),
      valueDisplay: scValToDisplay(entry.val()),
      changeType,
    });
  }

  return out;
}

export interface DecodedEvent {
  eventId: string;
  contractId: string;
  type: string;
  topic: string[];
  value: string;
  topicXdr: string[];
  valueXdr: string;
}

/**
 * Extract contract-type events (skips system/diagnostic) from a transaction's
 * meta. V4 carries events per operation; V3 carries them once on the
 * transaction's Soroban meta. A Soroban transaction has exactly one operation,
 * so V3's events are attributed to operation 0.
 */
export function extractEvents(meta: xdr.TransactionMeta, txHash: string): DecodedEvent[] {
  const switchValue = meta.switch();
  if (switchValue === 3) {
    const events = meta.v3().sorobanMeta()?.events() ?? [];
    return events.flatMap((event, eventIndex) => decodeEvent(event, txHash, 0, eventIndex));
  }
  if (switchValue !== 4) return [];

  const out: DecodedEvent[] = [];
  meta.v4().operations().forEach((opMeta, opIndex) => {
    opMeta.events().forEach((event, eventIndex) => {
      out.push(...decodeEvent(event, txHash, opIndex, eventIndex));
    });
  });
  return out;
}

function decodeEvent(
  event: xdr.ContractEvent,
  txHash: string,
  opIndex: number,
  eventIndex: number
): DecodedEvent[] {
  if (event.type().name !== "contract") return [];
  // The generated type says Hash (Opaque[]) but js-xdr represents fixed
  // opaque values as Buffer at runtime — same as elsewhere in this codebase.
  let contractIdBuf: Buffer | null;
  try {
    contractIdBuf = event.contractId() as unknown as Buffer | null;
  } catch {
    return [];
  }
  if (!contractIdBuf) return [];

  const body = event.body().v0();
  return [
    {
      eventId: `${txHash}-${opIndex}-${eventIndex}`,
      contractId: StrKey.encodeContract(contractIdBuf),
      type: event.type().name,
      topic: body.topics().map(scValToDisplay),
      value: scValToDisplay(body.data()),
      topicXdr: body.topics().map((topic) => topic.toXDR("base64")),
      valueXdr: body.data().toXDR("base64"),
    },
  ];
}
