/**
 * A single page view must not perform the same contract-instance lookup three
 * times (generateMetadata, the page, and getContractWasmInfo). See the
 * request-scoped cache in ./request-cache.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { rpc } from "@stellar/stellar-sdk";

vi.mock("./indexed-db", () => ({
  isIndexerConfigured: vi.fn(() => false),
  getIndexedContract: vi.fn().mockResolvedValue(null),
  getIndexedEvents: vi.fn(),
  getIndexedInvocations: vi.fn(),
  getIndexedStorageEntries: vi.fn(),
  getIndexedInvocationReturnValue: vi.fn(),
}));

import { getContractInfo, getContractWasmInfo } from "./soroban";
import { runWithCacheScope } from "./request-cache";
import { getIndexedContract } from "./indexed-db";

function instanceData() {
  return {
    val: {
      contractData: () => ({
        val: () => ({
          instance: () => ({
            executable: () => ({
              switch: () => ({ name: "contractExecutableWasm" }),
              wasmHash: () => Buffer.alloc(32, 1),
            }),
            storage: () => [],
          }),
        }),
      }),
    },
    liveUntilLedgerSeq: 1000,
    lastModifiedLedgerSeq: 500,
  } as never;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("getContractInfo request cache", () => {
  it("performs one instance lookup per page view", async () => {
    const getContractData = vi
      .spyOn(rpc.Server.prototype, "getContractData")
      .mockResolvedValue(instanceData());
    vi.spyOn(rpc.Server.prototype, "getContractWasmByContractId").mockResolvedValue(
      Buffer.alloc(64) as never
    );

    await runWithCacheScope(async () => {
      // generateMetadata()
      await getContractInfo("contract-id");
      // ContractPage(), which passes the info through to the WASM helper
      const info = await getContractInfo("contract-id");
      await getContractWasmInfo("contract-id", info);
    });

    expect(getContractData).toHaveBeenCalledTimes(1);
    expect(getIndexedContract).toHaveBeenCalledTimes(1);
  });

  it("shares one lookup even when callers do not pass the info through", async () => {
    const getContractData = vi
      .spyOn(rpc.Server.prototype, "getContractData")
      .mockResolvedValue(instanceData());
    vi.spyOn(rpc.Server.prototype, "getContractWasmByContractId").mockResolvedValue(
      Buffer.alloc(64) as never
    );

    await runWithCacheScope(async () => {
      await Promise.all([
        getContractInfo("contract-id"),
        getContractInfo("contract-id"),
        getContractWasmInfo("contract-id"),
      ]);
    });

    expect(getContractData).toHaveBeenCalledTimes(1);
    expect(getIndexedContract).toHaveBeenCalledTimes(1);
  });

  it("does not leak cached results into a different request", async () => {
    const getContractData = vi
      .spyOn(rpc.Server.prototype, "getContractData")
      .mockResolvedValue(instanceData());

    await runWithCacheScope(() => getContractInfo("contract-id"));
    await runWithCacheScope(() => getContractInfo("contract-id"));

    expect(getContractData).toHaveBeenCalledTimes(2);
  });
});
