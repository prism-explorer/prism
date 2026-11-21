import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import IndexerStatus, { indexerStatusLabel } from "./IndexerStatus";

const NOW = Date.parse("2026-11-21T12:00:00Z");

describe("indexerStatusLabel", () => {
  it("describes a recently updated cursor without a warning", () => {
    const label = indexerStatusLabel(
      { lastLedger: 12345, updatedAt: "2026-11-21T11:58:00Z" },
      NOW
    );
    expect(label).toEqual({
      text: "Indexed through ledger 12345 (2m ago)",
      stale: false,
    });
  });

  it("flags a stale cursor fixture and shows the elapsed time", () => {
    const label = indexerStatusLabel(
      { lastLedger: 9000, updatedAt: "2026-11-21T09:00:00Z" },
      NOW
    );
    expect(label.stale).toBe(true);
    expect(label.text).toContain("Indexed through ledger 9000 (3h ago)");
    expect(label.text).toContain("Warning");
  });

  it("honours a custom threshold", () => {
    const cursor = { lastLedger: 1, updatedAt: "2026-11-21T11:59:00Z" };
    expect(indexerStatusLabel(cursor, NOW, 30_000).stale).toBe(true);
    expect(indexerStatusLabel(cursor, NOW, 120_000).stale).toBe(false);
  });
});

describe("IndexerStatus rendering", () => {
  it("renders the warning for a stale cursor", () => {
    const html = renderToStaticMarkup(
      createElement(IndexerStatus, {
        cursor: { lastLedger: 9000, updatedAt: "2026-11-21T09:00:00Z" },
        now: NOW,
      })
    );
    expect(html).toContain("Indexed through ledger 9000 (3h ago)");
    expect(html).toContain("Warning");
  });

  it("renders the fresh label without a warning", () => {
    const html = renderToStaticMarkup(
      createElement(IndexerStatus, {
        cursor: { lastLedger: 12345, updatedAt: "2026-11-21T11:58:00Z" },
        now: NOW,
      })
    );
    expect(html).toContain("Indexed through ledger 12345 (2m ago)");
    expect(html).not.toContain("Warning");
  });

  it("renders nothing when no indexer is configured", () => {
    expect(renderToStaticMarkup(createElement(IndexerStatus, { cursor: null }))).toBe("");
  });
});
