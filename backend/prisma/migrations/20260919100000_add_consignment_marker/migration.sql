-- أمانة (consignment) marker on stock lines and inventory items
ALTER TABLE "purchase_bill_lines" ADD COLUMN "isConsignment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_items" ADD COLUMN "isConsignment" BOOLEAN NOT NULL DEFAULT false;
