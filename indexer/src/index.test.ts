import { describe, expect, it, vi } from "vitest";
import { xdr } from "@stellar/stellar-sdk";
import {
  backoffDelay,
  commitPage,
  healthReport,
  processTransaction,
  pruneStorageHistory,
  seedLastLedger,
} from "./index.js";
import failedInvokeFixture from "./fixtures/failed-invoke.json" with { type: "json" };

describe("backoffDelay", () => {
  it("doubles the delay for each consecutive failure", () => {
    const upperBound = (failures: number) => backoffDelay(failures, () => 1);
    expect([1, 2, 3, 4].map(upperBound)).toEqual([1000, 2000, 4000, 8000]);
  });

  it("never lets a later failure wait less than an earlier one could, until the cap", () => {
    // Failure 7 onward hits the 60s cap, so the ranges overlap from there on.
    for (let failures = 2; failures <= 6; failures++) {
      const shortest = backoffDelay(failures, () => 0);
      const longestBefore = backoffDelay(failures - 1, () => 1);
      expect(shortest).toBeGreaterThanOrEqual(longestBefore);
    }
  });

  it("caps the delay at the maximum", () => {
    expect(backoffDelay(50, () => 1)).toBe(60_000);
    expect(backoffDelay(50, () => 0)).toBe(30_000);
  });
});

describe("healthReport", () => {
  const base = { cursor: 100, latestLedger: 102, lastPollFailed: false };

  it("is healthy when the cursor is within the lag threshold", () => {
    expect(healthReport(base, 60)).toEqual({ healthy: true, ...base, lag: 2 });
  });

  it("is unhealthy when the lag passes the threshold", () => {
    expect(healthReport({ ...base, latestLedger: 161 }, 60)).toMatchObject({
      healthy: false,
      lag: 61,
    });
    expect(healthReport({ ...base, latestLedger: 160 }, 60)).toMatchObject({
      healthy: true,
      lag: 60,
    });
  });

  it("is unhealthy when the last poll failed", () => {
    expect(healthReport({ ...base, lastPollFailed: true }, 60)).toMatchObject({
      healthy: false,
    });
  });

  it("never reports a negative lag", () => {
    expect(healthReport({ ...base, latestLedger: 90 }, 60)).toMatchObject({
      healthy: true,
      lag: 0,
    });
  });
});

describe("seedLastLedger", () => {
  const network = { latestLedger: 500, oldestLedger: 400 };

  it("seeds at the latest ledger when INDEXER_START_LEDGER is unset or blank", () => {
    expect(seedLastLedger(undefined, network)).toBe(500);
    expect(seedLastLedger("  ", network)).toBe(500);
  });

  it("seeds one below the start ledger, so the start ledger is the first one indexed", () => {
    expect(seedLastLedger("450", network)).toBe(449);
  });

  it("accepts both edges of the retention window", () => {
    expect(seedLastLedger("400", network)).toBe(399);
    expect(seedLastLedger("500", network)).toBe(499);
  });

  it("rejects a start ledger outside the retention window", () => {
    expect(() => seedLastLedger("399", network)).toThrow(/retention window/);
    expect(() => seedLastLedger("501", network)).toThrow(/retention window/);
  });

  it("rejects values that are not positive integers", () => {
    for (const raw of ["abc", "1.5", "0", "-3"]) {
      expect(() => seedLastLedger(raw, network)).toThrow(/positive integer/);
    }
  });
});

describe("commitPage", () => {
  type Client = Parameters<typeof commitPage>[2];

  /**
   * Fake client whose $transaction stages writes and applies them only when the
   * callback resolves, mirroring a rollback on error. `failOn` injects a throw
   * from the named table's write, after earlier writes in the same transaction.
   */
  function fakeClient(failOn?: "indexerCursor") {
    const committed = {
      gaps: [] as unknown[],
      cursor: { lastLedger: 100, paginationCursor: null as string | null },
    };
    const client = {
      $transaction: async (fn: (db: unknown) => Promise<void>) => {
        const staged = {
          gaps: [] as unknown[],
          cursor: undefined as undefined | typeof committed.cursor,
        };
        const db = {
          indexerGap: {
            create: async ({ data }: { data: unknown }) => {
              staged.gaps.push(data);
            },
          },
          indexerCursor: {
            upsert: async ({ update }: { update: typeof committed.cursor }) => {
              if (failOn === "indexerCursor")
                throw new Error("injected failure");
              staged.cursor = update;
            },
          },
        };
        await fn(db);
        committed.gaps.push(...staged.gaps);
        committed.cursor = staged.cursor ?? committed.cursor;
      },
    };
    return { client: client as unknown as Client, committed };
  }

  it("applies the gap record and the cursor together", async () => {
    const { client, committed } = fakeClient();
    const gap = { fromLedger: 101, toLedger: 300, reason: "RPC retention" };
    await commitPage(
      [],
      { lastLedger: 300, paginationCursor: null, gap },
      client
    );
    expect(committed.gaps).toEqual([gap]);
    expect(committed.cursor).toEqual({
      lastLedger: 300,
      paginationCursor: null,
    });
  });

  it("leaves no new rows and an unchanged cursor when a failure follows the inserts", async () => {
    const { client, committed } = fakeClient("indexerCursor");
    const gap = { fromLedger: 101, toLedger: 300, reason: "RPC retention" };
    await expect(
      commitPage([], { lastLedger: 300, paginationCursor: null, gap }, client)
    ).rejects.toThrow("injected failure");
    expect(committed.gaps).toEqual([]);
    expect(committed.cursor).toEqual({
      lastLedger: 100,
      paginationCursor: null,
    });
  });
});

describe("pruneStorageHistory", () => {
  it("does not prune before the retention window has elapsed", async () => {
    const execute = async () => {
      throw new Error("should not query");
    };
    const client = { $executeRaw: execute } as unknown as Parameters<
      typeof pruneStorageHistory
    >[2];
    await expect(pruneStorageHistory(50, 100, client)).resolves.toBe(0);
  });

  it("uses a bounded deletion that excludes the latest observation for each key", async () => {
    let statement = "";
    let cutoff: unknown;
    const execute = async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      statement = strings.join("?");
      cutoff = values[0];
      return 7;
    };
    const client = { $executeRaw: execute } as unknown as Parameters<
      typeof pruneStorageHistory
    >[2];
    await expect(pruneStorageHistory(200, 50, client)).resolves.toBe(7);
    expect(cutoff).toBe(150);
    expect(statement).toContain("LIMIT 1000");
    expect(statement).toContain("EXISTS");
    expect(statement).toContain('newer."keyDisplay" = older."keyDisplay"');
    expect(statement).toContain("newer.ledger > older.ledger");
  });
});

describe("processTransaction source account", () => {
  type Tx = Parameters<typeof processTransaction>[0];
  type Client = NonNullable<Parameters<typeof processTransaction>[1]>;

  function run(breakSource: boolean) {
    const envelopeXdr = xdr.TransactionEnvelope.fromXDR(
      failedInvokeFixture.envelopeXdr,
      "base64"
    );
    if (breakSource) {
      // Make the source account undecodable while the invocation still decodes.
      envelopeXdr.v1().tx().sourceAccount = () => {
        throw new Error("bad source account");
      };
    }
    const tx = {
      txHash: failedInvokeFixture.hash,
      ledger: failedInvokeFixture.ledger,
      status: failedInvokeFixture.status,
      createdAt: 1_700_000_000,
      envelopeXdr,
      resultMetaXdr: xdr.TransactionMeta.fromXDR(
        failedInvokeFixture.resultMetaXdr,
        "base64"
      ),
    } as unknown as Tx;
    const rows: { sourceAccount: string | null }[] = [];
    const db = {
      invocation: {
        createMany: async ({ data }: { data: typeof rows }) => {
          rows.push(...data);
          return { count: data.length };
        },
      },
    } as unknown as Client;
    return { tx, db, rows };
  }

  it("logs a warning and stores a null source for an unparseable envelope", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { tx, db, rows } = run(true);
      await processTransaction(tx, db);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row.sourceAccount).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain(failedInvokeFixture.hash);
    } finally {
      warn.mockRestore();
    }
  });

  it("stores the decoded source and does not warn for a valid envelope", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { tx, db, rows } = run(false);
      await processTransaction(tx, db);
      expect(rows[0].sourceAccount).toMatch(/^G[A-Z2-7]{55}$/);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
