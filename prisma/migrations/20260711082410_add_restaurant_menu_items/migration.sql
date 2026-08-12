-- AlterTable
ALTER TABLE "restaurant_reservations" ADD COLUMN     "menuItemCurrency" TEXT,
ADD COLUMN     "menuItemId" TEXT,
ADD COLUMN     "menuItemPrice" DECIMAL(10,2),
ADD COLUMN     "menuItemTitle" TEXT;

-- CreateTable
CREATE TABLE "restaurant_menu_items" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_menu_items_restaurantId_idx" ON "restaurant_menu_items"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_menu_items_isActive_idx" ON "restaurant_menu_items"("isActive");

-- CreateIndex
CREATE INDEX "restaurant_menu_items_sortOrder_idx" ON "restaurant_menu_items"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_menu_items_restaurantId_slug_key" ON "restaurant_menu_items"("restaurantId", "slug");

-- CreateIndex
CREATE INDEX "restaurant_reservations_menuItemId_idx" ON "restaurant_reservations"("menuItemId");

-- AddForeignKey
ALTER TABLE "restaurant_menu_items" ADD CONSTRAINT "restaurant_menu_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_reservations" ADD CONSTRAINT "restaurant_reservations_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "restaurant_menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
