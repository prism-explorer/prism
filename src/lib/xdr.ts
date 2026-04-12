// XDR decoding utilities for Prism

/**
 * Attempt to decode a base64-encoded XDR value to a human-readable string.
 * Falls back to the raw base64 if decoding is not possible.
 */
export function decodeXdr(xdrBase64: string): string {
  try {
    const bytes = Buffer.from(xdrBase64, "base64");
    // TODO: use @stellar/stellar-sdk xdr module to decode typed XDR
    // For now return the hex representation
    return bytes.toString("hex");
  } catch {
    return xdrBase64;
  }
}

/**
 * Decode an XDR ScVal to a JavaScript-readable value
 * (string, number, boolean, address, etc.)
 */
export function decodeScVal(xdrBase64: string): unknown {
  // TODO: integrate @stellar/stellar-sdk xdr.ScVal.fromXDR
  return { raw: xdrBase64 };
}
