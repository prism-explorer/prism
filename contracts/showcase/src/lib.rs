#![no_std]
//! A Soroban contract whose job is to be *looked at*.
//!
//! Prism claims to show instance/persistent/temporary storage, invocation
//! history, emitted events, a parsed ABI, and useful errors for failed calls.
//! Verifying any of that against mainnet contracts is awkward — you need a
//! contract that happens to use the feature you're testing, and you can't make
//! it misbehave on demand.
//!
//! So this contract deliberately touches all three storage durabilities,
//! publishes events with multiple topics, exposes every ScVal shape the ABI
//! parser has to render (scalars, `Bytes`, `Vec`, `Map`, `Option`, structs and
//! enums), and offers a function that always fails. Deploy it to testnet and
//! every panel in the explorer has something real to display.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Bytes, Env, Map,
    String, Symbol, Vec,
};

/// Ledgers per day at the network's ~5s close time, used to express TTLs in
/// units humans can reason about.
const DAY_IN_LEDGERS: u32 = 17_280;

/// Bump persistent entries back up to 90 days whenever they're touched with
/// less than 30 days left.
const PERSISTENT_THRESHOLD: u32 = DAY_IN_LEDGERS * 30;
const PERSISTENT_EXTEND_TO: u32 = DAY_IN_LEDGERS * 90;

/// The longest note body accepted, in bytes. Small enough that the failure is
/// easy to trigger on purpose when testing Prism's error rendering.
const MAX_NOTE_LEN: u32 = 200;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NoteTooLong = 3,
    NoSuchNote = 4,
    Deliberate = 5,
}

/// Storage keys, spread across durabilities on purpose.
///
/// The unit variants live in instance storage, so they ride along with the
/// contract instance entry and Prism can show them without an indexer. The
/// parameterised variants are what make enumeration interesting: their key
/// space is unbounded, and Soroban RPC has no way to list them.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Instance: the address allowed to delete notes.
    Admin,
    /// Instance: a monotonically increasing call counter.
    Counter,
    /// Persistent: one entry per note name.
    Note(Symbol),
    /// Temporary: a per-address session marker that expires on its own.
    Session(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Note {
    pub author: Address,
    pub body: String,
    pub revision: u32,
}

/// A struct return value, so the ABI panel has a UDT to render rather than
/// only scalars.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Stats {
    pub counter: u32,
    pub admin: Address,
    pub contract: Address,
}

// Events are declared as types rather than published as loose tuples, which
// puts their topic lists and field names in the contract spec. That means an
// explorer can label an event's fields from the ABI instead of showing an
// anonymous list of ScVals — each struct's name becomes its leading topic, in
// snake case, and `#[topic]` fields follow it.

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Initialized {
    #[topic]
    pub admin: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bumped {
    pub counter: u32,
}

/// Two indexed topics plus data, the shape topic filtering is worth testing on.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NoteWritten {
    #[topic]
    pub name: Symbol,
    #[topic]
    pub author: Address,
    pub revision: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NoteDeleted {
    #[topic]
    pub name: Symbol,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SessionStarted {
    #[topic]
    pub who: Address,
    pub expires_at: u32,
}

#[contract]
pub struct Showcase;

#[contractimpl]
impl Showcase {
    /// Set the admin and zero the counter. Emits `Initialized`.
    pub fn init(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Counter, &0u32);
        Initialized {
            admin: admin.clone(),
        }
        .publish(&env);
        Ok(())
    }

    /// The configured admin, or `NotInitialized`.
    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Add to the instance counter and return the new value. Saturates rather
    /// than panicking, since the release profile enables overflow checks.
    pub fn bump(env: Env, by: u32) -> u32 {
        let current: u32 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        let next = current.saturating_add(by);
        env.storage().instance().set(&DataKey::Counter, &next);
        env.storage()
            .instance()
            .extend_ttl(PERSISTENT_THRESHOLD, PERSISTENT_EXTEND_TO);
        Bumped { counter: next }.publish(&env);
        next
    }

    /// Write a note to persistent storage under `name`, returning its new
    /// revision. Requires the author's authorization, so Prism's invocation
    /// view has an auth entry to decode.
    ///
    /// Emits `NoteWritten`, whose topics are the event name, the note name and
    /// the author — three topics, which is what makes topic filtering worth
    /// testing against something real.
    pub fn put_note(
        env: Env,
        author: Address,
        name: Symbol,
        body: String,
    ) -> Result<u32, Error> {
        author.require_auth();
        if body.len() > MAX_NOTE_LEN {
            return Err(Error::NoteTooLong);
        }

        let key = DataKey::Note(name.clone());
        let revision = match env.storage().persistent().get::<_, Note>(&key) {
            Some(existing) => existing.revision.saturating_add(1),
            None => 1,
        };

        env.storage().persistent().set(
            &key,
            &Note {
                author: author.clone(),
                body,
                revision,
            },
        );
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_EXTEND_TO);

        NoteWritten {
            name,
            author,
            revision,
        }
        .publish(&env);
        Ok(revision)
    }

    /// Read a note, extending its TTL as a side effect — which is why the
    /// contract page's `liveUntilLedgerSeq` moves when you call it.
    pub fn note(env: Env, name: Symbol) -> Result<Note, Error> {
        let key = DataKey::Note(name);
        let note = env
            .storage()
            .persistent()
            .get::<_, Note>(&key)
            .ok_or(Error::NoSuchNote)?;
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_EXTEND_TO);
        Ok(note)
    }

    /// Delete a note. Admin-only, and emits `NoteDeleted`.
    pub fn delete_note(env: Env, name: Symbol) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let key = DataKey::Note(name.clone());
        if !env.storage().persistent().has(&key) {
            return Err(Error::NoSuchNote);
        }
        env.storage().persistent().remove(&key);
        NoteDeleted { name }.publish(&env);
        Ok(())
    }

    /// Record a session marker in temporary storage that expires after
    /// `ledgers` (clamped to at least one). Temporary entries are the only
    /// durability that disappears without anyone deleting it, which is worth
    /// being able to watch happen.
    pub fn start_session(env: Env, who: Address, ledgers: u32) {
        let key = DataKey::Session(who.clone());
        let expires_at = env.ledger().sequence().saturating_add(ledgers.max(1));
        env.storage().temporary().set(&key, &expires_at);
        env.storage()
            .temporary()
            .extend_ttl(&key, ledgers.max(1), ledgers.max(1));
        SessionStarted { who, expires_at }.publish(&env);
    }

    /// The ledger a session expires at, or `None` — an `Option` return, so the
    /// ABI panel has one to render.
    pub fn session(env: Env, who: Address) -> Option<u32> {
        env.storage().temporary().get(&DataKey::Session(who))
    }

    /// Revisions for the named notes, skipping ones that don't exist. Takes a
    /// `Vec` and returns a `Map`, the two compound ScVals most likely to break
    /// a decoder.
    pub fn revisions(env: Env, names: Vec<Symbol>) -> Map<Symbol, u32> {
        let mut out = Map::new(&env);
        for name in names.iter() {
            if let Some(note) = env
                .storage()
                .persistent()
                .get::<_, Note>(&DataKey::Note(name.clone()))
            {
                out.set(name, note.revision);
            }
        }
        out
    }

    /// Sum a list of `i128`s. Exercises the widest integer type Soroban has,
    /// which is where JavaScript decoders usually lose precision.
    pub fn tally(amounts: Vec<i128>) -> i128 {
        let mut total: i128 = 0;
        for amount in amounts.iter() {
            total = total.saturating_add(amount);
        }
        total
    }

    /// XOR every byte of `blob`. Exists so the ABI has a `Bytes` parameter.
    pub fn checksum(blob: Bytes) -> u32 {
        let mut acc: u32 = 0;
        for byte in blob.iter() {
            acc ^= byte as u32;
        }
        acc
    }

    /// Counter, admin and the contract's own address in one struct.
    pub fn stats(env: Env) -> Result<Stats, Error> {
        Ok(Stats {
            counter: env.storage().instance().get(&DataKey::Counter).unwrap_or(0),
            admin: env
                .storage()
                .instance()
                .get(&DataKey::Admin)
                .ok_or(Error::NotInitialized)?,
            contract: env.current_contract_address(),
        })
    }

    /// Always fails, on purpose: a reliable way to see how Prism renders a
    /// failed invocation and its error code.
    pub fn boom() -> Result<(), Error> {
        Err(Error::Deliberate)
    }
}
