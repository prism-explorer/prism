"use server";

import { coerceArgInput } from "./xdr";
import {
  lookupStorageEntry,
  parseStorageKeyInput,
  simulateInvocation,
  type StorageKeyKind,
  type SimulationResult,
} from "./soroban";
import type { StorageEntry } from "@/types";

export async function lookupStorageKeyAction(
  contractId: string,
  kind: StorageKeyKind,
  rawKey: string,
  durability: "persistent" | "temporary"
): Promise<StorageEntry | { error: string }> {
  if (!rawKey.trim()) return { error: "Enter a key to look up." };
  try {
    const key = parseStorageKeyInput(rawKey.trim(), kind);
    const entry = await lookupStorageEntry(contractId, key, durability);
    return entry ?? { error: "No entry found — check the key type/durability, or it may not exist." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid key." };
  }
}

export async function simulateInvocationAction(
  contractId: string,
  functionName: string,
  args: { value: string; type: string }[]
): Promise<SimulationResult> {
  try {
    const scArgs = args.map((a) => coerceArgInput(a.value, a.type));
    return await simulateInvocation(contractId, functionName, scArgs);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Invalid arguments." };
  }
}
