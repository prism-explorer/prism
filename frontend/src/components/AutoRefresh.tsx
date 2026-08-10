"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props { intervalMs?: number }

/**
 * Periodically re-runs the server components on this route so data stays
 * fresh without a manual reload. There's no push/websocket feed from
 * Horizon or Soroban RPC to subscribe to — this is polling, not a live
 * stream, bounded by the same revalidate window as the underlying fetches.
 */
export default function AutoRefresh({ intervalMs = 6000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
