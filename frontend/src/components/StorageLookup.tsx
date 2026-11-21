"use client";

import { useState, useTransition } from "react";
import { lookupStorageKeyAction } from "@/lib/actions";
import { formatNumber } from "@/lib/format";
import { SIMPLE_STORAGE_KEY_KINDS, validateStorageKeyValue } from "@/lib/storage-key-validation";
import type { ContractTypeDef, StorageEntry } from "@/types";

interface Props {
  contractId: string;
  /** The contract's parsed type definitions, used to offer union/enum key variants. */
  types?: ContractTypeDef[];
}

interface KeyCase { name: string; types: string[] }

/** Unions and enums can both be used as storage keys; normalise their cases. */
function casesFor(def: ContractTypeDef | undefined): KeyCase[] {
  if (!def) return [];
  if (def.kind === "union") return def.cases;
  if (def.kind === "enum") return def.cases.map((c) => ({ name: c.name, types: [] }));
  return [];
}

export default function StorageLookup({ contractId, types = [] }: Props) {
  const [kind, setKind] = useState<string>("symbol");
  const [durability, setDurability] = useState<"persistent" | "temporary">("persistent");
  const [key, setKey] = useState("");
  const [selectedCase, setSelectedCase] = useState("");
  const [caseValues, setCaseValues] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<StorageEntry | { error: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Only unions and enums make sense as selectable key variants.
  const keyTypeDefs = types.filter((t) => t.kind === "union" || t.kind === "enum");
  const activeDef = keyTypeDefs.find((t) => t.name === kind);
  const activeCases = casesFor(activeDef);
  const activeCase = activeCases.find((c) => c.name === selectedCase);

  function handleKeyChange(value: string) {
    setKey(value);
    setValidationError(validateStorageKeyValue(value, kind));
  }

  function handleKindChange(newKind: string) {
    setKind(newKind);
    setResult(null);
    const def = keyTypeDefs.find((t) => t.name === newKind);
    const firstCase = casesFor(def)[0];
    setSelectedCase(firstCase?.name ?? "");
    setCaseValues(firstCase ? firstCase.types.map(() => "") : []);
    setValidationError(def ? null : validateStorageKeyValue(key, newKind));
  }

  function handleCaseChange(name: string) {
    setSelectedCase(name);
    const chosen = activeCases.find((c) => c.name === name);
    setCaseValues(chosen ? chosen.types.map(() => "") : []);
    setValidationError(null);
    setResult(null);
  }

  function handleCaseValueChange(index: number, value: string) {
    setCaseValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setValidationError(validateStorageKeyValue(value, activeCase?.types[index] ?? ""));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError) return;

    // Build the raw key the same way the invoke tool builds union/enum args:
    // a bare variant name for a payload-free case, or {"Case": [values...]}
    // for one with payloads. coerceArgInput on the server does the encoding.
    let rawKey = key;
    if (activeDef) {
      if (activeCase && activeCase.types.length > 0) {
        rawKey = JSON.stringify({
          [activeCase.name]: activeCase.types.map((_, i) => (caseValues[i] ?? "").trim()),
        });
      } else {
        rawKey = selectedCase || activeCases[0]?.name || "";
      }
    }
    if (!rawKey.trim()) return;

    startTransition(async () => {
      const res = await lookupStorageKeyAction(contractId, kind, rawKey, durability, types);
      setResult(res);
    });
  }

  return (
    <div className="rounded-xl border border-prism-border bg-prism-surface p-4 mt-4">
      <p className="text-sm text-prism-muted mb-3">
        Look up a specific persistent/temporary storage entry by key. Soroban RPC has no way to list all
        storage keys for a contract — you need to already know the key you&apos;re after.
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-wrap gap-2 items-start">
          <div className="flex flex-col gap-1">
            <label htmlFor="kind-select" className="text-xs font-mono text-prism-muted">
              Key type
            </label>
            <select
              id="kind-select"
              value={kind}
              onChange={(e) => handleKindChange(e.target.value)}
              className="bg-prism-bg border border-prism-border rounded-lg px-2 py-2 text-xs font-mono outline-none focus:border-prism-accent"
            >
              <optgroup label="Simple">
                {SIMPLE_STORAGE_KEY_KINDS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </optgroup>
              {keyTypeDefs.length > 0 && (
                <optgroup label="Contract types">
                  {keyTypeDefs.map((t) => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="durability-select" className="text-xs font-mono text-prism-muted">
              Durability
            </label>
            <select
              id="durability-select"
              value={durability}
              onChange={(e) => setDurability(e.target.value as "persistent" | "temporary")}
              className="bg-prism-bg border border-prism-border rounded-lg px-2 py-2 text-xs font-mono outline-none focus:border-prism-accent"
            >
              <option value="persistent">Persistent</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>
          {activeDef && (
            <div className="flex flex-col gap-1">
              <label htmlFor="case-select" className="text-xs font-mono text-prism-muted">
                Variant
              </label>
              <select
                id="case-select"
                value={selectedCase}
                onChange={(e) => handleCaseChange(e.target.value)}
                className="bg-prism-bg border border-prism-border rounded-lg px-2 py-2 text-xs font-mono outline-none focus:border-prism-accent"
              >
                {activeCases.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {activeDef ? (
            activeCase && activeCase.types.length > 0 ? (
              <div className="flex flex-1 flex-wrap gap-2 items-start">
                {activeCase.types.map((type, i) => (
                  <div key={i} className="flex flex-1 min-w-[120px] flex-col gap-1">
                    <label htmlFor={`case-value-${i}`} className="text-xs font-mono text-prism-muted">
                      {type}
                    </label>
                    <input
                      id={`case-value-${i}`}
                      value={caseValues[i] ?? ""}
                      onChange={(e) => handleCaseValueChange(i, e.target.value)}
                      placeholder={type}
                      className="w-full bg-prism-bg border border-prism-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-prism-accent"
                    />
                  </div>
                ))}
              </div>
            ) : null
          ) : (
            <div className="flex-1 min-w-[160px]">
              <input
                value={key}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="key"
                className="w-full bg-prism-bg border border-prism-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-prism-accent"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={pending || !!validationError}
            className="bg-prism-accent text-prism-on-accent px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {pending ? "Looking up…" : "Look up"}
          </button>
        </div>
        {validationError && <p className="text-xs text-prism-red">{validationError}</p>}
      </form>
      {result && (
        <div className="mt-3 text-xs font-mono" aria-live="polite">
          {"error" in result ? (
            <p className="text-prism-red">{result.error}</p>
          ) : (
            <div className="rounded-lg border border-prism-border p-3 space-y-1">
              <p>
                <span className="text-prism-muted">Key:</span> {result.key}
              </p>
              <p className="break-all">
                <span className="text-prism-muted">Value:</span> {result.value}
              </p>
              {result.liveUntilLedgerSeq !== undefined && (
                <p>
                  <span className="text-prism-muted">Live until ledger:</span> #{formatNumber(result.liveUntilLedgerSeq)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
