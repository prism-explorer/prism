import SearchBar from "@/components/SearchBar";
import LedgerStats from "@/components/LedgerStats";
import TransactionCard from "@/components/TransactionCard";
import { getLatestLedger, getRecentTransactions } from "@/lib/horizon";

export const revalidate = 10;

export default async function Home() {
  const [ledger, transactions] = await Promise.all([
    getLatestLedger(),
    getRecentTransactions(10),
  ]);

  return (
    <div>
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold mb-2">Prism</h1>
        <p className="text-prism-muted mb-8">
          Soroban-native block explorer for the Stellar network
        </p>
        <SearchBar />
      </section>

      <LedgerStats ledger={ledger} />

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <div className="space-y-2">
          {transactions.map((tx) => (
            <TransactionCard key={tx.hash} tx={tx} />
          ))}
        </div>
      </section>
    </div>
  );
}
