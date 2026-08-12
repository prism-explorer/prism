import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function getCursor(startLedger: number): Promise<number> {
  const existing = await prisma.indexerCursor.findUnique({ where: { id: 1 } });
  if (existing) return existing.lastLedger;
  await prisma.indexerCursor.create({ data: { id: 1, lastLedger: startLedger } });
  return startLedger;
}

export async function setCursor(ledger: number): Promise<void> {
  await prisma.indexerCursor.upsert({
    where: { id: 1 },
    update: { lastLedger: ledger },
    create: { id: 1, lastLedger: ledger },
  });
}
