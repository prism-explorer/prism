# Prism

> Open-source block explorer with full Soroban smart contract support for the Stellar network.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Built for Stellar](https://img.shields.io/badge/Built%20for-Stellar-black)](https://stellar.org)

Prism is a Soroban-native block explorer for the Stellar network. While existing explorers like stellar.expert cover classic Stellar operations, they have limited or no support for Soroban-specific data — contract storage, invocation history, emitted events, and WASM bytecode. Prism exposes all of this in a clean, fast, open-source interface.

---

## Table of Contents

- [Why Prism](#why-prism)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Self-Hosting](#self-hosting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

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
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
┌────────▼──────┐   ┌─────────▼────────┐
│ Stellar Horizon│   │  Soroban RPC     │
│ (classic ops) │   │  (contract data) │
└───────────────┘   └──────────────────┘
```

---

## Project Structure

```
prism/
├── package.json
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Home / ledger overview
│   │   ├── contract/
│   │   │   └── [id]/page.tsx # Contract detail page
│   │   ├── tx/
│   │   │   └── [hash]/page.tsx
│   │   └── ledger/
│   │       └── [seq]/page.tsx
│   ├── components/           # Reusable UI components
│   ├── lib/
│   │   ├── horizon.ts        # Horizon API client
│   │   └── soroban.ts        # Soroban RPC client
│   └── types/                # TypeScript types
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Access to a Stellar Horizon endpoint and Soroban RPC endpoint (public endpoints available)

### Install & Run Locally

```bash
git clone https://github.com/your-org/prism.git
cd prism
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Configuration

Create a `.env.local` file:

```env
# Stellar network: "testnet" or "mainnet"
NEXT_PUBLIC_NETWORK=testnet

# Horizon endpoint
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org

# Soroban RPC endpoint
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

Public RPC endpoints are available from the [Stellar Developer Docs](https://developers.stellar.org/docs/data/rpc).

---

## Self-Hosting

Prism is designed to be easy to self-host. A single `docker-compose.yml` is planned for the v0.2 release. For now:

```bash
npm run build
npm run start
```

Or deploy to Vercel with one click (environment variables required).

---

## Roadmap

- [ ] Ledger overview and real-time streaming
- [ ] Transaction explorer with Soroban decoding
- [ ] Contract storage inspector
- [ ] Contract invocation history and event log
- [ ] In-browser contract invocation tool
- [ ] XDR decoder
- [ ] Docker Compose for self-hosting
- [ ] Mainnet deployment at prism.network

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get started. Frontend, RPC integration, and indexer contributions are all needed.

## License

MIT — see [LICENSE](./LICENSE).
