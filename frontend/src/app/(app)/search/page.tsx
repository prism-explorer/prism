import { redirect } from "next/navigation";
import SearchBar from "@/components/SearchBar";

interface Props { searchParams: { q?: string } }

export default function SearchPage({ searchParams }: Props) {
  const query = (searchParams.q ?? "").trim();

  if (/^[0-9a-fA-F]{64}$/.test(query)) redirect(`/tx/${query}`);
  if (/^C[A-Z0-9]{55}$/.test(query)) redirect(`/contract/${query}`);
  if (/^\d+$/.test(query)) redirect(`/ledger/${query}`);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Search</h1>
      <SearchBar initialValue={query} />
      {query && (
        <p className="text-prism-muted mt-6 text-sm">
          {/^G[A-Z0-9]{55}$/.test(query)
            ? "That looks like a Stellar account address — Prism is focused on Soroban contracts and doesn't have an account view yet."
            : `No match for "${query}". Try a transaction hash, a contract ID (starts with C), or a ledger sequence number.`}
        </p>
      )}
    </div>
  );
}
