-- AlterTable
ALTER TABLE "items" ADD COLUMN "shopify_product_id" TEXT;
ALTER TABLE "items" ADD COLUMN "shopify_variant_id" TEXT;
ALTER TABLE "items" ADD COLUMN "shopify_sync_status" TEXT NOT NULL DEFAULT 'never';
ALTER TABLE "items" ADD COLUMN "shopify_sync_error" TEXT;
ALTER TABLE "items" ADD COLUMN "shopify_synced_at" TIMESTAMP(3);
