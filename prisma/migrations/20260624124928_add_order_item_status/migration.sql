-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "vendorNote" TEXT;

-- CreateIndex
CREATE INDEX "order_items_status_idx" ON "order_items"("status");
