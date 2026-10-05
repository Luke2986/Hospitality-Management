ALTER TABLE "bookings" ADD COLUMN "anonymized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_controller_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_controller_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_contact_email" text;