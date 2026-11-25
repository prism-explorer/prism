-- AlterTable: an undecodable source account is stored as NULL, not ''
ALTER TABLE "Invocation" ALTER COLUMN "sourceAccount" DROP NOT NULL;
