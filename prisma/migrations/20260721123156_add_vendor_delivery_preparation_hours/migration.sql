-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "deliveryPreparationHours" INTEGER NOT NULL DEFAULT 24;

-- CreateIndex
CREATE INDEX "vendors_deliveryPreparationHours_idx" ON "vendors"("deliveryPreparationHours");
