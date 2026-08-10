import { NextResponse } from "next/server";
import { getContractEvents } from "@/lib/soroban";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function GET(req: Request, { params }: Params) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "50");
  const events = await getContractEvents(params.id, Number.isFinite(limit) ? limit : 50);
  return NextResponse.json({ events });
}
