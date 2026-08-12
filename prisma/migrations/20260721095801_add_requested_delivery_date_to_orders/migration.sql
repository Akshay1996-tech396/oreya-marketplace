-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryLeadTimeHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "requestedDeliveryDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "orders_requestedDeliveryDate_idx" ON "orders"("requestedDeliveryDate");
