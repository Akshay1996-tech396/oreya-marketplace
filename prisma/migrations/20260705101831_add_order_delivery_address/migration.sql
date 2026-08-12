-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryAddressLine1" TEXT,
ADD COLUMN     "deliveryAddressLine2" TEXT,
ADD COLUMN     "deliveryArea" TEXT,
ADD COLUMN     "deliveryCity" TEXT,
ADD COLUMN     "deliveryCountry" TEXT,
ADD COLUMN     "deliveryEmail" TEXT,
ADD COLUMN     "deliveryFullName" TEXT,
ADD COLUMN     "deliveryLatitude" DECIMAL(10,7),
ADD COLUMN     "deliveryLongitude" DECIMAL(10,7),
ADD COLUMN     "deliveryNote" TEXT,
ADD COLUMN     "deliveryPhone" TEXT,
ADD COLUMN     "deliveryState" TEXT,
ADD COLUMN     "deliveryZipCode" TEXT;

-- CreateIndex
CREATE INDEX "orders_deliveryCity_idx" ON "orders"("deliveryCity");

-- CreateIndex
CREATE INDEX "orders_deliveryArea_idx" ON "orders"("deliveryArea");
