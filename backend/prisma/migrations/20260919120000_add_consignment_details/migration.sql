-- Who took a consignment (أمانة) car, when, where, how much he's paid so far, and a note
ALTER TABLE "purchase_bill_lines" ADD COLUMN "consignmentTraderName" TEXT;
ALTER TABLE "purchase_bill_lines" ADD COLUMN "consignmentDate" DATETIME;
ALTER TABLE "purchase_bill_lines" ADD COLUMN "consignmentAddress" TEXT;
ALTER TABLE "purchase_bill_lines" ADD COLUMN "consignmentPaidAmount" REAL;
ALTER TABLE "purchase_bill_lines" ADD COLUMN "consignmentNotes" TEXT;

ALTER TABLE "inventory_items" ADD COLUMN "consignmentTraderName" TEXT;
ALTER TABLE "inventory_items" ADD COLUMN "consignmentDate" DATETIME;
ALTER TABLE "inventory_items" ADD COLUMN "consignmentAddress" TEXT;
ALTER TABLE "inventory_items" ADD COLUMN "consignmentPaidAmount" REAL;
ALTER TABLE "inventory_items" ADD COLUMN "consignmentNotes" TEXT;
