ALTER TABLE "recipes" ADD COLUMN "source_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD COLUMN "recipe_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD COLUMN "package_label" text;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD COLUMN "generation_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD COLUMN "generation_error" text;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD COLUMN "organize_mode" text DEFAULT 'grouped' NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD COLUMN "aisle_order" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_source_plan_id_meal_plans_id_fk" FOREIGN KEY ("source_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipes_source_plan_id_idx" ON "recipes" USING btree ("source_plan_id");