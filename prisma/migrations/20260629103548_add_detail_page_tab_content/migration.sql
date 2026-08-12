-- AlterTable
ALTER TABLE "products" ADD COLUMN     "aboutBrand" TEXT,
ADD COLUMN     "brandImage" TEXT,
ADD COLUMN     "exchangePolicy" TEXT,
ADD COLUMN     "refundPolicy" TEXT,
ADD COLUMN     "specifications" JSONB;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "aboutBrand" TEXT,
ADD COLUMN     "brandImage" TEXT,
ADD COLUMN     "exchangePolicy" TEXT,
ADD COLUMN     "refundPolicy" TEXT,
ADD COLUMN     "specifications" JSONB;
