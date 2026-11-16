/** Canonical Horizon transaction hashes are exactly 32 bytes of hexadecimal. */
export function normalizeTransactionHash(value: string): string | null {
  return /^[0-9a-fA-F]{64}$/.test(value) ? value.toLowerCase() : null;
}
