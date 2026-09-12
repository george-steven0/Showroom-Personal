-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_inventory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carType" TEXT NOT NULL,
    "brand" TEXT,
    "chassisNumber" TEXT,
    "motorNumber" TEXT,
    "modelYear" INTEGER,
    "color" TEXT,
    "notes" TEXT,
    "branchId" TEXT NOT NULL,
    "buyPrice" REAL,
    "traderSellPrice" REAL NOT NULL,
    "customerSellPrice" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_stock',
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "buyerAddress" TEXT,
    "saleNotes" TEXT,
    "saleDate" DATETIME,
    "soldAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedAt" DATETIME,
    "updatedBy" TEXT,
    "updatedByName" TEXT,
    CONSTRAINT "inventory_items_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "inventory_branches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_inventory_items" ("branchId", "brand", "buyPrice", "buyerAddress", "buyerName", "buyerPhone", "carType", "chassisNumber", "color", "createdAt", "createdBy", "createdByName", "customerSellPrice", "id", "modelYear", "motorNumber", "notes", "saleDate", "saleNotes", "soldAt", "status", "traderSellPrice", "updatedAt", "updatedBy", "updatedByName") SELECT "branchId", "brand", "buyPrice", "buyerAddress", "buyerName", "buyerPhone", "carType", "chassisNumber", "color", "createdAt", "createdBy", "createdByName", "customerSellPrice", "id", "modelYear", "motorNumber", "notes", "saleDate", "saleNotes", "soldAt", "status", "traderSellPrice", "updatedAt", "updatedBy", "updatedByName" FROM "inventory_items";
DROP TABLE "inventory_items";
ALTER TABLE "new_inventory_items" RENAME TO "inventory_items";
CREATE INDEX "inventory_items_branchId_idx" ON "inventory_items"("branchId");
CREATE INDEX "inventory_items_status_idx" ON "inventory_items"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
