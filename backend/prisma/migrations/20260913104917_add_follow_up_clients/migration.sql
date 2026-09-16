-- CreateTable
CREATE TABLE "follow_up_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "carType" TEXT NOT NULL,
    "carModel" TEXT,
    "modelYear" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "agreedPrice" REAL,
    "downPayment" REAL,
    "rating" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'following_up',
    "notes" TEXT,
    "nextFollowUpDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedAt" DATETIME,
    "updatedBy" TEXT,
    "updatedByName" TEXT
);

-- CreateIndex
CREATE INDEX "follow_up_clients_rating_idx" ON "follow_up_clients"("rating");

-- CreateIndex
CREATE INDEX "follow_up_clients_status_idx" ON "follow_up_clients"("status");

-- CreateIndex
CREATE INDEX "follow_up_clients_createdAt_idx" ON "follow_up_clients"("createdAt");
