"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { shouldRefresh } from "@/lib/visibility";

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
    // Don't re-run the server components for a tab nobody is looking at.
    // Refresh once when the tab becomes visible again so it isn't stale.
    const refreshIfVisible = () => {
      if (shouldRefresh(document.visibilityState)) router.refresh();
    };
    const id = setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}
