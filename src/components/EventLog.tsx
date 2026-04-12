import type { ContractEvent } from "@/types";
import { shortHash, timeAgo } from "@/lib/format";
import { decodeXdr } from "@/lib/xdr";

interface Props { events: ContractEvent[] }

export default function EventLog({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-prism-muted text-sm">No events emitted by this contract.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((e) => (
        <div key={e.id} className="rounded-lg border border-prism-border bg-prism-surface p-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs bg-prism-accent/20 text-prism-accent px-2 py-0.5 rounded font-mono">
              {e.type}
            </span>
            <span className="text-xs text-prism-muted">{timeAgo(e.timestamp)}</span>
          </div>
          {e.topic.length > 0 && (
            <p className="text-xs text-prism-muted mb-1">
              Topic: <span className="font-mono text-white">{e.topic.join(", ")}</span>
            </p>
          )}
          <p className="text-xs font-mono text-prism-muted break-all">
            {decodeXdr(e.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
