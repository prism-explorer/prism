import Link from "next/link";
import type { ContractEvent, ContractEventSpec } from "@/types";
import { shortHash } from "@/lib/format";
import { linkifyAddresses } from "@/lib/linkify";
import { labelEventData, labelEventTopics, matchEventSpec } from "@/lib/event-spec";
import RelativeTime from "@/components/RelativeTime";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface Props {
  events: ContractEvent[];
  specs?: ContractEventSpec[];
  /** Set when the lookup failed; distinct from a successful, empty result. */
  error?: string | null;
  /** Simulated events have no transaction/ledger, so hide that metadata. */
  showMeta?: boolean;
  /** Override the empty-state copy when the events aren't a historical lookup. */
  emptyMessage?: string;
}

export default function EventLog({
  events,
  specs = [],
  error = null,
  showMeta = true,
  emptyMessage,
}: Props) {
  if (error) {
    return (
      <ErrorState>
        Couldn&apos;t load events from the RPC node. {error}
      </ErrorState>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState>
        {emptyMessage ??
          "No events emitted by this contract in the last ~24h (the RPC node's retention window)."}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((e) => {
        const spec = matchEventSpec(e.topic, specs);
        const labelled = spec ? labelEventTopics(e.topic, spec) : [];
        const data = spec ? labelEventData(e.value, spec) : null;

        return (
          <div key={e.id} className="rounded-lg border border-prism-border bg-prism-surface p-4">
            <div className="flex justify-between mb-2 gap-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {spec ? (
                  <span
                    className="text-xs bg-prism-green/20 text-prism-green px-2 py-0.5 rounded font-mono"
                    title={spec.doc}
                  >
                    {spec.name}
                  </span>
                ) : (
                  <span className="text-xs bg-prism-accent/20 text-prism-accent px-2 py-0.5 rounded font-mono">
                    {e.type}
                  </span>
                )}
              </div>
              {showMeta && (
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/tx/${e.txHash}`}
                    className="text-xs text-prism-muted hover:text-prism-strong transition font-mono"
                  >
                    {shortHash(e.txHash, 4)}
                  </Link>
                  <span className="text-xs text-prism-muted">
                    <RelativeTime iso={e.timestamp} />
                  </span>
                </div>
              )}
            </div>

            {spec ? (
              labelled.length > 0 && (
                <dl className="mb-1 space-y-0.5">
                  {labelled.map((field) => (
                    <div key={field.name} className="flex gap-2 text-xs">
                      <dt className="text-prism-muted shrink-0">
                        {field.name}
                        <span className="opacity-60"> ({field.type})</span>
                      </dt>
                      <dd className="font-mono text-prism-strong break-all">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              )
            ) : (
              e.topic.length > 0 && (
                <p className="text-xs text-prism-muted mb-1">
                  Topic:{" "}
                  <span className="font-mono text-prism-strong">
                    {e.topic.map((topic, i) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        {linkifyAddresses(topic)}
                      </span>
                    ))}
                  </span>
                </p>
              )
            )}

            {data ? (
              <dl className="space-y-0.5">
                {data.map((field) => (
                  <div key={field.name} className="flex gap-2 text-xs">
                    <dt className="text-prism-muted shrink-0">
                      {field.name}
                      <span className="opacity-60"> ({field.type})</span>
                    </dt>
                    <dd className="font-mono text-prism-strong break-all">{field.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs font-mono text-prism-muted break-all">{linkifyAddresses(e.value)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
