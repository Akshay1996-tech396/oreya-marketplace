/*
  Warnings:

  - The values [PREPARING,READY,OUT_FOR_DELIVERY] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `menuItemId` on the `cart_items` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `cart_items` table. All the data in the column will be lost.
  - You are about to drop the column `menuItemId` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `restaurant_tables` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryFee` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryRadiusKm` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDeliveryMinutes` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `foodTypes` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `isDeliveryAvailable` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `isPickupAvailable` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `minOrderAmount` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `menuItemId` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the `restaurant_menu_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `restaurant_menu_items` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[bookingId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurantReservationId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reservationCode]` on the table `restaurant_reservations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurantId,tableId,reservationDate,startTime]` on the table `restaurant_reservations` will be added. If there are existing duplicate values, this will fail.
  - The required column `reservationCode` was added to the `restaurant_reservations` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Made the column `endTime` on table `restaurant_reservations` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RestaurantTableStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RestaurantReservationSource" AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'RESTAURANT_RESERVATION_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'RESTAURANT_RESERVATION_NO_SHOW';

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'REFUNDED');
ALTER TABLE "public"."order_items" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TABLE "order_items" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "order_items" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "restaurant_menu_categories" DROP CONSTRAINT "restaurant_menu_categories_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "restaurant_menu_items" DROP CONSTRAINT "restaurant_menu_items_menuCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "restaurant_menu_items" DROP CONSTRAINT "restaurant_menu_items_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "restaurant_reservations" DROP CONSTRAINT "restaurant_reservations_customerId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_menuItemId_fkey";

-- DropIndex
DROP INDEX "cart_items_menuItemId_idx";

-- DropIndex
DROP INDEX "cart_items_restaurantId_idx";

-- DropIndex
DROP INDEX "order_items_menuItemId_idx";

-- DropIndex
DROP INDEX "order_items_restaurantId_idx";

-- DropIndex
DROP INDEX "restaurant_tables_isActive_idx";

-- DropIndex
DROP INDEX "reviews_menuItemId_idx";

-- AlterTable
ALTER TABLE "cart_items" DROP COLUMN "menuItemId",
DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "menuItemId",
DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "restaurantReservationId" TEXT;

-- AlterTable
ALTER TABLE "restaurant_operating_hours" ADD COLUMN     "lastReservationTime" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "slotMinutes" INTEGER;

-- AlterTable
ALTER TABLE "restaurant_reservations" ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "noShowAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reservationCode" TEXT NOT NULL,
ADD COLUMN     "slotMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "source" "RestaurantReservationSource" NOT NULL DEFAULT 'CUSTOMER',
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "reservationDate" SET DATA TYPE DATE,
ALTER COLUMN "endTime" SET NOT NULL;

-- AlterTable
ALTER TABLE "restaurant_tables" DROP COLUMN "isActive",
ADD COLUMN     "isReservable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "seatingArea" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "RestaurantTableStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "restaurants" DROP COLUMN "deliveryFee",
DROP COLUMN "deliveryRadiusKm",
DROP COLUMN "estimatedDeliveryMinutes",
DROP COLUMN "foodTypes",
DROP COLUMN "isDeliveryAvailable",
DROP COLUMN "isPickupAvailable",
DROP COLUMN "minOrderAmount",
ADD COLUMN     "allowGuestReservation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowSameDayReservation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reservationAdvanceDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "reservationAutoConfirm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reservationBufferMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reservationCancellationNote" TEXT,
ADD COLUMN     "reservationMaxGuests" INTEGER,
ADD COLUMN     "reservationMinGuests" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "reservationNoticeMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "reservationSlotMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "reservationTerms" TEXT,
ALTER COLUMN "isTableReservationAvailable" SET DEFAULT true;

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "menuItemId";

-- DropTable
DROP TABLE "restaurant_menu_categories";

-- DropTable
DROP TABLE "restaurant_menu_items";

-- DropEnum
DROP TYPE "FoodType";

-- DropEnum
DROP TYPE "MenuItemStatus";

-- CreateTable
CREATE TABLE "restaurant_special_hours" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_special_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_blocked_slots" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_special_hours_restaurantId_idx" ON "restaurant_special_hours"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_special_hours_date_idx" ON "restaurant_special_hours"("date");

-- CreateIndex
CREATE INDEX "restaurant_special_hours_isClosed_idx" ON "restaurant_special_hours"("isClosed");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_special_hours_restaurantId_date_key" ON "restaurant_special_hours"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "restaurant_blocked_slots_restaurantId_idx" ON "restaurant_blocked_slots"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_blocked_slots_tableId_idx" ON "restaurant_blocked_slots"("tableId");

-- CreateIndex
CREATE INDEX "restaurant_blocked_slots_date_idx" ON "restaurant_blocked_slots"("date");

-- CreateIndex
CREATE INDEX "restaurant_blocked_slots_startTime_idx" ON "restaurant_blocked_slots"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bookingId_key" ON "payments"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_restaurantReservationId_key" ON "payments"("restaurantReservationId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_restaurantReservationId_idx" ON "payments"("restaurantReservationId");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_reservations_reservationCode_key" ON "restaurant_reservations"("reservationCode");

-- CreateIndex
CREATE INDEX "restaurant_reservations_paymentStatus_idx" ON "restaurant_reservations"("paymentStatus");

-- CreateIndex
CREATE INDEX "restaurant_reservations_startTime_idx" ON "restaurant_reservations"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_reservations_restaurantId_tableId_reservationDat_key" ON "restaurant_reservations"("restaurantId", "tableId", "reservationDate", "startTime");

-- CreateIndex
CREATE INDEX "restaurant_tables_capacity_idx" ON "restaurant_tables"("capacity");

-- CreateIndex
CREATE INDEX "restaurant_tables_status_idx" ON "restaurant_tables"("status");

-- CreateIndex
CREATE INDEX "restaurant_tables_isReservable_idx" ON "restaurant_tables"("isReservable");

-- CreateIndex
CREATE INDEX "restaurants_isTableReservationAvailable_idx" ON "restaurants"("isTableReservationAvailable");

-- AddForeignKey
ALTER TABLE "restaurant_special_hours" ADD CONSTRAINT "restaurant_special_hours_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_blocked_slots" ADD CONSTRAINT "restaurant_blocked_slots_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_blocked_slots" ADD CONSTRAINT "restaurant_blocked_slots_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_reservations" ADD CONSTRAINT "restaurant_reservations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_restaurantReservationId_fkey" FOREIGN KEY ("restaurantReservationId") REFERENCES "restaurant_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
