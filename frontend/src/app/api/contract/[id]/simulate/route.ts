import { NextResponse } from "next/server";
import { simulateInvocation } from "@/lib/soroban";
import { coerceArgInput } from "@/lib/xdr";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

interface SimulateBody {
  functionName?: string;
  args?: { value: string; type: string }[];
}

export async function POST(req: Request, { params }: Params) {
  const limited = rateLimit(req, { scope: "contract-simulate", max: 10 });
  if (limited) return limited;

  let body: SimulateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.functionName) {
    return NextResponse.json({ error: "Missing required field: functionName" }, { status: 400 });
  }

  try {
    const scArgs = (body.args ?? []).map((a) => coerceArgInput(a.value, a.type));
    const result = await simulateInvocation(params.id, body.functionName, scArgs);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Invalid arguments" },
      { status: 400 }
    );
  }
}
