import { afterEach, describe, expect, it, vi } from "vitest";
import {
  baseTransaction,
  contractId,
  destination,
  feeBumpTransaction,
  feeSource,
  innerHash,
  memoTransactions,
  outerHash,
  paymentOperations,
  showcaseEnvelope,
  showcaseTransaction,
  source,
} from "./fixtures/tx";
import { formatMemoDetail } from "./format";
import { getResourceUsage } from "./xdr";

/** Stub one Horizon response, then import the module fresh so it reads the stub. */
function horizonReturns(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("fee bump transactions", () => {
  it("maps both accounts, both fees and the inner hash", async () => {
    horizonReturns(feeBumpTransaction);
    const { getTransaction } = await import("./horizon");
    const tx = await getTransaction(outerHash);

    // The page's Source row is the inner source; Fee Source is who paid.
    expect(tx.sourceAccount).toBe(source);
    expect(tx.feeAccount).toBe(feeSource);
    // Total fee 300, inner fee 100 — the outer (bump) fee is the difference.
    expect(tx.fee).toBe(300);
    expect(tx.innerTransaction?.feeCharged).toBe(100);
    expect(tx.fee - (tx.innerTransaction?.feeCharged ?? 0)).toBe(200);
    expect(tx.innerTransaction?.hash).toBe(innerHash);
    expect(tx.feeBumpTransaction?.hash).toBe(outerHash);
  });

  it("falls back to inner max_fee when fee_charged is absent", async () => {
    const inner = feeBumpTransaction.inner_transaction as Record<string, unknown>;
    const { fee_charged: _ignored, ...withoutFeeCharged } = inner;
    horizonReturns({ ...feeBumpTransaction, inner_transaction: withoutFeeCharged });
    const { getTransaction } = await import("./horizon");
    expect((await getTransaction(outerHash)).innerTransaction?.feeCharged).toBe(100);
  });

  it("leaves the fee bump fields unset on an ordinary transaction", async () => {
    horizonReturns(baseTransaction);
    const { getTransaction } = await import("./horizon");
    const tx = await getTransaction(outerHash);
    expect(tx.feeAccount).toBeUndefined();
    expect(tx.innerTransaction).toBeUndefined();
    expect(tx.feeBumpTransaction).toBeUndefined();
  });
});

describe("memo types", () => {
  it.each([
    ["text", memoTransactions.text.memo, "Memo (text)", "hello world"],
    ["id", memoTransactions.id.memo, "Memo (id)", "1234567890123"],
    ["hash", memoTransactions.hash.memo, "Memo (hash)", "07".repeat(32)],
  ])("%s memos render with their type", async (type, memo, label, value) => {
    horizonReturns({ ...baseTransaction, memo, memo_type: type });
    const { getTransaction } = await import("./horizon");
    const tx = await getTransaction(outerHash);

    expect(tx.memoType).toBe(type);
    // This is the exact row the page builds from the mapped record.
    expect(formatMemoDetail(tx.memo!, tx.memoType)).toEqual({
      label,
      value,
      mono: type === "hash",
    });
  });
});

describe("operations", () => {
  it("shows from, to, asset and amount for a payment", async () => {
    const fetchMock = horizonReturns(paymentOperations);
    const { getTransactionOperations } = await import("./horizon");
    const operations = await getTransactionOperations(outerHash);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/transactions/${outerHash}/operations`),
      expect.anything()
    );
    expect(operations).toHaveLength(1);
    const fields = Object.fromEntries(operations[0].fields.map((f) => [f.label, f.value]));
    expect(fields.From).toBe(source);
    expect(fields.To).toBe(destination);
    expect(fields.Asset).toContain("USD");
    expect(fields.Amount).toBe("10.5000000");
    expect(operations[0].raw).toBe(false);
  });

  it("dumps scalar fields for a type Prism doesn't render specifically", async () => {
    horizonReturns({
      _embedded: {
        records: [
          {
            id: "12345-0000000002",
            type: "set_options",
            source_account: source,
            home_domain: "example.org",
            low_threshold: 1,
          },
        ],
      },
    });
    const { getTransactionOperations } = await import("./horizon");
    const [operation] = await getTransactionOperations(outerHash);
    expect(operation.raw).toBe(true);
    const fields = Object.fromEntries(operation.fields.map((f) => [f.label, f.value]));
    expect(fields["Home domain"]).toBe("example.org");
    expect(fields["Low threshold"]).toBe("1");
  });
});

describe("Soroban resource footprint", () => {
  it("lists labelled footprint keys and splits the fee into both parts", () => {
    const usage = getResourceUsage(showcaseEnvelope, showcaseTransaction.fee_charged);
    expect(usage).not.toBeNull();
    expect(usage!.resourceFeeStroops).toBe("5000");
    expect(usage!.inclusionFeeStroops).toBe("1500");
    expect(usage!.footprint).toEqual([
      { access: "read", label: `${contractId} — Admin` },
      { access: "read", label: `code ${"07".repeat(32)}` },
      { access: "write", label: `${contractId} — counter` },
    ]);
  });

  it("omits the inclusion fee when Horizon's total fee isn't supplied", () => {
    const usage = getResourceUsage(showcaseEnvelope);
    expect(usage?.inclusionFeeStroops).toBeUndefined();
    expect(usage?.footprint).toHaveLength(3);
  });
});
