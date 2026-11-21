import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./soroban", () => ({
  lookupStorageEntry: vi.fn(),
  parseStorageKeyInput: vi.fn(() => ({ kind: "key" })),
  simulateInvocation: vi.fn(),
}));
vi.mock("./xdr", () => ({
  coerceArgInput: vi.fn(),
  decodeAnyXdr: vi.fn(),
}));

import { lookupStorageKeyAction } from "./actions";
import { lookupStorageEntry, parseStorageKeyInput } from "./soroban";
import type { ContractTypeDef } from "@/types";

const types: ContractTypeDef[] = [
  { kind: "union", name: "DataKey", cases: [{ name: "Note", types: ["Symbol"] }] },
];

afterEach(() => vi.clearAllMocks());

describe("lookupStorageKeyAction — contract types", () => {
  it("forwards the contract's type definitions when coercing the key", async () => {
    vi.mocked(lookupStorageEntry).mockResolvedValue({
      key: "note",
      value: "hello",
      durability: "persistent",
      liveUntilLedgerSeq: 555,
    });

    await expect(
      lookupStorageKeyAction("contract-id", "DataKey", '{"Note":["hello"]}', "persistent", types)
    ).resolves.toMatchObject({ liveUntilLedgerSeq: 555 });

    expect(parseStorageKeyInput).toHaveBeenCalledWith('{"Note":["hello"]}', "DataKey", types);
  });

  it("rejects an empty key before touching the RPC", async () => {
    const result = await lookupStorageKeyAction("contract-id", "symbol", "  ", "persistent");
    expect(result).toHaveProperty("error");
    expect(lookupStorageEntry).not.toHaveBeenCalled();
  });
});
