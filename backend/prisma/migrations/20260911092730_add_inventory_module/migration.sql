-- CreateTable
CREATE TABLE "inventory_branches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "inventory_items" (
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

-- CreateIndex
CREATE UNIQUE INDEX "inventory_branches_name_key" ON "inventory_branches"("name");

-- CreateIndex
CREATE INDEX "inventory_items_branchId_idx" ON "inventory_items"("branchId");

-- CreateIndex
CREATE INDEX "inventory_items_status_idx" ON "inventory_items"("status");
