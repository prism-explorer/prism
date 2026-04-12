"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props { initialValue?: string }

export default function SearchBar({ initialValue = "" }: Props) {
  const [query, setQuery] = useState(initialValue);
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const q = query.trim();
    // Route based on format
    if (q.length === 64) router.push(`/tx/${q}`);          // tx hash
    else if (q.length === 56 && q.startsWith("C")) router.push(`/contract/${q}`);
    else if (/^\d+$/.test(q)) router.push(`/ledger/${q}`);  // ledger sequence
    else router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by tx hash, contract ID, or ledger #"
        className="flex-1 bg-prism-bg border border-prism-border rounded-lg px-4 py-2 text-sm outline-none focus:border-prism-accent font-mono placeholder:font-sans placeholder:text-prism-muted"
      />
      <button
        type="submit"
        className="bg-prism-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
      >
        Search
      </button>
    </form>
  );
}
