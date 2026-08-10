"use client";

import { useState, useTransition } from "react";
import { lookupStorageKeyAction } from "@/lib/actions";
import type { StorageEntry } from "@/types";
import type { StorageKeyKind } from "@/lib/soroban";

interface Props { contractId: string }

export default function StorageLookup({ contractId }: Props) {
  const [kind, setKind] = useState<StorageKeyKind>("symbol");
  const [durability, setDurability] = useState<"persistent" | "temporary">("persistent");
  const [key, setKey] = useState("");
  const [result, setResult] = useState<StorageEntry | { error: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await lookupStorageKeyAction(contractId, kind, key, durability);
      setResult(res);
    });
  }

  return (
    <div className="rounded-xl border border-prism-border bg-prism-surface p-4 mt-4">
      <p className="text-sm text-prism-muted mb-3">
        Look up a specific persistent/temporary storage entry by key. Soroban RPC has no way to list all
        storage keys for a contract — you need to already know the key you&apos;re after.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as StorageKeyKind)}
          className="bg-prism-bg border border-prism-border rounded-lg px-2 py-2 text-xs font-mono outline-none focus:border-prism-accent"
        >
          <option value="symbol">Symbol</option>
          <option value="string">String</option>
          <option value="u32">U32</option>
          <option value="address">Address</option>
        </select>
        <select
          value={durability}
          onChange={(e) => setDurability(e.target.value as "persistent" | "temporary")}
          className="bg-prism-bg border border-prism-border rounded-lg px-2 py-2 text-xs font-mono outline-none focus:border-prism-accent"
        >
          <option value="persistent">Persistent</option>
          <option value="temporary">Temporary</option>
        </select>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="key"
          className="flex-1 min-w-[160px] bg-prism-bg border border-prism-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-prism-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-prism-accent text-white px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? "Looking up…" : "Look up"}
        </button>
      </form>
      {result && (
        <div className="mt-3 text-xs font-mono">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
