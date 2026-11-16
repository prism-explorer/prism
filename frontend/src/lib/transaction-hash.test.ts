import { describe, expect, it } from "vitest";
import { normalizeTransactionHash } from "./transaction-hash";

describe("normalizeTransactionHash", () => {
  it("accepts valid hashes and normalizes their case", () => {
    expect(normalizeTransactionHash("Ab".repeat(32))).toBe("ab".repeat(32));
  });

  it.each(["abc", "../ledgers/1", "..%2Fledgers%2F1", "a".repeat(64) + "?order=desc", "/" + "a".repeat(64), "g".repeat(64)])(
    "rejects malformed transaction hash %s",
    (value) => {
      expect(normalizeTransactionHash(value)).toBeNull();
    }
  );
});
