import { NextResponse } from "next/server";
import { getContractInfo } from "@/lib/soroban";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const info = await getContractInfo(params.id);
  if (!info) {
    return NextResponse.json({ error: "Contract not found or unreachable" }, { status: 404 });
  }
  return NextResponse.json(info);
}
