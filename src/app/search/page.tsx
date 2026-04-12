import SearchBar from "@/components/SearchBar";

interface Props { searchParams: { q?: string } }

export default function SearchPage({ searchParams }: Props) {
  const query = searchParams.q ?? "";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Search</h1>
      <SearchBar initialValue={query} />
      {query && (
        <p className="text-prism-muted mt-6 text-sm">
          Searching for: <span className="font-mono text-white">{query}</span>
          {/* TODO: route to /tx/[hash], /contract/[id], or /ledger/[seq] based on query format */}
        </p>
      )}
    </div>
  );
}
