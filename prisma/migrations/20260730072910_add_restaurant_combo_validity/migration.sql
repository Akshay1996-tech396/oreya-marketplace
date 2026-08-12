-- CreateEnum
CREATE TYPE "RestaurantMenuType" AS ENUM ('REGULAR', 'COMBO');

-- AlterTable
ALTER TABLE "restaurant_menu_items" ADD COLUMN     "menuType" "RestaurantMenuType" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "validFrom" DATE,
ADD COLUMN     "validUntil" DATE;

-- CreateIndex
CREATE INDEX "restaurant_menu_items_menuType_idx" ON "restaurant_menu_items"("menuType");

-- CreateIndex
CREATE INDEX "restaurant_menu_items_validUntil_idx" ON "restaurant_menu_items"("validUntil");
