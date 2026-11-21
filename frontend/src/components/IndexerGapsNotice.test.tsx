import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import IndexerGapsNotice from "./IndexerGapsNotice";
import type { IndexedGap } from "@/lib/indexed-db";

describe("IndexerGapsNotice", () => {
  it("renders a notice for each skipped ledger range", () => {
    const gaps: IndexedGap[] = [
      { fromLedger: 100, toLedger: 200, reason: "RPC retention window passed", createdAt: "2026-11-21T09:00:00Z" },
      { fromLedger: 300, toLedger: 305, reason: "indexer restart", createdAt: "2026-11-21T10:00:00Z" },
    ];
    const html = renderToStaticMarkup(createElement(IndexerGapsNotice, { gaps }));

    expect(html).toContain("No data for ledgers 100–200: RPC retention window passed");
    expect(html).toContain("No data for ledgers 300–305: indexer restart");
  });

  it("renders nothing when there are no gaps", () => {
    expect(renderToStaticMarkup(createElement(IndexerGapsNotice, { gaps: [] }))).toBe("");
  });
});
