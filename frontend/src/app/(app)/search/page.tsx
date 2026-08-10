import { redirect } from "next/navigation";
import SearchBar from "@/components/SearchBar";

interface Props { searchParams: { q?: string } }

export default function SearchPage({ searchParams }: Props) {
  const query = (searchParams.q ?? "").trim();

  if (/^[0-9a-fA-F]{64}$/.test(query)) redirect(`/tx/${query}`);
  if (/^C[A-Z0-9]{55}$/.test(query)) redirect(`/contract/${query}`);
  if (/^G[A-Z0-9]{55}$/.test(query)) redirect(`/account/${query}`);
  if (/^\d+$/.test(query)) redirect(`/ledger/${query}`);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Search</h1>
      <SearchBar initialValue={query} />
      {query && (
        <p className="text-prism-muted mt-6 text-sm">
          No match for &quot;{query}&quot;. Try a transaction hash, a contract ID (starts with C), an
          account address (starts with G), or a ledger sequence number.
        </p>
      )}
    </div>
  );
}
