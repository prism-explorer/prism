import { describe, expect, it } from "vitest";
import { Address, Keypair, xdr } from "@stellar/stellar-sdk";
import {
  decodeSimulationEvents,
  decodeSimulationFootprint,
  describeAuthorizations,
} from "./simulation";
import { extractSacAssetDetails } from "../soroban";

const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

function contractFnCall(
  contract: string,
  fn: string,
  args: xdr.ScVal[] = []
): xdr.SorobanAuthorizedInvocation {
  return new xdr.SorobanAuthorizedInvocation({
    function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
      new xdr.InvokeContractArgs({
        contractAddress: new Address(contract).toScAddress(),
        functionName: fn,
        args,
      })
    ),
    subInvocations: [],
  });
}

function addressAuthEntry(author: string, root: xdr.SorobanAuthorizedInvocation) {
  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(author).toScAddress(),
        nonce: new xdr.Int64(0),
        signatureExpirationLedger: 0,
        signature: xdr.ScVal.scvVoid(),
      })
    ),
    rootInvocation: root,
  });
}

describe("describeAuthorizations", () => {
  it("lists the author address for a put_note call", () => {
    const author = Keypair.random().publicKey();
    const root = contractFnCall(CONTRACT_ID, "put_note", [
      new Address(author).toScVal(),
      xdr.ScVal.scvSymbol("hello"),
      xdr.ScVal.scvString("first revision"),
    ]);

    const [line] = describeAuthorizations([addressAuthEntry(author, root)]);

    expect(line).toContain(author);
    expect(line).toContain("authorizes");
    expect(line).toContain(`${CONTRACT_ID}.put_note(`);
    expect(line).toContain("first revision");
  });

  it("includes nested sub-invocations", () => {
    const author = Keypair.random().publicKey();
    const root = contractFnCall(CONTRACT_ID, "write_showcase_note");
    root.subInvocations([
      contractFnCall(CONTRACT_ID, "put_note", [new Address(author).toScVal()]),
    ]);

    const [line] = describeAuthorizations([addressAuthEntry(author, root)]);

    expect(line).toContain("write_showcase_note");
    expect(line).toContain("→");
    expect(line).toContain("put_note");
  });
});

describe("decodeSimulationEvents", () => {
  it("decodes a contract's Bumped event and drops non-contract events", () => {
    const contractEvent = new xdr.ContractEvent({
      ext: new xdr.ExtensionPoint(0),
      contractId: new Address(CONTRACT_ID).toBuffer() as unknown as xdr.Hash,
      type: xdr.ContractEventType.contract(),
      body: new xdr.ContractEventBody(
        0,
        new xdr.ContractEventV0({
          topics: [xdr.ScVal.scvSymbol("bumped")],
          data: xdr.ScVal.scvU32(7),
        })
      ),
    });
    const systemEvent = new xdr.ContractEvent({
      ext: new xdr.ExtensionPoint(0),
      contractId: null,
      type: xdr.ContractEventType.system(),
      body: new xdr.ContractEventBody(
        0,
        new xdr.ContractEventV0({ topics: [], data: xdr.ScVal.scvVoid() })
      ),
    });

    const events = decodeSimulationEvents(
      [
        new xdr.DiagnosticEvent({ inSuccessfulContractCall: true, event: systemEvent }),
        new xdr.DiagnosticEvent({ inSuccessfulContractCall: true, event: contractEvent }),
      ],
      CONTRACT_ID
    );

    expect(events).toHaveLength(1);
    expect(events[0].contractId).toBe(CONTRACT_ID);
    expect(events[0].topic).toEqual(["bumped"]);
    expect(events[0].value).toBe("7");
  });
});

describe("decodeSimulationFootprint", () => {
  it("returns read/write keys and byte figures", () => {
    const key = new xdr.LedgerKeyContractData({
      contract: new Address(CONTRACT_ID).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    });
    const resources = new xdr.SorobanResources({
      footprint: new xdr.LedgerFootprint({
        readOnly: [],
        readWrite: [xdr.LedgerKey.contractData(key)],
      }),
      instructions: 1234,
      diskReadBytes: 10,
      writeBytes: 20,
    });

    const footprint = decodeSimulationFootprint(resources);

    expect(footprint.readBytes).toBe(10);
    expect(footprint.writeBytes).toBe(20);
    expect(footprint.readOnly).toEqual([]);
    expect(footprint.readWrite).toHaveLength(1);
    expect(footprint.readWrite[0]).toContain(CONTRACT_ID);
  });
});

describe("extractSacAssetDetails", () => {
  function metadataEntry(name: string, symbol: string, decimal: number) {
    return new xdr.ScMapEntry({
      key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("METADATA")]),
      val: xdr.ScVal.scvMap([
        new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol("decimal"), val: xdr.ScVal.scvU32(decimal) }),
        new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol("name"), val: xdr.ScVal.scvString(name) }),
        new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol("symbol"), val: xdr.ScVal.scvString(symbol) }),
      ]),
    });
  }

  it("reads the native SAC metadata map", () => {
    expect(extractSacAssetDetails([metadataEntry("native", "XLM", 7)])).toEqual({
      name: "native",
      symbol: "XLM",
      decimals: 7,
    });
  });

  it("keeps the issuer from an issued asset's name", () => {
    const issuer = Keypair.random().publicKey();
    const details = extractSacAssetDetails([
      metadataEntry(`USDC:${issuer}`, "USDC", 7),
    ]);
    expect(details?.name).toBe(`USDC:${issuer}`);
    expect(details?.symbol).toBe("USDC");
    expect(details?.decimals).toBe(7);
  });
});
