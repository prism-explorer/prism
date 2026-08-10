import { describe, expect, it, vi, afterEach } from "vitest";

function mockFetchOnce(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("getLatestLedger", () => {
  it("derives transactionCount from successful + failed counts (Horizon has no transaction_count field)", async () => {
    mockFetchOnce({
      _embedded: {
        records: [
          {
            sequence: 4064026,
            hash: "abc",
            closed_at: "2026-08-10T00:00:00Z",
            operation_count: 10,
            base_fee_in_stroops: 100,
            successful_transaction_count: 7,
            failed_transaction_count: 2,
          },
        ],
      },
    });
    const { getLatestLedger } = await import("./horizon");
    const ledger = await getLatestLedger();
    expect(ledger.transactionCount).toBe(9);
    expect(ledger.sequence).toBe(4064026);
  });
});

describe("getNetworkPulse", () => {
  it("computes TPS and close time from the two most recent ledgers", async () => {
    mockFetchOnce({
      _embedded: {
        records: [
          {
            sequence: 100,
            closed_at: "2026-08-10T00:00:10Z",
            operation_count: 20,
            base_fee_in_stroops: 100,
            successful_transaction_count: 8,
            failed_transaction_count: 2,
          },
          {
            sequence: 99,
            closed_at: "2026-08-10T00:00:05Z",
            operation_count: 15,
            base_fee_in_stroops: 100,
            successful_transaction_count: 5,
            failed_transaction_count: 0,
          },
        ],
      },
    });
    const { getNetworkPulse } = await import("./horizon");
    const pulse = await getNetworkPulse();
    expect(pulse.closeTimeSeconds).toBe(5);
    expect(pulse.transactionsPerSecond).toBe(2); // 10 txs / 5s
    expect(pulse.sequence).toBe(100);
  });
});

describe("getTransaction", () => {
  it("throws on a non-ok response instead of returning partial data", async () => {
    mockFetchOnce({}, false);
    const { getTransaction } = await import("./horizon");
    await expect(getTransaction("deadbeef")).rejects.toThrow(/Horizon error 500/);
  });
});
