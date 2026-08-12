/*
  Warnings:

  - A unique constraint covering the columns `[serviceId,date,startTime,endTime]` on the table `appointment_slots` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "appointment_slots" DROP CONSTRAINT "appointment_slots_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_vendorId_fkey";

-- DropIndex
DROP INDEX "appointment_slots_vendorId_serviceId_date_startTime_endTime_key";

-- AlterTable
ALTER TABLE "appointment_slots" ALTER COLUMN "vendorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "vendorId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "appointment_slots_serviceId_date_startTime_endTime_key" ON "appointment_slots"("serviceId", "date", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
