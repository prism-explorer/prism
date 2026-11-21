// Display formatting utilities for Prism

import type { AccountBalance } from "@/types";

/** Shorten a hash or address: "GABCD...XYZ" */
export function shortHash(hash: string, chars = 6): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/**
 * A readable label for an account balance's asset.
 *
 * Liquidity pool shares have no asset code, so they are labelled with a
 * shortened pool ID. Any other balance with no code falls back to its asset
 * type, rather than printing "undefined".
 */
export function balanceLabel(balance: AccountBalance): string {
  if (balance.assetType === "native") return "XLM";
  if (balance.assetType === "liquidity_pool_shares" && balance.liquidityPoolId) {
    return `Pool ${shortHash(balance.liquidityPoolId, 6)}`;
  }
  if (balance.assetCode) {
    return `${balance.assetCode}:${balance.assetIssuer ? shortHash(balance.assetIssuer, 4) : ""}`;
  }
  return balance.assetType;
}

/** Format stroops to XLM string: 1_000_000 → "0.1 XLM" */
export function stroopsToXlm(stroops: number): string {
  return `${(stroops / 10_000_000).toFixed(7)} XLM`;
}

/** Format a fee in stroops to a readable string */
export function formatFee(stroops: number): string {
  return `${stroops.toLocaleString()} stroops`;
}

/**
 * Decode base64 without Buffer so this helper is safe in both server and
 * client components. Horizon sends hash/return memos base64-encoded; the XDR
 * decoder already shows them as hex, so do the same here.
 */
function base64ToHex(value: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let hex = "";
  let bits = 0;
  let byte = 0;
  for (const char of value.replace(/=+$/, "")) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) continue; // tolerate whitespace or malformed input
    byte = (byte << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      hex += ((byte >> bits) & 0xff).toString(16).padStart(2, "0");
    }
  }
  return hex;
}

/**
 * Format a Horizon memo's *value*. Text and ID memos are already readable;
 * hash and return memos arrive as base64 and are shown as hex. The memo type
 * is rendered as a separate label (e.g. "Memo (hash)").
 */
export function formatMemo(memo: string, memoType?: string): string {
  if (memoType === "hash" || memoType === "return") return base64ToHex(memo);
  return memo;
}

/** The labelled row the transaction page renders for a memo. */
export function formatMemoDetail(memo: string, memoType?: string) {
  const type = memoType ?? "text";
  return {
    label: `Memo (${type})`,
    value: formatMemo(memo, type),
    mono: type === "hash" || type === "return",
  };
}

/** Format an ISO date string to a human-friendly label */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Format an ISO timestamp as an absolute UTC label. Unlike formatDate, the
 * output doesn't depend on the machine's time zone or locale, so the server
 * and the browser render the same text.
 */
export function formatTimestampUtc(iso: string): string {
  const label = new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return `${label} UTC`;
}

/** Format a number with thousands separators */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Returns "X seconds/minutes/hours ago" for a given ISO timestamp */
export function timeAgo(iso: string): string {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Format a contract ID to a display-friendly form: "CAAAA...ZZZZ" */
export function formatContractId(id: string): string {
  return shortHash(id, 8);
}
