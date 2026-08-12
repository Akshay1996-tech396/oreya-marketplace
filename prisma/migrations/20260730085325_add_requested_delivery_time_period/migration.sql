-- CreateEnum
CREATE TYPE "DeliveryTimePeriod" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "requestedDeliveryTimePeriod" "DeliveryTimePeriod";

-- CreateIndex
CREATE INDEX "orders_requestedDeliveryTimePeriod_idx" ON "orders"("requestedDeliveryTimePeriod");
