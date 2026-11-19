// Single source of truth for which Stellar network Prism is pointed at.
//
// These are NEXT_PUBLIC_* vars because they describe the deployment rather
// than a secret, but every current consumer is server-side, where Next reads
// them at runtime — so `docker compose up` can repoint a prebuilt image.

export type StellarNetwork = "testnet" | "mainnet" | "futurenet";

export const NETWORKS: StellarNetwork[] = ["testnet", "mainnet", "futurenet"];

/** Public endpoints for each network, used when an explicit URL isn't configured. */
const DEFAULT_ENDPOINTS: Record<StellarNetwork, { horizon: string; rpc: string }> = {
  testnet: {
    horizon: "https://horizon-testnet.stellar.org",
    rpc: "https://soroban-testnet.stellar.org",
  },
  mainnet: {
    horizon: "https://horizon.stellar.org",
    rpc: "https://mainnet.sorobanrpc.com",
  },
  futurenet: {
    horizon: "https://horizon-futurenet.stellar.org",
    rpc: "https://rpc-futurenet.stellar.org",
  },
};

export interface PrismConfig {
  network: StellarNetwork;
  horizonUrl: string;
  sorobanRpcUrl: string;
  siteUrl: string;
  /**
   * Trimmed NEXT_PUBLIC_NETWORK when it was set to something this build does
   * not recognize. Null when the variable is unset, blank, or a known name.
   * The explorer still falls back to testnet; this is only so the banner can
   * name the ignored value.
   */
  unrecognizedNetwork: string | null;
}

const NETWORK_ALIASES: Record<string, StellarNetwork> = {
  testnet: "testnet",
  mainnet: "mainnet",
  public: "mainnet",
  pubnet: "mainnet",
  futurenet: "futurenet",
};

/**
 * Coerce a raw NEXT_PUBLIC_NETWORK value to a known network, defaulting to
 * testnet. A typo such as "mainet" also falls back to testnet; configWarnings
 * reports that case so the fallback is not silent.
 */
export function parseNetwork(raw: string | undefined): StellarNetwork {
  const value = raw?.trim().toLowerCase();
  if (!value) return "testnet";
  return NETWORK_ALIASES[value] ?? "testnet";
}

/** The trimmed raw value when it is set but not a known network name. */
function unrecognizedNetworkValue(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (NETWORK_ALIASES[trimmed.toLowerCase()]) return null;
  return trimmed;
}

type EnvLike = Record<string, string | undefined>;

/**
 * Build the effective config from an environment.
 *
 * Endpoint defaults follow the selected network rather than being pinned to
 * testnet, so NEXT_PUBLIC_NETWORK=mainnet on its own gives a coherent
 * deployment instead of mainnet's passphrase over testnet's data.
 */
export function resolveConfig(env: EnvLike): PrismConfig {
  const network = parseNetwork(env.NEXT_PUBLIC_NETWORK);
  const defaults = DEFAULT_ENDPOINTS[network];
  return {
    network,
    horizonUrl: (env.NEXT_PUBLIC_HORIZON_URL || defaults.horizon).replace(/\/+$/, ""),
    sorobanRpcUrl: (env.NEXT_PUBLIC_SOROBAN_RPC_URL || defaults.rpc).replace(/\/+$/, ""),
    siteUrl: env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    unrecognizedNetwork: unrecognizedNetworkValue(env.NEXT_PUBLIC_NETWORK),
  };
}

/**
 * Guess which network an endpoint serves from its hostname. Returns null for
 * hosts that carry no hint — self-hosters run their own nodes on arbitrary
 * domains, and a wrong guess there is worse than no guess.
 */
export function detectNetworkFromUrl(url: string): StellarNetwork | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host.includes("futurenet")) return "futurenet";
  if (host.includes("testnet")) return "testnet";
  if (host.includes("mainnet") || host.includes("pubnet")) return "mainnet";
  if (host === "horizon.stellar.org") return "mainnet";
  return null;
}

/**
 * Detect configuration that would quietly point the explorer at the wrong
 * network. An endpoint mismatch is destructive: contract simulation is signed
 * with the configured network's passphrase while the data on screen comes
 * from whatever the endpoints actually serve, so every result looks plausible
 * and is wrong. An unrecognized NEXT_PUBLIC_NETWORK is the same kind of
 * mistake: the value is ignored and the explorer falls back to testnet, so
 * the banner names what was actually set.
 */
export function configWarnings(cfg: PrismConfig): string[] {
  const warnings: string[] = [];

  if (cfg.unrecognizedNetwork) {
    warnings.push(
      `NEXT_PUBLIC_NETWORK is set to "${cfg.unrecognizedNetwork}", which is not a known network. Falling back to ${cfg.network}.`
    );
  }

  const checks: [label: string, url: string][] = [
    ["Horizon", cfg.horizonUrl],
    ["Soroban RPC", cfg.sorobanRpcUrl],
  ];

  for (const [label, url] of checks) {
    const detected = detectNetworkFromUrl(url);
    if (detected && detected !== cfg.network) {
      warnings.push(
        `${label} endpoint (${url}) looks like ${detected}, but NEXT_PUBLIC_NETWORK is set to ${cfg.network}.`
      );
    }
  }

  return warnings;
}

export const config: PrismConfig = resolveConfig(process.env);
