CREATE TABLE "ai_usage_daily" (
	"user_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"day" date NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_daily_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_daily_household_id_idx" ON "ai_usage_daily" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "household_members_user_id_unique" ON "household_members" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "household_member_access" ON "ai_usage_daily" AS PERMISSIVE FOR ALL TO public USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));
