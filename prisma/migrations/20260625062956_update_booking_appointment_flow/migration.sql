/*
  Warnings:

  - A unique constraint covering the columns `[vendorId,serviceId,date,startTime,endTime]` on the table `appointment_slots` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `endTime` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "appointment_slots" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "customerNote" TEXT,
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "endTime" TEXT NOT NULL,
ADD COLUMN     "startTime" TEXT NOT NULL,
ADD COLUMN     "vendorNote" TEXT;

-- CreateIndex
CREATE INDEX "appointment_slots_isActive_idx" ON "appointment_slots"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_slots_vendorId_serviceId_date_startTime_endTime_key" ON "appointment_slots"("vendorId", "serviceId", "date", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "bookings_bookingDate_idx" ON "bookings"("bookingDate");
