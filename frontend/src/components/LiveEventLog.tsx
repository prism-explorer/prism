"use client";

import { useEffect, useState } from "react";
import EventLog from "./EventLog";
import type { ContractEvent } from "@/types";

interface Props { contractId: string; initialEvents: ContractEvent[]; intervalMs?: number }

export default function LiveEventLog({ contractId, initialEvents, intervalMs = 15_000 }: Props) {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/contract/${contractId}/events`);
        if (!res.ok) return;
        const data = await res.json();
        setEvents(data.events);
      } catch {
        // keep showing the last good data
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [contractId, intervalMs]);

  return <EventLog events={events} />;
}
