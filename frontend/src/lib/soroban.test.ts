import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { parseStorageKeyInput } from "./soroban";

describe("parseStorageKeyInput", () => {
  it("builds a symbol key", () => {
    expect(parseStorageKeyInput("Admin", "symbol").switch().name).toBe("scvSymbol");
  });

  it("builds a string key", () => {
    expect(parseStorageKeyInput("hello", "string").switch().name).toBe("scvString");
  });

  it("builds a u32 key", () => {
    const key = parseStorageKeyInput("7", "u32");
    expect(key.switch().name).toBe("scvU32");
    expect(key.u32()).toBe(7);
  });

  it("builds an address key from a valid account address", () => {
    const address = Keypair.random().publicKey();
    expect(parseStorageKeyInput(address, "address").switch().name).toBe("scvAddress");
  });

  it("throws for an invalid address", () => {
    expect(() => parseStorageKeyInput("not-an-address", "address")).toThrow();
  });
});
