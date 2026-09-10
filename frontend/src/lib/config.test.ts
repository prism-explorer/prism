import { describe, expect, it } from "vitest";
import { configWarnings, detectNetworkFromUrl, parseNetwork, resolveConfig } from "./config";

describe("parseNetwork", () => {
  it("accepts the documented values", () => {
    expect(parseNetwork("testnet")).toBe("testnet");
    expect(parseNetwork("mainnet")).toBe("mainnet");
    expect(parseNetwork("futurenet")).toBe("futurenet");
  });

  it("accepts the names Stellar tooling uses for mainnet", () => {
    expect(parseNetwork("public")).toBe("mainnet");
    expect(parseNetwork("pubnet")).toBe("mainnet");
  });

  it("is case and whitespace insensitive", () => {
    expect(parseNetwork("  MainNet \n")).toBe("mainnet");
  });

  it("falls back to testnet for missing or unknown values", () => {
    expect(parseNetwork(undefined)).toBe("testnet");
    expect(parseNetwork("")).toBe("testnet");
    expect(parseNetwork("mainet")).toBe("testnet");
  });
});

describe("resolveConfig", () => {
  it("defaults to testnet endpoints with an empty environment", () => {
    const cfg = resolveConfig({});
    expect(cfg.network).toBe("testnet");
    expect(cfg.horizonUrl).toBe("https://horizon-testnet.stellar.org");
    expect(cfg.sorobanRpcUrl).toBe("https://soroban-testnet.stellar.org");
    expect(cfg.siteUrl).toBe("http://localhost:3000");
  });

  it("follows the network when picking endpoint defaults", () => {
    const cfg = resolveConfig({ NEXT_PUBLIC_NETWORK: "mainnet" });
    expect(cfg.horizonUrl).toBe("https://horizon.stellar.org");
    expect(cfg.sorobanRpcUrl).toBe("https://mainnet.sorobanrpc.com");
  });

  it("lets explicit endpoints override the defaults", () => {
    const cfg = resolveConfig({
      NEXT_PUBLIC_NETWORK: "mainnet",
      NEXT_PUBLIC_HORIZON_URL: "https://horizon.example.com",
    });
    expect(cfg.horizonUrl).toBe("https://horizon.example.com");
    expect(cfg.sorobanRpcUrl).toBe("https://mainnet.sorobanrpc.com");
  });

  it("strips trailing slashes so path concatenation can't double up", () => {
    const cfg = resolveConfig({ NEXT_PUBLIC_HORIZON_URL: "https://horizon.example.com/" });
    expect(cfg.horizonUrl).toBe("https://horizon.example.com");
  });

  it("treats an empty string as unset rather than as an endpoint", () => {
    const cfg = resolveConfig({ NEXT_PUBLIC_HORIZON_URL: "" });
    expect(cfg.horizonUrl).toBe("https://horizon-testnet.stellar.org");
  });
});

describe("detectNetworkFromUrl", () => {
  it("recognizes the public endpoints for each network", () => {
    expect(detectNetworkFromUrl("https://horizon-testnet.stellar.org")).toBe("testnet");
    expect(detectNetworkFromUrl("https://soroban-testnet.stellar.org")).toBe("testnet");
    expect(detectNetworkFromUrl("https://horizon.stellar.org")).toBe("mainnet");
    expect(detectNetworkFromUrl("https://mainnet.sorobanrpc.com")).toBe("mainnet");
    expect(detectNetworkFromUrl("https://rpc-futurenet.stellar.org")).toBe("futurenet");
  });

  it("returns null for a self-hosted node with no hint in the hostname", () => {
    expect(detectNetworkFromUrl("https://rpc.internal.example.com")).toBeNull();
  });

  it("returns null rather than throwing on a malformed URL", () => {
    expect(detectNetworkFromUrl("not a url")).toBeNull();
  });
});

describe("configWarnings", () => {
  it("is silent on a coherent deployment", () => {
    expect(configWarnings(resolveConfig({ NEXT_PUBLIC_NETWORK: "mainnet" }))).toEqual([]);
    expect(configWarnings(resolveConfig({}))).toEqual([]);
  });

  it("flags an endpoint that disagrees with the configured network", () => {
    const cfg = resolveConfig({
      NEXT_PUBLIC_NETWORK: "mainnet",
      NEXT_PUBLIC_HORIZON_URL: "https://horizon-testnet.stellar.org",
    });
    const warnings = configWarnings(cfg);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Horizon");
    expect(warnings[0]).toContain("testnet");
  });

  it("flags each mismatched endpoint separately", () => {
    const cfg = resolveConfig({
      NEXT_PUBLIC_NETWORK: "futurenet",
      NEXT_PUBLIC_HORIZON_URL: "https://horizon-testnet.stellar.org",
      NEXT_PUBLIC_SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
    });
    expect(configWarnings(cfg)).toHaveLength(2);
  });

  it("stays silent for custom hosts it can't classify", () => {
    const cfg = resolveConfig({
      NEXT_PUBLIC_NETWORK: "mainnet",
      NEXT_PUBLIC_HORIZON_URL: "https://horizon.internal.example.com",
    });
    expect(configWarnings(cfg)).toEqual([]);
  });
});
