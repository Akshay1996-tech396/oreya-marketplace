/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "branchName" TEXT,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "licenseExpiry" TIMESTAMP(3),
ADD COLUMN     "licenseFile" TEXT,
ADD COLUMN     "mobileCountryCode" TEXT,
ADD COLUMN     "residentialCountryCode" TEXT,
ADD COLUMN     "residentialPhone" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
