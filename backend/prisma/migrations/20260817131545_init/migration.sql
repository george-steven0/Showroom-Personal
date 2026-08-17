-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedAt" DATETIME,
    "updatedBy" TEXT,
    "updatedByName" TEXT
);

-- CreateTable
CREATE TABLE "purchase_bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "subtotal" REAL NOT NULL,
    "total" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cancelledAt" DATETIME,
    "cancelledBy" TEXT,
    "cancelledByName" TEXT,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedAt" DATETIME,
    "updatedBy" TEXT,
    "updatedByName" TEXT
);

-- CreateTable
CREATE TABLE "purchase_bill_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseBillId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
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

-- CreateTable
CREATE TABLE "selling_bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "purchaseLineId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "buyingPrice" REAL NOT NULL,
    "buyingDate" DATETIME NOT NULL,
    "chassisNumber" TEXT NOT NULL,
    "motorNumber" TEXT NOT NULL,
    "modelYear" INTEGER,
    "sellingPrice" REAL NOT NULL,
    "sellingDate" DATETIME NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerAddress" TEXT,
    "buyerPhone" TEXT,
    "notes" TEXT,
    "profit" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cancelledAt" DATETIME,
    "cancelledBy" TEXT,
    "cancelledByName" TEXT,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedAt" DATETIME,
    "updatedBy" TEXT,
    "updatedByName" TEXT,
    CONSTRAINT "selling_bills_purchaseLineId_fkey" FOREIGN KEY ("purchaseLineId") REFERENCES "purchase_bill_lines" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedAt" DATETIME,
    "updatedBy" TEXT,
    "updatedByName" TEXT
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "itemName" TEXT,
    "counterpartyName" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_bills_number_key" ON "purchase_bills"("number");

-- CreateIndex
CREATE INDEX "purchase_bill_lines_purchaseBillId_idx" ON "purchase_bill_lines"("purchaseBillId");

-- CreateIndex
CREATE INDEX "purchase_bill_lines_supplierId_idx" ON "purchase_bill_lines"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_bill_lines_status_idx" ON "purchase_bill_lines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "selling_bills_number_key" ON "selling_bills"("number");

-- CreateIndex
CREATE INDEX "selling_bills_purchaseLineId_idx" ON "selling_bills"("purchaseLineId");

-- CreateIndex
CREATE INDEX "cash_transactions_date_idx" ON "cash_transactions"("date");

-- CreateIndex
CREATE INDEX "cash_transactions_referenceId_idx" ON "cash_transactions"("referenceId");

-- CreateIndex
CREATE INDEX "cash_transactions_type_idx" ON "cash_transactions"("type");
