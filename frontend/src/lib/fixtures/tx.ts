/**
 * Shared Horizon/XDR fixtures for the transaction-detail tests. Addresses are
 * derived from fixed bytes so every run sees the same records.
 */
import { Address, StrKey, xdr } from "@stellar/stellar-sdk";

const bytes = (fill: number) => Buffer.alloc(32, fill);

export const source = StrKey.encodeEd25519PublicKey(bytes(1));
export const feeSource = StrKey.encodeEd25519PublicKey(bytes(2));
export const destination = StrKey.encodeEd25519PublicKey(bytes(3));
export const issuer = StrKey.encodeEd25519PublicKey(bytes(4));
export const contractId = StrKey.encodeContract(bytes(9));
export const innerHash = "a1".repeat(32);
export const outerHash = "b2".repeat(32);
const wasmHash = bytes(7);

export const baseTransaction = {
  hash: outerHash,
  ledger: 12345,
  created_at: "2026-09-14T10:23:22Z",
  source_account: source,
  fee_charged: "300",
  operation_count: 1,
  successful: true,
  memo: null,
  memo_type: "none",
  envelope_xdr: "AAAAAg==",
  result_xdr: "AAAAAAAAAAE=",
};

/** A fee bump: a different account paid the outer fee, and the inner tx has its own fee. */
export const feeBumpTransaction = {
  ...baseTransaction,
  fee_account: feeSource,
  fee_bump_transaction: { hash: outerHash, signatures: ["outer-signature"] },
  inner_transaction: {
    hash: innerHash,
    source_account: source,
    // Horizon versions report the inner fee under either of these names.
    fee_charged: "100",
    max_fee: "100",
    signatures: ["inner-signature"],
  },
};

export const memoTransactions = {
  text: { ...baseTransaction, memo: "hello world", memo_type: "text" },
  id: { ...baseTransaction, memo: "1234567890123", memo_type: "id" },
  hash: {
    ...baseTransaction,
    memo: wasmHash.toString("base64"),
    memo_type: "hash",
  },
};

/** One payment of a non-native asset — the case that used to be invisible. */
export const paymentOperations = {
  _embedded: {
    records: [
      {
        id: "12345-0000000001",
        type: "payment",
        source_account: source,
        from: source,
        to: destination,
        asset_type: "credit_alphanum4",
        asset_code: "USD",
        asset_issuer: issuer,
        amount: "10.5000000",
      },
    ],
  },
};

const contract = new Address(contractId).toScAddress();
const dataKey = (name: string) =>
  xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract,
      key: xdr.ScVal.scvSymbol(name),
      durability: xdr.ContractDataDurability.persistent(),
    })
  );

/**
 * A Soroban envelope with a resource footprint: two read-only entries (a
 * contract data key and a WASM hash) and one read-write storage key.
 */
export const showcaseEnvelope = (() => {
  const resources = new xdr.SorobanResources({
    footprint: new xdr.LedgerFootprint({
      readOnly: [
        dataKey("Admin"),
        xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({ hash: wasmHash })),
      ],
      readWrite: [dataKey("counter")],
    }),
    instructions: 12_345,
    diskReadBytes: 500,
    writeBytes: 200,
  });
  const sorobanData = new xdr.SorobanTransactionData({
    ext: new xdr.SorobanTransactionDataExt(0),
    resources,
    resourceFee: xdr.Int64.fromString("5000"),
  });
  const tx = new xdr.Transaction({
    sourceAccount: xdr.MuxedAccount.keyTypeEd25519(StrKey.decodeEd25519PublicKey(source)),
    fee: 100,
    seqNum: xdr.Int64.fromString("1"),
    cond: xdr.Preconditions.precondNone(),
    memo: xdr.Memo.memoNone(),
    operations: [],
    ext: new xdr.TransactionExt(1, sorobanData),
  });
  return xdr.TransactionEnvelope.envelopeTypeTx(
    new xdr.TransactionV1Envelope({ tx, signatures: [] })
  );
})();

/** Total fee 6,500 stroops = 1,500 inclusion + 5,000 resource. */
export const showcaseTransaction = { ...baseTransaction, fee_charged: "6500" };
