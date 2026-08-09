import { getContractEvents } from "@/lib/soroban";
import ContractStorageView from "@/components/ContractStorageView";
import EventLog from "@/components/EventLog";
import { shortHash } from "@/lib/format";

interface Props { params: { id: string } }

export default async function ContractPage({ params }: Props) {
  const events = await getContractEvents(params.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Contract</h1>
      <p className="text-prism-muted font-mono text-sm mb-8">{params.id}</p>

      <div className="grid grid-cols-1 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Storage</h2>
          <ContractStorageView contractId={params.id} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Events</h2>
          <EventLog events={events} />
        </section>
      </div>
    </div>
  );
}
