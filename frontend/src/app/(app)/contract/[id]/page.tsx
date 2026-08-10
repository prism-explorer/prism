import { getContractInfo, getContractWasmInfo, getContractEvents, getInvocationHistory } from "@/lib/soroban";
import ContractOverview from "@/components/ContractOverview";
import ContractStorageView from "@/components/ContractStorageView";
import LiveInvocationHistory from "@/components/LiveInvocationHistory";
import InvokeTool from "@/components/InvokeTool";
import LiveEventLog from "@/components/LiveEventLog";

export const dynamic = "force-dynamic";

interface Props { params: { id: string } }

export default async function ContractPage({ params }: Props) {
  const contractId = params.id;
  const info = await getContractInfo(contractId);
  const [wasm, events, invocations] = await Promise.all([
    info?.executable === "wasm" ? getContractWasmInfo(contractId) : Promise.resolve(null),
    getContractEvents(contractId),
    getInvocationHistory(contractId),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Contract</h1>
      <p className="text-prism-muted font-mono text-sm mb-8 break-all">{contractId}</p>

      <div className="grid grid-cols-1 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Overview</h2>
          <ContractOverview info={info} wasm={wasm} />
        </section>

        {wasm && wasm.functions.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Invoke (simulate)</h2>
            <InvokeTool contractId={contractId} functions={wasm.functions} />
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Storage</h2>
          <ContractStorageView contractId={contractId} instanceStorage={info?.instanceStorage ?? []} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Recent Invocations
            <LiveBadge />
          </h2>
          <LiveInvocationHistory contractId={contractId} initialItems={invocations} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Events
            <LiveBadge />
          </h2>
          <LiveEventLog contractId={contractId} initialEvents={events} />
        </section>
      </div>
    </div>
  );
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-normal text-prism-muted">
      <span className="w-1.5 h-1.5 rounded-full bg-prism-green animate-pulse" />
      auto-updating
    </span>
  );
}
