"use client";

import { useEffect, useState } from "react";
import EventLog from "./EventLog";
import SectionHeader from "./SectionHeader";
import { appendUnique, mergeVisible } from "@/lib/list-pagination";
import type { ContractEvent, ContractEventSpec } from "@/types";

interface Props {
  contractId: string;
  initialEvents: ContractEvent[];
  initialNextCursor: string | null;
  /** Set when the initial server-side lookup failed; distinct from an empty result. */
  initialError?: string | null;
  /** Page size the list is fetched with, used to tell when the RPC fallback is capped. */
  limit: number;
  /** True when no indexer is configured, so the events come from the RPC node. */
  rpcFallback: boolean;
  /** Event declarations from the contract spec, used to name and label events. */
  specs?: ContractEventSpec[];
  title: string;
  intervalMs?: number;
}

export default function LiveEventLog({
  contractId,
  initialEvents,
  initialNextCursor,
  initialError = null,
  limit,
  rpcFallback,
  specs,
  title,
  intervalMs = 15_000,
}: Props) {
  // Polling replaces only the newest page. Older pages fetched with "Load
  // older" are kept separately, so a poll never drops them. Events that shift
  // from an older page into the first page are shown once, by event id.
  const [firstPage, setFirstPage] = useState(initialEvents);
  const [olderEvents, setOlderEvents] = useState<ContractEvent[]>([]);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [error, setError] = useState<string | null>(initialError);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);

  const events = mergeVisible(firstPage, olderEvents, (event) => event.id);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/contract/${contractId}/events`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error ?? "The RPC node rejected the request.");
          return;
        }
        setFirstPage(data.events);
        setNextCursor(data.nextCursor ?? null);
        setError(null);
      } catch {
        setError("The events API could not be reached.");
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [contractId, intervalMs]);

  async function loadOlder() {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const res = await fetch(
        `/api/contract/${contractId}/events?cursor=${encodeURIComponent(nextCursor)}`
      );
      if (!res.ok) throw new Error("The events API could not be reached.");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOlderEvents((prev) => appendUnique(prev, data.events as ContractEvent[], (event) => event.id));
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      setOlderError(err instanceof Error ? err.message : "Could not load older events.");
    } finally {
      setLoadingOlder(false);
    }
  }

  return (
    <>
      <SectionHeader
        title={title}
        count={events.length}
        cap={nextCursor !== null || rpcFallback ? limit : undefined}
        live
      />
      <EventLog events={events} specs={specs} error={error} />
      {nextCursor && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={loadOlder}
            disabled={loadingOlder}
            className="border border-prism-border px-4 py-2 rounded-lg text-xs font-medium text-prism-muted hover:text-prism-strong transition disabled:opacity-50"
          >
            {loadingOlder ? "Loading older…" : "Load older"}
          </button>
          {olderError && <span className="text-xs text-prism-red">{olderError}</span>}
        </div>
      )}
    </>
  );
}
