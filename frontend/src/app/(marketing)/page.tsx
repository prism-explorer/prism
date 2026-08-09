import Link from "next/link";

const GITHUB_URL = "https://github.com/prism-explorer/prism";
const CONTRIBUTING_URL = `${GITHUB_URL}/blob/main/CONTRIBUTING.md`;

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const sectionLabel: React.CSSProperties = {
  ...mono,
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--text-faint)",
  marginBottom: 36,
};

export default function LandingPage() {
  return (
    <div className="landing">
      <div
        className="ticker"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "8px 32px",
          borderBottom: "1px solid var(--line)",
          background: "var(--panel2)",
          ...mono,
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "var(--text-dim)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--green)" }}>
          <span className="pulse-dot" style={{ width: 6, height: 6, background: "var(--green)", display: "inline-block" }} />
          LIVE
        </span>
        <span>LEDGER 52,481,920</span>
        <span style={{ color: "var(--text-faint)" }}>|</span>
        <span>TPS 214</span>
        <span style={{ color: "var(--text-faint)" }}>|</span>
        <span>CLOSE 5.2s</span>
        <span style={{ color: "var(--text-faint)" }}>|</span>
        <span>ACTIVE CONTRACTS 8,204</span>
      </div>

      <nav className="nav-links">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit" }}>
          <span style={{ width: 14, height: 14, background: "var(--amber)", transform: "rotate(45deg)", display: "inline-block" }} />
          <span style={{ ...mono, fontWeight: 700, fontSize: 16, letterSpacing: "0.06em" }}>PRISM</span>
        </Link>
        <a href="#why" className="nav-link" style={{ ...mono, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", marginLeft: "auto" }}>Why</a>
        <a href="#features" className="nav-link" style={{ ...mono, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>Features</a>
        <a href="#roadmap" className="nav-link" style={{ ...mono, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>Roadmap</a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="nav-link" style={{ ...mono, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>GitHub</a>
        <Link
          href="/explorer"
          className="btn-fill"
          style={{ ...mono, fontWeight: 700, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", background: "var(--amber)", color: "#12100a", padding: "11px 18px" }}
        >
          Open Explorer
        </Link>
      </nav>

      <section
        className="hero-grid"
        style={{ maxWidth: 1240, margin: "0 auto", padding: "100px 32px 90px", borderBottom: "1px solid var(--line)" }}
      >
        <div className="fade-up">
          <div style={{ ...mono, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--amber)", marginBottom: 22 }}>
            &gt; soroban_native_explorer
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 68, lineHeight: 1.03, letterSpacing: "-0.02em", margin: "0 0 26px" }}>
            See inside every{" "}
            <span style={{ color: "var(--amber)", textShadow: "0 0 30px rgba(255,176,32,0.45)" }}>Soroban</span> contract.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, maxWidth: "50ch", color: "var(--text-dim)", margin: "0 0 34px" }}>
            Existing explorers stop at classic Stellar operations. Prism reads what they can&apos;t — contract storage,
            invocation history, emitted events and raw WASM — in one fast, community-owned interface.
          </p>
          <div style={{ display: "flex", gap: 14 }}>
            <Link
              href="/explorer"
              className="btn-fill-lg"
              style={{ ...mono, fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", background: "var(--amber)", color: "#12100a", padding: "15px 26px" }}
            >
              Launch the explorer
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
              style={{ ...mono, fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", border: "1px solid var(--line-strong)", color: "var(--text)", padding: "15px 26px" }}
            >
              View source
            </a>
          </div>
        </div>

        <div
          className="fade-up-delay"
          style={{ background: "var(--panel)", ...mono, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-dim)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, background: "var(--green)", display: "inline-block" }} />
            <span style={{ color: "var(--text-faint)", letterSpacing: "0.04em" }}>live_invocations.log</span>
          </div>
          <div style={{ padding: "16px 20px 20px", display: "grid", gap: 10 }}>
            <div className="log-row">
              <span style={{ color: "var(--text-faint)" }}>14:02:11</span>
              <span style={{ color: "var(--amber)" }}>swap</span>
              <span style={{ color: "var(--text-dim)" }}>A&rarr;B, amount=5000</span>
              <span style={{ color: "var(--green)", textAlign: "right" }}>ok</span>
            </div>
            <div className="log-row">
              <span style={{ color: "var(--text-faint)" }}>14:01:47</span>
              <span style={{ color: "var(--amber)" }}>deposit</span>
              <span style={{ color: "var(--text-dim)" }}>shares_minted=1840</span>
              <span style={{ color: "var(--green)", textAlign: "right" }}>ok</span>
            </div>
            <div className="log-row">
              <span style={{ color: "var(--text-faint)" }}>14:01:19</span>
              <span style={{ color: "var(--amber)" }}>swap</span>
              <span style={{ color: "var(--text-dim)" }}>B&rarr;A, amount=900</span>
              <span style={{ color: "var(--red)", textAlign: "right" }}>fail</span>
            </div>
            <div className="log-row">
              <span style={{ color: "var(--text-faint)" }}>14:00:52</span>
              <span style={{ color: "var(--amber)" }}>withdraw</span>
              <span style={{ color: "var(--text-dim)" }}>shares=120</span>
              <span style={{ color: "var(--green)", textAlign: "right" }}>ok</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ color: "var(--text-faint)" }}>&gt;</span>
              <span className="pulse-dot" style={{ width: 7, height: 12, background: "var(--amber)", display: "inline-block" }} />
            </div>
          </div>
        </div>
      </section>

      <section id="why" style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 32px", borderBottom: "1px solid var(--line)" }}>
        <div style={sectionLabel}>01 — Why Prism</div>
        <div className="why-grid">
          <div style={{ padding: 28, border: "1px solid var(--line)" }}>
            <div style={{ ...mono, fontSize: 13, color: "var(--text-faint)", marginBottom: 18 }}>$ classic_explorers --show</div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14, fontSize: 15, color: "var(--text-dim)" }}>
              <li>Payments, offers, and other classic operations</li>
              <li>Account balances and trustlines</li>
              <li>Ledger sequence and basic transaction status</li>
            </ul>
          </div>
          <div style={{ padding: 28, border: "1px solid var(--line-strong)", borderLeft: "none", background: "var(--amber-dim)" }}>
            <div style={{ ...mono, fontSize: 13, color: "var(--amber)", marginBottom: 18 }}>$ prism --show</div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14, fontSize: 15 }}>
              <li><span style={{ color: "var(--amber)" }}>&gt;</span> Live contract storage — persistent, temporary, instance</li>
              <li><span style={{ color: "var(--amber)" }}>&gt;</span> Full invocation history with inputs, outputs and fees</li>
              <li><span style={{ color: "var(--amber)" }}>&gt;</span> WASM bytecode, ABI, and emitted event logs</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="features" style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 32px", borderBottom: "1px solid var(--line)" }}>
        <div style={sectionLabel}>02 — Features</div>
        <div className="features-grid">
          <FeatureCard badge="Live now" live title="Contract Explorer" desc="WASM bytecode, live storage, invocation history and events for any deployed contract." />
          <FeatureCard badge="Roadmap" title="Transaction Explorer" desc="Soroban-aware decoding, dry-run simulation and resource/fee breakdowns." />
          <FeatureCard badge="Roadmap" title="Ledger & Network" desc="Real-time ledger streaming, TPS and close-time stats, unified search." />
          <FeatureCard badge="Roadmap" title="Developer Tools" desc="In-browser contract invocation, ABI display and an XDR decoder." />
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 32px", borderBottom: "1px solid var(--line)" }}>
        <div style={sectionLabel}>03 — Architecture</div>
        <div style={{ display: "grid", gap: 0, maxWidth: 720, ...mono }}>
          <div style={{ border: "1px solid var(--line-strong)", padding: "18px 20px", background: "var(--panel)" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Browser (Next.js)</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Contract View &middot; Tx Explorer &middot; Dev Tools</div>
          </div>
          <div style={{ padding: "8px 0 8px 20px", fontSize: 16, color: "var(--amber)" }}>&darr;</div>
          <div style={{ border: "1px solid var(--line-strong)", padding: "18px 20px", background: "var(--panel)" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Prism API (Next.js API routes)</div>
          </div>
          <div style={{ padding: "8px 0 8px 20px", fontSize: 16, color: "var(--amber)" }}>&darr;</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line-strong)" }}>
            <div style={{ padding: "18px 20px", background: "var(--panel)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Stellar Horizon</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Classic operations</div>
            </div>
            <div style={{ padding: "18px 20px", background: "var(--panel)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Soroban RPC</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Contract data</div>
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 32px" }}>
        <div style={sectionLabel}>04 — Roadmap</div>
        <div style={{ display: "grid", gap: 0, maxWidth: 760, ...mono, fontSize: 14 }}>
          <RoadmapRow label="Ledger overview and real-time streaming" done={false} />
          <RoadmapRow label="Transaction explorer with Soroban decoding" done={false} />
          <RoadmapRow label="Contract storage inspector" done status="IN PREVIEW" />
          <RoadmapRow label="Contract invocation history and event log" done status="IN PREVIEW" />
          <RoadmapRow label="In-browser contract invocation tool" done={false} />
          <RoadmapRow label="XDR decoder" done={false} />
          <RoadmapRow label="Docker Compose & mainnet deployment" done={false} last />
        </div>
      </section>

      <section style={{ position: "relative", padding: "110px 32px", background: "#0d0e0c", borderTop: "1px solid var(--line)", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,176,32,0.12) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            opacity: 0.6,
          }}
        />
        <div style={{ maxWidth: 1240, margin: "0 auto", position: "relative" }}>
          <h2
            className="cta-heading"
            style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 54, lineHeight: 1.06, margin: "0 0 30px", maxWidth: "16ch", color: "var(--amber)", textShadow: "0 0 40px rgba(255,176,32,0.35)" }}
          >
            Explore Soroban, openly.
          </h2>
          <Link
            href="/explorer"
            className="btn-fill-cta"
            style={{ display: "inline-flex", ...mono, fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", background: "var(--amber)", color: "#12100a", padding: "16px 28px" }}
          >
            Launch the explorer
          </Link>
        </div>
      </section>

      <footer style={{ maxWidth: 1240, margin: "0 auto", padding: "26px 32px", borderTop: "1px solid var(--line)", display: "flex", gap: 24, alignItems: "center", ...mono, fontSize: 12, color: "var(--text-faint)" }}>
        <span>MIT licensed</span>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
        <a href={CONTRIBUTING_URL} target="_blank" rel="noopener noreferrer" className="footer-link">Contributing</a>
        <span style={{ marginLeft: "auto" }}>Prism &middot; community-built Soroban explorer</span>
      </footer>
    </div>
  );
}

function FeatureCard({ badge, title, desc, live }: { badge: string; title: string; desc: string; live?: boolean }) {
  return (
    <div style={{ padding: 26, background: "var(--bg)", display: "flex", flexDirection: "column", gap: 12, minHeight: 210 }}>
      <span
        style={
          live
            ? { display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 9px", background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid rgba(255,176,32,0.4)" }
            : { display: "inline-flex", alignSelf: "flex-start", ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 9px", border: "1px solid var(--line-strong)", color: "var(--text-faint)" }
        }
      >
        {live && <span className="pulse-dot" style={{ width: 5, height: 5, background: "var(--amber)", display: "inline-block" }} />}
        {badge}
      </span>
      <h4 style={{ margin: "6px 0 0", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 19 }}>{title}</h4>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0, flex: 1 }}>{desc}</p>
    </div>
  );
}

function RoadmapRow({ label, done, status, last }: { label: string; done: boolean; status?: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 4px", borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <span>
        <span style={{ color: done ? "var(--amber)" : "var(--text-faint)" }}>{done ? "[x]" : "[ ]"}</span> {label}
      </span>
      <span style={{ color: done ? "var(--amber)" : "var(--text-faint)", fontSize: 11 }}>{status ?? "PLANNED"}</span>
    </div>
  );
}
