ALTER TABLE "properties" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "archived_at" timestamp with time zone;