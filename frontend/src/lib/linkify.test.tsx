import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Keypair } from "@stellar/stellar-sdk";
import { linkifyAddresses } from "@/lib/linkify";

const SAC_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

describe("linkifyAddresses (unmatched event topics)", () => {
  it("links addresses in a SAC transfer's topic list", () => {
    const from = Keypair.random().publicKey();
    const to = Keypair.random().publicKey();
    const topicLine = `transfer, ${from}, ${to}`;

    const nodes = linkifyAddresses(topicLine);
    const html = renderToStaticMarkup(
      createElement("span", null, ...(Array.isArray(nodes) ? nodes : [nodes]))
    );

    expect(html).toContain(`href="/account/${from}"`);
    expect(html).toContain(`href="/account/${to}"`);
    expect(html).toContain("transfer,");
  });

  it("links contract addresses to the contract route", () => {
    const nodes = linkifyAddresses(SAC_ID);
    const html = renderToStaticMarkup(
      createElement("span", null, ...(Array.isArray(nodes) ? nodes : [nodes]))
    );
    expect(html).toContain(`href="/contract/${SAC_ID}"`);
  });
});
