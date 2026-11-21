interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  params?: string;
  body?: string;
  example: string;
  notes?: string;
}

interface StatusNote {
  code: string;
  text: string;
}

const statuses: StatusNote[] = [
  {
    code: "200",
    text: "Success. GET /api/contract/:id/events includes error: null. POST /simulate is also 200 when the simulation ran on the network: success true with the return value, or success false and error when the network rejected the call.",
  },
  {
    code: "400",
    text: 'Bad request, body { "error": "..." }. /wasm returns 400 for a Stellar Asset Contract, which has no WASM. /events and /invocations return 400 for an invalid cursor. /storage returns 400 when key is missing, kind is not symbol, string, u32, or address, or the key does not parse. /simulate returns 400 for invalid JSON, a missing functionName, or args that are not an array. Too many arguments for the declared function, or an argument that fails to coerce, is still 400 but the body is { "success": false, "error": "..." }. /ledger/:seq returns 400 when the sequence is not a base-10 integer from 0 through 4294967295.',
  },
  {
    code: "404",
    text: 'Not found, body { "error": "..." }. /api/contract/:id and /wasm: "Contract not found or unreachable". /storage: "No entry found for that key". /tx/:hash: "Transaction not found". /ledger/:seq: "Ledger not found".',
  },
  {
    code: "413",
    text: 'POST /simulate only, when the body is larger than 16 KB: { "error": "Request body too large" }.',
  },
  {
    code: "429",
    text: 'Rate limit, on every route. The body is { "error": "Rate limit exceeded. Try again shortly." } and the response includes Retry-After, the seconds left in the current one-minute window. Each GET route allows 30 requests a minute per client; POST /simulate allows 10.',
  },
  {
    code: "501",
    text: 'GET /storage/full when this deployment has no indexer: { "error": "No indexer configured for this deployment — full storage enumeration isn\'t available." }.',
  },
  {
    code: "502",
    text: 'Upstream failure. /wasm returns { "error": "Could not fetch WASM bytecode" } when the contract is WASM but the bytecode cannot be downloaded. /events returns { "events": [], "nextCursor": null, "error": "<reason>" } when the RPC event lookup fails; error there is the RPC message, and a normal page has error: null.',
  },
];

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/contract/:id",
    description: "Executable type, WASM hash, instance storage, and historyGaps for a contract.",
    example: "/api/contract/CDPUJYCTPGPEGS6MBXYLEWTYSGCPVKUHCURLF2ORT3RAVL5TF5JKIAI5",
    notes:
      "historyGaps lists ledger ranges the indexer skipped, each { fromLedger, toLedger, reason, createdAt }. createdAt is an ISO-8601 timestamp. The array is empty when no indexer is configured, and a gap applies to every contract.",
  },
  {
    method: "GET",
    path: "/api/contract/:id/wasm",
    description:
      "WASM bytecode size and a best-effort parsed ABI: function names, args and return types, any events the contract declares (name, topics, data fields), and its own type definitions (structs, unions, enums).",
    example: "/api/contract/CDPUJYCTPGPEGS6MBXYLEWTYSGCPVKUHCURLF2ORT3RAVL5TF5JKIAI5/wasm",
    notes:
      "Returns 400 if the contract has no WASM (e.g. a Stellar Asset Contract). 404 if the contract is missing or unreachable, 502 if the bytecode cannot be fetched.",
  },
  {
    method: "GET",
    path: "/api/contract/:id/events",
    description: "Events emitted by the contract.",
    params: "limit (default 50, max 100), cursor",
    example: "/api/contract/CDPUJYCTPGPEGS6MBXYLEWTYSGCPVKUHCURLF2ORT3RAVL5TF5JKIAI5/events?limit=10",
    notes:
      "Full history since the indexer started, when one is configured (see indexer/), newest first. Each response has a nextCursor, null on the last page; pass it back as cursor to get the older events. Without an indexer, the RPC node's retention window (~24h on public nodes) is returned in one response and nextCursor is always null. If that RPC lookup fails the route returns 502 with events [], nextCursor null, and error set to the reason.",
  },
  {
    method: "GET",
    path: "/api/contract/:id/invocations",
    description: "Invocation history for the contract.",
    params: "limit (default 20, max 100), cursor",
    example: "/api/contract/CDPUJYCTPGPEGS6MBXYLEWTYSGCPVKUHCURLF2ORT3RAVL5TF5JKIAI5/invocations",
    notes:
      "Full history since the indexer started, when one is configured, newest first, paged with nextCursor as for events. Otherwise derived from recent events and returned in one response, bounded by the same RPC retention window — contracts that never emit events won't show up.",
  },
  {
    method: "GET",
    path: "/api/contract/:id/storage/full",
    description: "Every storage key observed for the contract, at its latest known value.",
    example: "/api/contract/CDPUJYCTPGPEGS6MBXYLEWTYSGCPVKUHCURLF2ORT3RAVL5TF5JKIAI5/storage/full",
    notes:
      "Requires the indexer (returns 501 without one) — this is the one thing plain RPC access genuinely cannot do (no method exists to list a contract's storage keys). Forward-only: reflects activity since the indexer started, not full chain history.",
  },
  {
    method: "GET",
    path: "/api/contract/:id/storage",
    description: "Look up one persistent/temporary storage entry by key.",
    params: "key (required), kind: symbol|string|u32|address (required), durability: persistent|temporary (default persistent)",
    example: "/api/contract/:id/storage?key=Admin&kind=symbol&durability=persistent",
    notes:
      "Works against live chain state via RPC regardless of whether an indexer is configured — you have to already know the key. For enumeration without knowing keys in advance, see /storage/full.",
  },
  {
    method: "POST",
    path: "/api/contract/:id/simulate",
    description: "Simulate a function call against current ledger state (read-only preview).",
    body: '{ "functionName": "current_root", "args": [{ "value": "42", "type": "U32" }] }',
    example: "/api/contract/CDPUJYCTPGPEGS6MBXYLEWTYSGCPVKUHCURLF2ORT3RAVL5TF5JKIAI5/simulate",
    notes: "No signing, no submission, no funds at risk. Rate-limited more tightly than the read routes (10/min).",
  },
  {
    method: "GET",
    path: "/api/tx/:hash",
    description: "Transaction detail plus decoded Soroban invocation (function/args) and resource usage, if any.",
    example: "/api/tx/c4a99120ad6b2c66d4b705b76e334f60c2c99af3f70d8b03be02c9df7dfe2fa6",
  },
  {
    method: "GET",
    path: "/api/ledger/:seq",
    description: "Ledger detail by sequence number.",
    example: "/api/ledger/4064026",
  },
  {
    method: "GET",
    path: "/api/account/:id",
    description:
      "Account detail: sequence, subentry and signer counts, last modified ledger, thresholds, flags, and balances for a Stellar account (G... address).",
    example: "/api/account/GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
    notes:
      "Returns 400 for a malformed account ID, 404 if the account does not exist, and 502 if Horizon cannot be reached or fails.",
  },
];

export default function DocsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">API</h1>
      <p className="text-prism-muted text-sm mb-8 max-w-2xl">
        Read-only JSON endpoints backing the explorer — the same data layer the UI uses. All GET routes are
        rate-limited to 30 requests/minute per client; <code className="font-mono">/simulate</code> to
        10/minute. No API key required.
      </p>

      <div className="space-y-6">
        {endpoints.map((ep) => (
          <div key={ep.method + ep.path} className="rounded-xl border border-prism-border bg-prism-surface p-5">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  ep.method === "GET" ? "bg-prism-accent/20 text-prism-accent" : "bg-prism-green/20 text-prism-green"
                }`}
              >
                {ep.method}
              </span>
              <span className="font-mono text-sm">{ep.path}</span>
            </div>
            <p className="text-sm text-prism-muted mb-3">{ep.description}</p>
            {ep.params && (
              <p className="text-xs font-mono text-prism-muted mb-1">
                <span className="text-prism-strong">params:</span> {ep.params}
              </p>
            )}
            {ep.body && (
              <p className="text-xs font-mono text-prism-muted mb-1 break-all">
                <span className="text-prism-strong">body:</span> {ep.body}
              </p>
            )}
            <p className="text-xs font-mono text-prism-muted break-all mt-2">
              <span className="text-prism-strong">example:</span> {ep.example}
            </p>
            {ep.notes && <p className="text-xs text-prism-muted mt-2 italic">{ep.notes}</p>}
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-10 mb-2">Errors</h2>
      <p className="text-prism-muted text-sm mb-4 max-w-2xl">
        Failures are JSON <code className="font-mono">{`{ "error": "..." }`}</code> unless the status
        below names a different body. These are the status codes the routes return.
      </p>
      <div className="space-y-3 max-w-2xl">
        {statuses.map((row) => (
          <p key={row.code} className="text-sm text-prism-muted">
            <span className="font-mono text-prism-strong">{row.code}</span> — {row.text}
          </p>
        ))}
      </div>
    </div>
  );
}
