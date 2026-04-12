import Link from "next/link";
import SearchBar from "./SearchBar";

export default function Navbar() {
  return (
    <nav className="border-b border-prism-border bg-prism-surface px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        <Link href="/" className="text-lg font-bold text-white shrink-0">
          Prism
        </Link>
        <div className="flex-1 max-w-xl">
          <SearchBar />
        </div>
        <div className="flex gap-5 text-sm text-prism-muted shrink-0">
          <Link href="/"         className="hover:text-white transition">Home</Link>
          <a
            href="https://github.com/prism-explorer/prism"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
