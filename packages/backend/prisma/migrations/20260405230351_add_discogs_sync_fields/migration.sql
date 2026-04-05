-- AlterTable
ALTER TABLE "items" ADD COLUMN     "discogs_listing_id" TEXT,
ADD COLUMN     "discogs_sync_error" TEXT,
ADD COLUMN     "discogs_sync_status" TEXT NOT NULL DEFAULT 'never',
ADD COLUMN     "discogs_synced_at" TIMESTAMP(3);
