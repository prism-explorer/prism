/** The four simple key kinds offered as presets in the lookup UI. */
export const SIMPLE_STORAGE_KEY_KINDS = ["symbol", "string", "u32", "address"] as const;
export type SimpleStorageKeyKind = (typeof SIMPLE_STORAGE_KEY_KINDS)[number];

/**
 * Client-side validation for a single storage-key input.
 *
 * Strkeys are base32 encoded: they start with G (account) or C (contract) and
 * are followed by 55 characters from the base32 alphabet A–Z and 2–7. The
 * digits 0, 1, 8 and 9 never appear, so a simple regex catches the common
 * mistake of pasting an all-zeros placeholder while still accepting contracts.
 */
const STRKEY_RE = /^[GC][A-Z2-7]{55}$/;

export function validateStorageKeyValue(value: string, type: string): string | null {
  if (!value.trim()) return null;

  switch (type.trim().toLowerCase()) {
    case "u32": {
      const num = Number(value);
      if (!/^\d+$/.test(value.trim()) || !Number.isInteger(num) || num < 0 || num > 4294967295) {
        return "Must be a valid u32 (0 to 4294967295)";
      }
      return null;
    }
    case "address": {
      if (!STRKEY_RE.test(value.trim())) {
        return "Must be a valid account or contract address (G… or C…)";
      }
      return null;
    }
    default:
      return null;
  }
}
