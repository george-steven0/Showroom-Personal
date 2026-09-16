-- Rename customerSellPrice to agreedPrice (preserves existing data) and add the optional trimLevel column
ALTER TABLE "inventory_items" RENAME COLUMN "customerSellPrice" TO "agreedPrice";
ALTER TABLE "inventory_items" ADD COLUMN "trimLevel" TEXT;
