import { NextResponse } from "next/server";
import { getInvocationHistory } from "@/lib/soroban";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function GET(req: Request, { params }: Params) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "20");
  const invocations = await getInvocationHistory(params.id, Number.isFinite(limit) ? limit : 20);
  return NextResponse.json({ invocations });
}
