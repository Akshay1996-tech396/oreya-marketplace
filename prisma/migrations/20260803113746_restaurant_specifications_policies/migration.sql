-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "exchangePolicy" TEXT,
ADD COLUMN     "refundPolicy" TEXT,
ADD COLUMN     "specifications" JSONB;
