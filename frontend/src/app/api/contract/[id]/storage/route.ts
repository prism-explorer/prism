import { NextResponse } from "next/server";
import {
  getContractWasmInfo,
  lookupStorageEntry,
  parseStorageKeyInput,
  SIMPLE_STORAGE_KEY_KINDS,
} from "@/lib/soroban";
import { rateLimitRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function GET(req: Request, { params }: Params) {
  const limited = rateLimitRequest(req, { scope: "contract-storage" });
  if (limited) return limited;

  const searchParams = new URL(req.url).searchParams;
  const key = searchParams.get("key");
  const kind = searchParams.get("kind");
  const durability = searchParams.get("durability") === "temporary" ? "temporary" : "persistent";

  if (!key) {
    return NextResponse.json({ error: "Missing required query param: key" }, { status: 400 });
  }
  // Any Soroban spec type string is accepted, just as in the invoke tool —
  // the four simple kinds are only UI presets, not a hard API restriction.
  if (!kind) {
    return NextResponse.json({ error: "Missing required query param: kind" }, { status: 400 });
  }

  try {
    // A contract-defined key such as DataKey::Note needs the contract's own
    // type definitions to be coerced. Fetch them from the WASM (cached, and
    // skipped for the four simple kinds so those lookups stay cheap).
    const needsTypes = !(SIMPLE_STORAGE_KEY_KINDS as readonly string[]).includes(kind);
    const wasm = needsTypes ? await getContractWasmInfo(params.id) : null;
    const scKey = parseStorageKeyInput(key, kind, wasm?.types ?? []);
    const entry = await lookupStorageEntry(params.id, scKey, durability);
    if (!entry) {
      return NextResponse.json({ error: "No entry found for that key" }, { status: 404 });
    }
    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid key" }, { status: 400 });
  }
}
