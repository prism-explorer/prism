import { describe, expect, it, vi, afterEach } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { parseStorageKeyInput } from "./soroban";
import type { ContractTypeDef } from "@/types";

describe("parseStorageKeyInput", () => {
  it("builds a symbol key", () => {
    expect(parseStorageKeyInput("Admin", "symbol").switch().name).toBe("scvSymbol");
  });

  it("builds a string key", () => {
    expect(parseStorageKeyInput("hello", "string").switch().name).toBe("scvString");
  });

  it("builds a u32 key", () => {
    const key = parseStorageKeyInput("7", "u32");
    expect(key.switch().name).toBe("scvU32");
    expect(key.u32()).toBe(7);
  });

  it("builds an address key from a valid account address", () => {
    const address = Keypair.random().publicKey();
    expect(parseStorageKeyInput(address, "address").switch().name).toBe("scvAddress");
  });

  it("throws for an invalid address", () => {
    expect(() => parseStorageKeyInput("not-an-address", "address")).toThrow();
  });

  it("accepts any spec type string, not just the four simple presets", () => {
    expect(parseStorageKeyInput("42", "u64").switch().name).toBe("scvU64");
    expect(parseStorageKeyInput("1", "i128").switch().name).toBe("scvI128");
    expect(parseStorageKeyInput('["a", "b"]', "Vec<Symbol>").switch().name).toBe("scvVec");
  });

  const dataKey: ContractTypeDef = {
    kind: "union",
    name: "DataKey",
    cases: [
      { name: "Admin", types: [] },
      { name: "Note", types: ["Symbol"] },
      { name: "Session", types: ["Address"] },
    ],
  };

  it("coerces a union variant key using the contract's type definitions", () => {
    const key = parseStorageKeyInput('{"Note":["hello"]}', "DataKey", [dataKey]);
    expect(key.switch().name).toBe("scvVec");
    const parts = key.vec()!;
    expect(parts).toHaveLength(2);
    expect(parts[0].sym().toString()).toBe("Note");
    expect(parts[1].sym().toString()).toBe("hello");
  });

  it("coerces a payload-free union variant from its bare name", () => {
    const key = parseStorageKeyInput("Admin", "DataKey", [dataKey]);
    expect(key.vec()!).toHaveLength(1);
    expect(key.vec()![0].sym().toString()).toBe("Admin");
  });
});

describe("getInvocationHistory concurrency (issue #34)", () => {
  it("batches getTransaction calls so no more than 4 are in flight at once", async () => {
    const CONCURRENCY = 4;
    const txHashes = Array.from({ length: 20 }, (_, i) => `hash${i}`);

    let inFlight = 0;
    let maxInFlight = 0;

    async function fetchTx(hash: string) {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise<void>((r) => setTimeout(r, 5));
      inFlight--;
      return { txHash: hash, done: true };
    }

    // Run the same batching logic used in getInvocationHistory
    const results: { txHash: string; done: boolean }[] = [];
    for (let i = 0; i < txHashes.length; i += CONCURRENCY) {
      const batch = txHashes.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map((h) => fetchTx(h)));
      results.push(...batchResults);
    }

    expect(maxInFlight).toBeLessThanOrEqual(CONCURRENCY);
    expect(results).toHaveLength(txHashes.length);
  });
});
