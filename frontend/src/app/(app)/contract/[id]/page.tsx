import { getContractInfo, getContractWasmInfo, getContractEvents, getInvocationHistory } from "@/lib/soroban";
import ContractOverview from "@/components/ContractOverview";
import ContractStorageView from "@/components/ContractStorageView";
import InvocationHistory from "@/components/InvocationHistory";
import InvokeTool from "@/components/InvokeTool";
import EventLog from "@/components/EventLog";

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
          <h2 className="text-lg font-semibold mb-3">Recent Invocations</h2>
          <InvocationHistory items={invocations} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Events</h2>
          <EventLog events={events} />
        </section>
      </div>
    </div>
  );
}
