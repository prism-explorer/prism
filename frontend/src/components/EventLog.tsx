import Link from "next/link";
import type { ContractEvent } from "@/types";
import { shortHash, timeAgo } from "@/lib/format";

interface Props { events: ContractEvent[] }

export default function EventLog({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-prism-muted text-sm">
        No events emitted by this contract in the last ~24h (the RPC node&apos;s retention window).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((e) => (
        <div key={e.id} className="rounded-lg border border-prism-border bg-prism-surface p-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs bg-prism-accent/20 text-prism-accent px-2 py-0.5 rounded font-mono">
              {e.type}
            </span>
            <div className="flex items-center gap-3">
              <Link href={`/tx/${e.txHash}`} className="text-xs text-prism-muted hover:text-white transition font-mono">
                {shortHash(e.txHash, 4)}
              </Link>
              <span className="text-xs text-prism-muted">{timeAgo(e.timestamp)}</span>
            </div>
          </div>
          {e.topic.length > 0 && (
            <p className="text-xs text-prism-muted mb-1">
              Topic: <span className="font-mono text-white">{e.topic.join(", ")}</span>
            </p>
          )}
          <p className="text-xs font-mono text-prism-muted break-all">{e.value}</p>
        </div>
      ))}
    </div>
  );
}
