ALTER TABLE "meal_plan_slots" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD COLUMN "ingredient_preview" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD COLUMN "slot_tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD COLUMN "est_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD COLUMN "chips" jsonb DEFAULT '[]'::jsonb;