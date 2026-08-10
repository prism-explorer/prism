// XDR / ScVal decoding utilities for Prism, built on @stellar/stellar-sdk.
import { Address, xdr, scValToNative, nativeToScVal } from "@stellar/stellar-sdk";
import { XdrReader } from "@stellar/js-xdr";
import type { ResourceUsage, SorobanInvocation } from "@/types";

/**
 * Coerce a plain-text form input into an ScVal for a given spec type name
 * (as produced by parseContractSpec, e.g. "U32", "Address", "Vec<Symbol>").
 * Scalar types get direct, exact conversions; compound/UDT types fall back
 * to best-effort JSON parsing — good enough for a preview tool, not a
 * substitute for a typed SDK binding.
 */
export function coerceArgInput(raw: string, specType: string): xdr.ScVal {
  const t = specType.toLowerCase();
  if (t === "bool") return nativeToScVal(raw.trim().toLowerCase() === "true");
  if (t === "u32") return nativeToScVal(Number(raw), { type: "u32" });
  if (t === "i32") return nativeToScVal(Number(raw), { type: "i32" });
  if (t === "u64") return nativeToScVal(BigInt(raw), { type: "u64" });
  if (t === "i64") return nativeToScVal(BigInt(raw), { type: "i64" });
  if (t === "u128") return nativeToScVal(BigInt(raw), { type: "u128" });
  if (t === "i128") return nativeToScVal(BigInt(raw), { type: "i128" });
  if (t === "symbol") return nativeToScVal(raw, { type: "symbol" });
  if (t === "string") return nativeToScVal(raw, { type: "string" });
  if (t === "address") return nativeToScVal(raw, { type: "address" });
  if (t === "bytes") return nativeToScVal(Buffer.from(raw.replace(/^0x/, ""), "hex"), { type: "bytes" });
  try {
    return nativeToScVal(JSON.parse(raw));
  } catch {
    return nativeToScVal(raw);
  }
}

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

/** Decode an XDR ScVal into a JSON-safe native JS value (bigints/bytes normalized to strings). */
export function decodeScVal(val: xdr.ScVal): unknown {
  try {
    return toDisplaySafe(scValToNative(val));
  } catch {
    return undefined;
  }
}

/** Decode an XDR ScVal to a compact, human-readable string for display. */
export function scValToDisplay(val: xdr.ScVal): string {
  if (val.switch().name === "scvVoid") return "void";
  const decoded = decodeScVal(val);
  if (decoded === undefined) return "(unrepresentable value)";
  return typeof decoded === "string" ? decoded : JSON.stringify(decoded);
}

/** Decode a base64-encoded ScVal XDR string to a display string. Falls back to the raw base64 on failure. */
export function decodeXdr(xdrBase64: string): string {
  try {
    return scValToDisplay(xdr.ScVal.fromXDR(xdrBase64, "base64"));
  } catch {
    return xdrBase64;
  }
}

/** Decode a base64-encoded ScVal XDR string to a native JS value. */
export function decodeScValXdr(xdrBase64: string): unknown {
  try {
    return decodeScVal(xdr.ScVal.fromXDR(xdrBase64, "base64"));
  } catch {
    return undefined;
  }
}

export interface ParsedFunctionSpec {
  name: string;
  inputs: { name: string; type: string }[];
  outputs: string[];
}

/**
 * Extract and parse a contract's embedded spec (ABI) from its WASM binary's
 * "contractspecv0" custom section. Not every contract embeds one (e.g. ones
 * built without the spec-emitting macros) — returns [] when absent or unparsable.
 */
export function parseContractSpec(wasm: Buffer): ParsedFunctionSpec[] {
  try {
    const mod = new WebAssembly.Module(new Uint8Array(wasm));
    const sections = WebAssembly.Module.customSections(mod, "contractspecv0");
    if (sections.length === 0) return [];

    const entries: xdr.ScSpecEntry[] = [];
    for (const section of sections) {
      const reader = new XdrReader(Buffer.from(section));
      while (!reader.eof) {
        // stellar-sdk's generated .d.ts types read() as taking a Buffer, but
        // at runtime it reads from a stateful js-xdr cursor (XdrReader) — the
        // declaration is stale relative to the implementation.
        entries.push(xdr.ScSpecEntry.read(reader as unknown as Buffer));
      }
    }

    return entries
      .filter((e) => e.switch().name === "scSpecEntryFunctionV0")
      .map((e) => {
        const fn = e.functionV0();
        return {
          name: fn.name().toString(),
          inputs: fn.inputs().map((input) => ({
            name: input.name().toString(),
            type: specTypeToString(input.type()),
          })),
          outputs: fn.outputs().map(specTypeToString),
        };
      });
  } catch {
    return [];
  }
}

function unwrapTx(envelope: xdr.TransactionEnvelope) {
  return envelope.switch().name === "envelopeTypeTxFeeBump"
    ? envelope.feeBump().tx().innerTx().v1().tx()
    : envelope.v1().tx();
}

/** Decode a transaction envelope's InvokeHostFunction operation (function name + args), if any. */
export function decodeInvocation(envelope: xdr.TransactionEnvelope): SorobanInvocation | null {
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

/** Decode a transaction envelope's Soroban resource footprint (instructions, I/O bytes, resource fee), if any. */
export function getResourceUsage(envelope: xdr.TransactionEnvelope): ResourceUsage | null {
  try {
    const tx = unwrapTx(envelope);
    const ext = tx.ext();
    if (ext.switch() !== 1) return null;
    const data = ext.sorobanData();
    const resources = data.resources();
    return {
      instructions: resources.instructions(),
      readBytes: resources.diskReadBytes(),
      writeBytes: resources.writeBytes(),
      resourceFeeStroops: data.resourceFee().toString(),
    };
  } catch {
    return null;
  }
}

function specTypeToString(type: xdr.ScSpecTypeDef): string {
  const kind = type.switch().name;
  switch (kind) {
    case "scSpecTypeVec":
      return `Vec<${specTypeToString(type.vec().elementType())}>`;
    case "scSpecTypeMap":
      return `Map<${specTypeToString(type.map().keyType())}, ${specTypeToString(type.map().valueType())}>`;
    case "scSpecTypeOption":
      return `Option<${specTypeToString(type.option().valueType())}>`;
    case "scSpecTypeResult":
      return `Result<${specTypeToString(type.result().okType())}>`;
    case "scSpecTypeUdt":
      return type.udt().name().toString();
    default:
      return kind.replace(/^scSpecType/, "");
  }
}
