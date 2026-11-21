import { describe, expect, it } from "vitest";
import { appendUnique, mergeVisible } from "./list-pagination";

const byHash = (item: { txHash: string }) => item.txHash;
const tx = (n: number) => ({ txHash: `tx-${n}` });
const page = (from: number, count: number) => Array.from({ length: count }, (_, i) => tx(from + i));

describe("appendUnique", () => {
  it("keeps every item across two older pages", () => {
    let older = appendUnique([], page(1, 20), byHash);
    older = appendUnique(older, page(21, 20), byHash);
    older = appendUnique(older, page(41, 20), byHash);
    expect(older).toHaveLength(60);
  });

  it("does not append an item twice when a cursor is retried", () => {
    const first = page(1, 3);
    expect(appendUnique(first, page(2, 3), byHash)).toHaveLength(4);
  });
});

describe("mergeVisible", () => {
  it("shows all 60 indexed invocations after two older-page clicks", () => {
    const firstPage = page(1, 20);
    const older = appendUnique(appendUnique([], page(21, 20), byHash), page(41, 20), byHash);
    expect(mergeVisible(firstPage, older, byHash)).toHaveLength(60);
  });

  it("drops a duplicate that shifts into the refreshed first page", () => {
    const older = page(21, 5);
    const refreshedFirstPage = page(18, 5); // now includes tx-21..tx-22
    const merged = mergeVisible(refreshedFirstPage, older, byHash);
    expect(merged.map(byHash)).toEqual([
      "tx-18", "tx-19", "tx-20", "tx-21", "tx-22", "tx-23", "tx-24", "tx-25",
    ]);
    expect(new Set(merged).size).toBe(merged.length);
  });

  it("keeps appended pages when the first page is refreshed", () => {
    const older = page(51, 50);
    const refreshed = page(1, 50);
    expect(mergeVisible(refreshed, older, byHash)).toHaveLength(100);
  });
});
