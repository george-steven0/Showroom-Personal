-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_purchase_bill_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseBillId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "supplierId" TEXT NOT NULL,
    "chassisNumber" TEXT NOT NULL,
    "motorNumber" TEXT NOT NULL,
    "modelYear" INTEGER,
    "price" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_stock',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_bill_lines_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "purchase_bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_bill_lines_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchase_bill_lines" ("chassisNumber", "createdAt", "description", "id", "itemName", "modelYear", "motorNumber", "notes", "paidAmount", "price", "purchaseBillId", "status", "supplierId") SELECT "chassisNumber", "createdAt", "description", "id", "itemName", "modelYear", "motorNumber", "notes", "paidAmount", "price", "purchaseBillId", "status", "supplierId" FROM "purchase_bill_lines";
DROP TABLE "purchase_bill_lines";
ALTER TABLE "new_purchase_bill_lines" RENAME TO "purchase_bill_lines";
CREATE INDEX "purchase_bill_lines_purchaseBillId_idx" ON "purchase_bill_lines"("purchaseBillId");
CREATE INDEX "purchase_bill_lines_supplierId_idx" ON "purchase_bill_lines"("supplierId");
CREATE INDEX "purchase_bill_lines_status_idx" ON "purchase_bill_lines"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
