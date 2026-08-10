import { describe, expect, it } from "vitest";
import { xdr, Address, Keypair } from "@stellar/stellar-sdk";
import { decodeScVal, scValToDisplay, decodeXdr, decodeScValXdr, coerceArgInput, parseContractSpec } from "./xdr";

describe("decodeScVal / scValToDisplay", () => {
  it("decodes a u32", () => {
    expect(decodeScVal(xdr.ScVal.scvU32(42))).toBe(42);
  });

  it("decodes a symbol to a string", () => {
    expect(decodeScVal(xdr.ScVal.scvSymbol("hello"))).toBe("hello");
  });

  it("decodes a u128 to a string (bigints aren't JSON-safe)", () => {
    const decoded = decodeScVal(xdr.ScVal.scvU128(new xdr.UInt128Parts({ hi: xdr.Uint64.fromString("0"), lo: xdr.Uint64.fromString("1000") })));
    expect(decoded).toBe("1000");
  });

  it("renders void as the literal string 'void'", () => {
    expect(scValToDisplay(xdr.ScVal.scvVoid())).toBe("void");
  });

  it("renders a scalar as a plain string, not JSON-quoted", () => {
    expect(scValToDisplay(xdr.ScVal.scvSymbol("admin"))).toBe("admin");
  });

  it("renders a vec as JSON", () => {
    const vec = xdr.ScVal.scvVec([xdr.ScVal.scvU32(1), xdr.ScVal.scvU32(2)]);
    expect(scValToDisplay(vec)).toBe("[1,2]");
  });
});

describe("decodeXdr / decodeScValXdr (base64 round-trip)", () => {
  it("round-trips a symbol through base64 XDR", () => {
    const base64 = xdr.ScVal.scvSymbol("counter").toXDR("base64");
    expect(decodeXdr(base64)).toBe("counter");
    expect(decodeScValXdr(base64)).toBe("counter");
  });

  it("falls back to the raw input on invalid base64 XDR", () => {
    expect(decodeXdr("not valid xdr")).toBe("not valid xdr");
    expect(decodeScValXdr("not valid xdr")).toBeUndefined();
  });
});

describe("coerceArgInput", () => {
  it("coerces scalar types to the matching ScVal variant", () => {
    expect(coerceArgInput("42", "U32").switch().name).toBe("scvU32");
    expect(coerceArgInput("42", "I64").switch().name).toBe("scvI64");
    expect(coerceArgInput("hello", "Symbol").switch().name).toBe("scvSymbol");
    expect(coerceArgInput("true", "Bool").switch().name).toBe("scvBool");
    expect(coerceArgInput("true", "Bool").b()).toBe(true);
  });

  it("coerces a valid account address", () => {
    const address = Keypair.random().publicKey();
    const scval = coerceArgInput(address, "Address");
    expect(scval.switch().name).toBe("scvAddress");
    expect(Address.fromScAddress(scval.address()).toString()).toBe(address);
  });

  it("falls back to best-effort JSON parsing for unknown/compound types", () => {
    const scval = coerceArgInput('{"a":1}', "SomeUdtType");
    expect(scval.switch().name).toBe("scvMap");
  });
});

describe("parseContractSpec", () => {
  it("returns an empty array for a WASM binary with no contract spec section", () => {
    // Smallest valid WASM module: magic number + version, no sections.
    const emptyModule = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    expect(parseContractSpec(emptyModule)).toEqual([]);
  });

  it("returns an empty array (not a throw) for invalid input", () => {
    expect(parseContractSpec(Buffer.from("not wasm"))).toEqual([]);
  });
});
