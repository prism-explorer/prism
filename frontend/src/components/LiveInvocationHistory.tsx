"use client";

import { useEffect, useState } from "react";
import InvocationHistory from "./InvocationHistory";
import type { InvocationHistoryItem } from "@/types";

interface Props { contractId: string; initialItems: InvocationHistoryItem[]; intervalMs?: number }

export default function LiveInvocationHistory({ contractId, initialItems, intervalMs = 15_000 }: Props) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/contract/${contractId}/invocations`);
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.invocations);
      } catch {
        // keep showing the last good data
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [contractId, intervalMs]);

  return <InvocationHistory items={items} />;
}
