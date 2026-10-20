-- CreateTable
CREATE TABLE "internal_account_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedAt" DATETIME,
    "updatedBy" TEXT,
    "updatedByName" TEXT
);

-- CreateIndex
CREATE INDEX "internal_account_entries_date_idx" ON "internal_account_entries"("date");

-- CreateIndex
CREATE INDEX "internal_account_entries_type_idx" ON "internal_account_entries"("type");
