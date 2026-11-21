/**
 * Tests for GET /api/contract/[id]/storage — any spec type is accepted as a
 * key kind, contract-defined keys are coerced with the contract's own types,
 * and the live-until ledger is included in the response.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/soroban", () => ({
  SIMPLE_STORAGE_KEY_KINDS: ["symbol", "string", "u32", "address"],
  getContractWasmInfo: vi.fn(),
  parseStorageKeyInput: vi.fn(() => ({ switch: () => ({ name: "scvSymbol" }) })),
  lookupStorageEntry: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitRequest: vi.fn(() => null),
}));

import { GET } from "./route";
import { getContractWasmInfo, lookupStorageEntry, parseStorageKeyInput } from "@/lib/soroban";

const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
const params = { params: { id: CONTRACT_ID } };

function makeRequest(query: string): Request {
  return new Request(`http://localhost/api/contract/${CONTRACT_ID}/storage?${query}`);
}

const dataKeyTypes = [
  { kind: "union" as const, name: "DataKey", cases: [{ name: "Note", types: ["Symbol"] }] },
];

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(getContractWasmInfo).mockResolvedValue(null);
  vi.mocked(lookupStorageEntry).mockResolvedValue({
    key: '["Note", "hello"]',
    value: "a note",
    durability: "persistent",
    liveUntilLedgerSeq: 98765,
  });
});

describe("GET /api/contract/[id]/storage", () => {
  it("requires both key and kind", async () => {
    expect((await GET(makeRequest("kind=symbol"), params)).status).toBe(400);
    expect((await GET(makeRequest("key=Admin"), params)).status).toBe(400);
  });

  it("does not fetch WASM for a simple preset kind and returns the live-until ledger", async () => {
    const res = await GET(makeRequest("key=Admin&kind=symbol"), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      key: '["Note", "hello"]',
      value: "a note",
      durability: "persistent",
      liveUntilLedgerSeq: 98765,
    });
    expect(getContractWasmInfo).not.toHaveBeenCalled();
    expect(parseStorageKeyInput).toHaveBeenCalledWith("Admin", "symbol", []);
  });

  it("accepts a contract-defined kind and coerces with its parsed types", async () => {
    vi.mocked(getContractWasmInfo).mockResolvedValue({ types: dataKeyTypes } as never);

    const rawKey = JSON.stringify({ Note: ["hello"] });
    const res = await GET(
      makeRequest(`key=${encodeURIComponent(rawKey)}&kind=DataKey&durability=temporary`),
      params
    );

    expect(res.status).toBe(200);
    expect(getContractWasmInfo).toHaveBeenCalledWith(CONTRACT_ID);
    expect(parseStorageKeyInput).toHaveBeenCalledWith(rawKey, "DataKey", dataKeyTypes);
    expect(lookupStorageEntry).toHaveBeenCalledWith(expect.anything(), expect.anything(), "temporary");
  });

  it("returns 404 when no entry exists", async () => {
    vi.mocked(lookupStorageEntry).mockResolvedValue(null);
    const res = await GET(makeRequest("key=Admin&kind=symbol"), params);
    expect(res.status).toBe(404);
  });
});
