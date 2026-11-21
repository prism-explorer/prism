"use client";

import { useState, useTransition } from "react";
import { simulateInvocationAction } from "@/lib/actions";
import type { ContractEventSpec, ContractFunctionSpec, ContractTypeDef } from "@/types";
import { describeContractError } from "@/lib/contract-error";
import type { SimulationResult } from "@/lib/soroban";
import { formatNumber } from "@/lib/format";
import CopyButton from "@/components/CopyButton";
import EventLog from "@/components/EventLog";

interface Props {
  contractId: string;
  functions: ContractFunctionSpec[];
  types?: ContractTypeDef[];
  /** Event declarations from the contract spec, used to label simulated events. */
  eventSpecs?: ContractEventSpec[];
}

export default function InvokeTool({ contractId, functions, types = [], eventSpecs = [] }: Props) {
  const [selected, setSelected] = useState(functions[0]?.name ?? "");
  const fn = functions.find((f) => f.name === selected);
  const [values, setValues] = useState<Record<string, string>>({});
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSelect(name: string) {
    setSelected(name);
    setValues({});
    setJsonErrors({});
    setResult(null);
  }

  function validateJsonArg(name: string, value: string, type: string): string | null {
    if (!value.trim()) return null;
    if (!needsJsonValidation(type)) return null;
    try {
      JSON.parse(value);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid JSON";
    }
  }

  function handleArgChange(name: string, value: string, type: string) {
    setValues((v) => ({ ...v, [name]: value }));
    const error = validateJsonArg(name, value, type);
    setJsonErrors((e) => {
      if (error) return { ...e, [name]: error };
      const { [name]: _, ...rest } = e;
      return rest;
    });
  }

  function needsJsonValidation(type: string): boolean {
    return /^(Vec|Map)</.test(type.trim()) || 
           types.some((t) => t.name === type.trim() && (t.kind === "struct" || t.kind === "union"));
  }

  const hasJsonErrors = Object.keys(jsonErrors).length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fn || hasJsonErrors) return;
    const args = fn.inputs.map((input) => ({ value: values[input.name] ?? "", type: input.type }));
    startTransition(async () => {
      const res = await simulateInvocationAction(contractId, fn.name, args, types);
      setResult(res);
    });
  }

  function formatReturnValue(value: string): { formatted: string; raw: string } {
    try {
      const parsed = JSON.parse(value);
      return { formatted: JSON.stringify(parsed, null, 2), raw: value };
    } catch {
      return { formatted: value, raw: value };
    }
  }

  return (
    <div className="rounded-xl border border-prism-border bg-prism-surface p-4 space-y-3">
      <p className="text-xs text-prism-muted">
        Simulates the call against current ledger state — read-only, nothing is signed or submitted, no
        funds at risk.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="function-select" className="block text-xs font-mono text-prism-muted mb-1">
            Function
          </label>
          <select
            id="function-select"
            value={selected}
            onChange={(e) => handleSelect(e.target.value)}
            className="w-full bg-prism-bg border border-prism-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-prism-accent"
          >
          {functions.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
          </select>
        </div>

        {fn && fn.inputs.length > 0 && (
          <div className="space-y-2">
            {fn.inputs.map((input) => {
              const inputId = `${fn.name}-${input.name}`;
              const error = jsonErrors[input.name];
              return (
                <div key={input.name} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor={inputId} className="text-xs font-mono text-prism-muted w-32 shrink-0 truncate">
                      {input.name}: {input.type}
                    </label>
                    <input
                      id={inputId}
                      value={values[input.name] ?? ""}
                      onChange={(e) => handleArgChange(input.name, e.target.value, input.type)}
                      className="flex-1 bg-prism-bg border border-prism-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-prism-accent"
                      placeholder={placeholderFor(input.type, types)}
                    />
                  </div>
                  {error && <p className="text-xs text-prism-red ml-32 pl-2">{error}</p>}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !fn || hasJsonErrors}
          className="bg-prism-accent text-prism-on-accent px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? "Simulating…" : "Simulate call"}
        </button>
      </form>

      {result && (
        <div className="text-xs font-mono border-t border-prism-border pt-3" aria-live="polite">
          {result.success ? (
            <div className="space-y-1">
              <p className="text-prism-green">Simulation succeeded</p>
              {result.returnValue !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-prism-muted">Return:</span>
                    <CopyButton value={formatReturnValue(result.returnValue!).raw} what="return value" />
                  </div>
                  <pre className="break-all whitespace-pre-wrap bg-prism-bg border border-prism-border rounded p-2 text-xs">
                    {formatReturnValue(result.returnValue).formatted}
                  </pre>
                </div>
              )}
              {result.auth && result.auth.length > 0 && (
                <div className="space-y-1">
                  <p className="text-prism-muted">Authorization</p>
                  <ul className="list-disc list-inside space-y-0.5 break-all">
                    {result.auth.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.events !== undefined && (
                <div className="space-y-1">
                  <p className="text-prism-muted">Events emitted</p>
                  <EventLog
                    events={result.events}
                    specs={eventSpecs}
                    showMeta={false}
                    emptyMessage="No events emitted during this simulation."
                  />
                </div>
              )}
              {result.footprint && (
                <div className="space-y-1">
                  <p className="text-prism-muted">Footprint</p>
                  <p>
                    <span className="text-prism-muted">Read bytes:</span>{" "}
                    {formatNumber(result.footprint.readBytes)} ·{" "}
                    <span className="text-prism-muted">Write bytes:</span>{" "}
                    {formatNumber(result.footprint.writeBytes)}
                  </p>
                  {result.footprint.readOnly.length > 0 && (
                    <div>
                      <p className="text-prism-muted">Read-only ({result.footprint.readOnly.length})</p>
                      <ul className="list-disc list-inside space-y-0.5 break-all">
                        {result.footprint.readOnly.map((key, i) => (
                          <li key={i}>{key}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.footprint.readWrite.length > 0 && (
                    <div>
                      <p className="text-prism-muted">Read-write ({result.footprint.readWrite.length})</p>
                      <ul className="list-disc list-inside space-y-0.5 break-all">
                        {result.footprint.readWrite.map((key, i) => (
                          <li key={i}>{key}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {result.instructions !== undefined && (
                <p>
                  <span className="text-prism-muted">Instructions:</span> {formatNumber(result.instructions)}
                </p>
              )}
              {result.resourceFeeStroops && (
                <p>
                  <span className="text-prism-muted">Est. resource fee:</span> {result.resourceFeeStroops}{" "}
                  stroops
                </p>
              )}
            </div>
          ) : (
            <ErrorReport
              message={result.error ?? "Simulation failed."}
              types={types}
              needsRestore={result.needsRestore}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ErrorReport({
  message,
  types,
  needsRestore,
}: {
  message: string;
  types: ContractTypeDef[];
  needsRestore?: { minResourceFeeStroops: string };
}) {
  const named = describeContractError(message, types);

  return (
    <div className="space-y-1">
      {named && (
        <p className="text-prism-red font-medium">
          {named.name} <span className="opacity-70">(#{named.code})</span>
        </p>
      )}
      <p className="text-prism-red break-all opacity-80">{message}</p>
      {needsRestore && (
        <div className="mt-2 p-2 bg-prism-yellow/10 border border-prism-yellow rounded text-prism-yellow">
          <p className="font-medium">Archived entries must be restored</p>
          <p className="opacity-80">Restore fee: {needsRestore.minResourceFeeStroops} stroops</p>
        </div>
      )}
    </div>
  );
}

function placeholderFor(type: string, types: ContractTypeDef[]): string {
  const generic = /^(Vec|Map|Option)<(.+)>$/.exec(type.trim());
  if (generic) {
    if (generic[1] === "Vec") return `["…"] — JSON array of ${generic[2]}`;
    if (generic[1] === "Map") return `{"key": "value"} — JSON object`;
    return `${generic[2]} — or leave empty for none`;
  }

  const def = types.find((d) => d.name === type.trim());
  if (!def) return type;

  if (def.kind === "struct") {
    return def.fields.every((f) => /^\d+$/.test(f.name))
      ? `[${def.fields.map((f) => f.type).join(", ")}] — JSON array`
      : `{${def.fields.map((f) => `"${f.name}": …`).join(", ")}}`;
  }
  if (def.kind === "union") {
    const withPayload = def.cases.find((c) => c.types.length > 0);
    const bare = def.cases.find((c) => c.types.length === 0);
    return withPayload
      ? `${bare ? `${bare.name} or ` : ""}{"${withPayload.name}": [...]}`
      : def.cases.map((c) => c.name).join(" | ");
  }
  if (def.kind === "enum") return def.cases.map((c) => c.name).join(" | ");
  return type;
}
