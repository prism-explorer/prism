import { describe, expect, it } from "vitest";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { validateStorageKeyValue } from "./storage-key-validation";

describe("validateStorageKeyValue — address kinds", () => {
  it("accepts a valid account address (G…)", () => {
    expect(validateStorageKeyValue(Keypair.random().publicKey(), "address")).toBeNull();
  });

  it("accepts a valid contract address (C…)", () => {
    const contract = StrKey.encodeContract(Buffer.alloc(32, 7));
    expect(contract.startsWith("C")).toBe(true);
    expect(validateStorageKeyValue(contract, "address")).toBeNull();
  });

  it("rejects G followed by 55 zeros — strkeys cannot contain 0", () => {
    expect(validateStorageKeyValue(`G${"0".repeat(55)}`, "address")).toMatch(/valid account or contract/);
  });

  it("rejects a C-prefixed all-zeros placeholder too", () => {
    expect(validateStorageKeyValue(`C${"0".repeat(55)}`, "address")).toMatch(/valid account or contract/);
  });

  it("rejects lowercase and wrong-length strings", () => {
    expect(validateStorageKeyValue(Keypair.random().publicKey().toLowerCase(), "address")).toMatch(/valid/);
    expect(validateStorageKeyValue("GABC", "address")).toMatch(/valid/);
  });

  it("treats Address and ADDRESS the same as address", () => {
    const contract = StrKey.encodeContract(Buffer.alloc(32, 3));
    expect(validateStorageKeyValue(contract, "Address")).toBeNull();
    expect(validateStorageKeyValue(contract, "ADDRESS")).toBeNull();
  });
});

describe("validateStorageKeyValue — other kinds", () => {
  it("validates u32 bounds and digits", () => {
    expect(validateStorageKeyValue("4294967295", "u32")).toBeNull();
    expect(validateStorageKeyValue("4294967296", "u32")).toMatch(/u32/);
    expect(validateStorageKeyValue("12abc", "u32")).toMatch(/u32/);
    expect(validateStorageKeyValue("-1", "u32")).toMatch(/u32/);
  });

  it("does not reject values for symbol/string/union payload types", () => {
    expect(validateStorageKeyValue("anything", "Symbol")).toBeNull();
    expect(validateStorageKeyValue("a note name", "String")).toBeNull();
    expect(validateStorageKeyValue("", "u32")).toBeNull();
  });
});
