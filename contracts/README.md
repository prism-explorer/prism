# Prism Contracts

Soroban contracts that exist to give the explorer something real to look at.

Prism renders instance/persistent/temporary storage, invocation history, event
logs, a parsed ABI, and errors from failed calls. Checking that any of it is
right against mainnet contracts is awkward: you have to find a contract that
happens to use the feature you're testing, wait for it to be called, and hope it
fails when you need to see a failure. `showcase/` removes that problem — it
uses every one of those features on purpose, and fails on demand.

## Contracts

| Crate | What it's for |
| --- | --- |
| [`showcase`](./showcase) | Touches all three storage durabilities, publishes five typed events, exposes every ScVal shape the ABI parser has to render, and has a `boom()` that always errors. |

### What `showcase` exercises

- **Instance storage** — `admin` and a `counter`, which ride along with the
  contract instance entry and so are visible without an indexer.
- **Persistent storage** — notes keyed by `DataKey::Note(Symbol)`. The key space
  is unbounded and Soroban RPC has no method to enumerate it, which is exactly
  the case the optional indexer exists to cover.
- **Temporary storage** — session markers that expire on their own, the one
  durability where an entry vanishes without anyone deleting it.
- **Events** — declared with `#[contractevent]`, so topics and field names land
  in the contract spec. `NoteWritten` carries two indexed topics; `Bumped`
  carries none.
- **ABI surface** — `u32`, `i128`, `Symbol`, `String`, `Address`, `Bytes`,
  `Vec<T>`, `Map<K, V>`, `Option<T>`, struct returns, and an enum with
  parameterised variants.
- **Failure** — `boom()` returns `Error::Deliberate` every time; `put_note`
  rejects an oversized body; most reads fail cleanly before `init`.

## Working on them

```bash
cd contracts
cargo test                                   # 20 unit tests, no network needed
cargo fmt --all -- --check                   # CI enforces this
cargo clippy --all-targets -- -D warnings    # and this
stellar contract build                       # wasm for every crate in the workspace
```

`rust-toolchain.toml` pins the channel and pulls in the `wasm32v1-none` target
plus rustfmt and clippy, so a fresh checkout gets the same toolchain CI uses.

Running the tests writes ledger snapshots to `showcase/test_snapshots/`. They're
committed on purpose: a diff there means a change altered the state a call
produces, which is worth seeing in review.

## Deploying to testnet

```bash
stellar keys generate --global alice --network testnet --fund
stellar contract build

stellar contract deploy \
  --wasm target/wasm32v1-none/release/prism_showcase.wasm \
  --source alice --network testnet
# → prints the contract ID

stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- init --admin $(stellar keys address alice)
```

Then give the contract some history to show, and open it in Prism at
`/contract/<CONTRACT_ID>`:

```bash
# instance storage + an event with no indexed topics
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- bump --by 7

# persistent storage + an event with two indexed topics
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- put_note --author $(stellar keys address alice) --name hello --body "first revision"

# temporary storage that expires on its own
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- start_session --who $(stellar keys address alice) --ledgers 200

# a failed invocation, for the error rendering
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- boom
```
