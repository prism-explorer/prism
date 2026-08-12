-- CreateTable
CREATE TABLE "IndexerCursor" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastLedger" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexerCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invocation" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "ledger" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "contractId" TEXT NOT NULL,
    "functionName" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "sourceAccount" TEXT NOT NULL,

    CONSTRAINT "Invocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageChange" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "durability" TEXT NOT NULL,
    "keyDisplay" TEXT NOT NULL,
    "valueDisplay" TEXT,
    "changeType" TEXT NOT NULL,
    "ledger" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEventRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "topic" JSONB NOT NULL,
    "value" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "ledger" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractEventRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invocation_contractId_ledger_idx" ON "Invocation"("contractId", "ledger");

-- CreateIndex
CREATE UNIQUE INDEX "Invocation_txHash_key" ON "Invocation"("txHash");

-- CreateIndex
CREATE INDEX "StorageChange_contractId_keyDisplay_durability_ledger_idx" ON "StorageChange"("contractId", "keyDisplay", "durability", "ledger");

-- CreateIndex
CREATE INDEX "StorageChange_contractId_ledger_idx" ON "StorageChange"("contractId", "ledger");

-- CreateIndex
CREATE UNIQUE INDEX "StorageChange_txHash_contractId_keyDisplay_durability_chang_key" ON "StorageChange"("txHash", "contractId", "keyDisplay", "durability", "changeType");

-- CreateIndex
CREATE UNIQUE INDEX "ContractEventRecord_eventId_key" ON "ContractEventRecord"("eventId");

-- CreateIndex
CREATE INDEX "ContractEventRecord_contractId_ledger_idx" ON "ContractEventRecord"("contractId", "ledger");
