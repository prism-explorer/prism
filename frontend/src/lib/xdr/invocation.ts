import { Address, xdr } from "@stellar/stellar-sdk";
import type { FootprintEntry, OperationInvocation, ResourceUsage, SorobanInvocation } from "@/types";
import { scValToDisplay } from "./display";

/**
 * The v1 transaction body, unwrapping a fee bump to reach the inner one.
 *
 * Returns null for v0 envelopes: they predate Soroban and have a different
 * shape (a bare ed25519 key rather than a muxed account, and no Soroban
 * resource data), so callers looking for contract activity have nothing to
 * find in one.
 */
export function v1Tx(envelope: xdr.TransactionEnvelope): xdr.Transaction | null {
  const kind = envelope.switch().name;
  if (kind === "envelopeTypeTxFeeBump") return envelope.feeBump().tx().innerTx().v1().tx();
  if (kind === "envelopeTypeTx") return envelope.v1().tx();
  return null;
}

/**
 * Decode every InvokeHostFunction contract call in a transaction envelope, in
 * operation order. A transaction can call several contracts, so each call is
 * tagged with the index of the operation it came from.
 */
export function decodeInvocations(envelope: xdr.TransactionEnvelope): OperationInvocation[] {
  try {
    const tx = v1Tx(envelope);
    if (!tx) return [];
    const invocations: OperationInvocation[] = [];
    tx.operations().forEach((op, operationIndex) => {
      if (op.body().switch().name !== "invokeHostFunction") return;
      const hostFn = op.body().invokeHostFunctionOp().hostFunction();
      if (hostFn.switch().name !== "hostFunctionTypeInvokeContract") return;
      const invoke = hostFn.invokeContract();
      invocations.push({
        operationIndex,
        contractId: Address.fromScAddress(invoke.contractAddress()).toString(),
        functionName: invoke.functionName().toString(),
        args: invoke.args().map(scValToDisplay),
      });
    });
    return invocations;
  } catch {
    return [];
  }
}

/** Decode a transaction envelope's first InvokeHostFunction contract call (function name + args), if any. */
export function decodeInvocation(envelope: xdr.TransactionEnvelope): SorobanInvocation | null {
  return decodeInvocations(envelope)[0] ?? null;
}

function bytesToHex(bytes: Iterable<number>): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Label a ledger key for the footprint list. Contract data gets its contract
 * and storage key; WASM code gets its hash; other key kinds fall back to the
 * XDR arm name so an unfamiliar entry is still visible.
 */
function ledgerKeyLabel(key: xdr.LedgerKey): string {
  const kind = key.switch().name;
  try {
    if (kind === "contractData") {
      const data = key.contractData();
      const contract = Address.fromScAddress(data.contract()).toString();
      return `${contract} — ${scValToDisplay(data.key())}`;
    }
    if (kind === "contractCode") {
      return `code ${bytesToHex(key.contractCode().hash())}`;
    }
  } catch {
    // A malformed or newer key still gets a label rather than crashing the page.
  }
  return kind;
}

/**
 * Decode a transaction envelope's Soroban resource data: limits, the resource
 * fee, and every ledger entry in its footprint (read-only and read-write).
 *
 * `feeChargedStroops`, when supplied from Horizon's transaction record, lets
 * the caller split the total fee into its inclusion and resource parts.
 */
export function getResourceUsage(
  envelope: xdr.TransactionEnvelope,
  feeChargedStroops?: string | number
): ResourceUsage | null {
  try {
    const tx = v1Tx(envelope);
    if (!tx) return null;
    const ext = tx.ext();
    if (ext.switch() !== 1) return null;
    const data = ext.sorobanData();
    const resources = data.resources();
    const footprint = resources.footprint();
    const footprintEntries: FootprintEntry[] = [
      ...footprint.readOnly().map((key): FootprintEntry => ({ access: "read", label: ledgerKeyLabel(key) })),
      ...footprint.readWrite().map((key): FootprintEntry => ({ access: "write", label: ledgerKeyLabel(key) })),
    ];
    const resourceFeeStroops = data.resourceFee().toString();
    return {
      instructions: resources.instructions(),
      readBytes: resources.diskReadBytes(),
      writeBytes: resources.writeBytes(),
      resourceFeeStroops,
      footprint: footprintEntries,
      inclusionFeeStroops:
        feeChargedStroops === undefined
          ? undefined
          : (BigInt(feeChargedStroops) - BigInt(resourceFeeStroops)).toString(),
    };
  } catch {
    return null;
  }
}
