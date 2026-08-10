import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";
import { getNetworkPulse, type NetworkPulse } from "@/lib/horizon";
import { getRecentNetworkActivity } from "@/lib/soroban";
import { shortHash, formatNumber } from "@/lib/format";
import type { NetworkActivityItem } from "@/lib/soroban";

export const dynamic = "force-dynamic";

const GITHUB_URL = "https://github.com/prism-explorer/prism";
const CONTRIBUTING_URL = `${GITHUB_URL}/blob/main/CONTRIBUTING.md`;

const mono: React.CSSProperties = { fontFamily: "var(--font-jetbrains-mono), monospace" };
const sectionLabel: React.CSSProperties = {
  ...mono,
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--text-faint)",
  marginBottom: 36,
};

export default async function LandingPage() {
  let pulse: NetworkPulse | null = null;
  let activity: NetworkActivityItem[] = [];
  try {
    [pulse, activity] = await Promise.all([getNetworkPulse(), getRecentNetworkActivity(5)]);
  } catch {
    // Network unavailable at build/runtime — render without the live stats.
  }

  return (
    <div className="landing">
      <AutoRefresh intervalMs={8000} />
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
        {pulse ? (
          <>
            <span>LEDGER {formatNumber(pulse.sequence)}</span>
            <span style={{ color: "var(--text-faint)" }}>|</span>
            <span>TPS {pulse.transactionsPerSecond.toFixed(1)}</span>
            <span style={{ color: "var(--text-faint)" }}>|</span>
            <span>CLOSE {pulse.closeTimeSeconds.toFixed(1)}s</span>
            <span style={{ color: "var(--text-faint)" }}>|</span>
            <span>OPERATIONS {formatNumber(pulse.operationCount)}</span>
          </>
        ) : (
          <span>connecting to Stellar network…</span>
        )}
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
          <h1 style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700, fontSize: 68, lineHeight: 1.03, letterSpacing: "-0.02em", margin: "0 0 26px" }}>
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
            <span style={{ color: "var(--text-faint)", letterSpacing: "0.04em" }}>recent_contract_events.log</span>
          </div>
          <div style={{ padding: "16px 20px 20px", display: "grid", gap: 10 }}>
            {activity.length > 0 ? (
              activity.map((item) => (
                <div key={item.txHash + item.topic} className="log-row" style={{ gridTemplateColumns: "56px 90px 1fr" }}>
                  <span style={{ color: "var(--text-faint)" }}>#{item.ledger}</span>
                  <span style={{ color: "var(--amber)" }}>{item.topic}</span>
                  <span style={{ color: "var(--text-dim)", textAlign: "right" }}>{shortHash(item.contractId, 6)}</span>
                </div>
              ))
            ) : (
              <span style={{ color: "var(--text-faint)" }}>connecting to Soroban RPC…</span>
            )}
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
          <FeatureCard badge="Live now" live title="Transaction Explorer" desc="Soroban-aware decoding and resource/fee breakdowns for any transaction." />
          <FeatureCard badge="Live now" live title="Ledger & Network" desc="Auto-refreshing ledger overview, network pulse stats, and unified search." />
          <FeatureCard badge="Live now" live title="Developer Tools" desc="In-browser contract invocation (simulate), ABI display and an XDR decoder." />
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
          <RoadmapRow label="Ledger overview and auto-refreshing updates" done status="LIVE" />
          <RoadmapRow label="Transaction explorer with Soroban decoding" done status="LIVE" />
          <RoadmapRow label="Contract storage inspector" done status="LIVE" />
          <RoadmapRow label="Contract invocation history and event log" done status="LIVE" />
          <RoadmapRow label="In-browser contract invocation tool (simulate)" done status="LIVE" />
          <RoadmapRow label="XDR decoder" done status="LIVE" />
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
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700, fontSize: 54, lineHeight: 1.06, margin: "0 0 30px", maxWidth: "16ch", color: "var(--amber)", textShadow: "0 0 40px rgba(255,176,32,0.35)" }}
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
      <h4 style={{ margin: "6px 0 0", fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700, fontSize: 19 }}>{title}</h4>
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
