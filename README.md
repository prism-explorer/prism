# Prism

Prism is a Soroban-native block explorer for the Stellar network. While existing explorers like stellar.expert cover classic Stellar operations, they have limited or no support for Soroban-specific data contract storage, invocation history, emitted events, and WASM bytecode. Prism exposes all of this in a clean, fast, open-source interface.

---

## Why Prism

The Stellar Development Foundation identified explorer support for Soroban as a critical missing piece of infrastructure:

> *"Soroban needs explorers that can retrieve data about smart contracts."*

When a developer deploys a Soroban contract, they need to inspect its storage state, trace invocation history, debug failed transactions, and monitor emitted events. None of this is possible with current explorers. Prism is built to fill that gap as a community-owned, open-source tool.

---

## Features

### Contract Explorer
- View deployed contract WASM bytecode and metadata
- Inspect live contract storage (persistent, temporary, and instance storage)
- Browse full invocation history with inputs and outputs
- View all emitted contract events with filtering

### Transaction Explorer
- Detailed transaction breakdown with Soroban-specific operation decoding
- Transaction simulation and dry-run from the UI
- Fee and resource usage breakdown (CPU instructions, memory, ledger reads/writes)
- Failed transaction debugging with error messages

### Ledger & Network
- Real-time ledger streaming
- Network statistics (TPS, ledger close time, active contracts)
- Search by transaction hash, contract ID, account address, or ledger sequence

### Developer Tools
- In-browser contract invocation (call any contract function directly from Prism)
- ABI/interface display for verified contracts
- XDR decoder for raw transaction data

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Next.js)                 │
│   Contract View  │  Tx Explorer  │  Dev Tools       │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                  Prism API (Next.js API routes)      │
└──────────────────┬───────────────────┬──────────────┘
                   │                   │
         ┌─────────┴──────────┐        │ (optional)
         │                    │        │
┌────────▼──────┐   ┌─────────▼────────┐  ┌──▼──────────────┐
│ Stellar Horizon│   │  Soroban RPC     │  │  Postgres        │
│ (classic ops) │   │  (contract data) │  │  (indexed data)  │
└───────────────┘   └────────┬─────────┘  └──▲──────────────┘
                              │                │
                    ┌─────────▼────────────────┴──┐
                    │  indexer/ (forward-only)     │
                    │  polls Soroban RPC, persists │
                    │  storage/invocations/events  │
                    └───────────────────────────────┘
```

The frontend works standalone against public RPC/Horizon endpoints — no database required. That gets you live chain state but is bounded by the RPC node's retention window (~24h) for events/history, and there's no way to enumerate a contract's storage keys via RPC at all (no such method exists). Running the optional `indexer/` service alongside it removes both limits for data observed since the indexer started: full invocation/event history and genuine storage-key enumeration, not just point lookups. It's forward-only by design — no historical backfill from before it started running.

---

## Self-Hosting

Standalone (frontend only, no database):

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Full stack, including the indexer for full storage enumeration and unbounded history:

```bash
docker compose up
```

This runs Postgres, the indexer (`indexer/`), and the frontend together — see [Architecture](#architecture) above for what running the indexer actually buys you.

---

## Roadmap

- [x] Ledger overview and real-time streaming
- [x] Transaction explorer with Soroban decoding
- [x] Contract storage inspector
- [x] Contract invocation history and event log
- [x] In-browser contract invocation tool
- [x] XDR decoder
- [x] Docker Compose for self-hosting
- [x] Optional indexer for full storage enumeration and unbounded history
- [ ] Mainnet deployment at prism.network

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get started. Frontend, RPC integration, and indexer contributions are all needed.

## License

MIT — see [LICENSE](./LICENSE).
