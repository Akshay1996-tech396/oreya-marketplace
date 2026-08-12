-- AlterTable
ALTER TABLE "restaurant_menu_items" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
