ALTER TABLE "recipes" ADD COLUMN "normalized_ingredients" jsonb;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "normalized_at" timestamp with time zone;