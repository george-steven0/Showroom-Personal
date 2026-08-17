-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN "phone2" TEXT;

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "systemName" TEXT NOT NULL,
    "systemNameAr" TEXT NOT NULL,
    "logo" TEXT,
    "updatedAt" DATETIME,
    "updatedBy" TEXT,
    "updatedByName" TEXT
);
