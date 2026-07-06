-- RLS baseline: captures the row-level security that was applied manually to the
-- live database in Session 10, so every environment built from this migration
-- chain gets identical protection. Idempotent (safe against the live DB).
--
-- Architecture note: the app's Drizzle connection runs as a BYPASSRLS role and
-- enforces household scoping in code (tRPC protectedProcedure -> ctx.householdId
-- on every query). These policies protect the OTHER path to the data: direct
-- PostgREST / supabase-js access with the publishable anon key. FORCE ROW LEVEL
-- SECURITY is deliberately absent — it has no effect on a BYPASSRLS role.
--
-- Hardening over the hand-applied version: is_household_member() pins
-- search_path (SECURITY DEFINER functions without it are hijackable via
-- schema shadowing).
CREATE OR REPLACE FUNCTION public.is_household_member(check_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = check_household_id
    AND user_id = auth.uid()
  );
$$;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "household_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "meal_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "grocery_lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "grocery_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staple_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_memories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "user_self_access" ON "users";--> statement-breakpoint
CREATE POLICY "user_self_access" ON "users" AS PERMISSIVE FOR ALL TO public USING (id = auth.uid()) WITH CHECK (id = auth.uid());--> statement-breakpoint
DROP POLICY IF EXISTS "member_self_access" ON "household_members";--> statement-breakpoint
CREATE POLICY "member_self_access" ON "household_members" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
DROP POLICY IF EXISTS "household_member_access" ON "households";--> statement-breakpoint
CREATE POLICY "household_member_access" ON "households" AS PERMISSIVE FOR ALL TO public USING (is_household_member(id)) WITH CHECK (is_household_member(id));--> statement-breakpoint
DROP POLICY IF EXISTS "household_member_access" ON "user_preferences";--> statement-breakpoint
CREATE POLICY "household_member_access" ON "user_preferences" AS PERMISSIVE FOR ALL TO public USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));--> statement-breakpoint
DROP POLICY IF EXISTS "household_member_access" ON "recipes";--> statement-breakpoint
CREATE POLICY "household_member_access" ON "recipes" AS PERMISSIVE FOR ALL TO public USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));--> statement-breakpoint
DROP POLICY IF EXISTS "household_member_access" ON "meal_plans";--> statement-breakpoint
CREATE POLICY "household_member_access" ON "meal_plans" AS PERMISSIVE FOR ALL TO public USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));--> statement-breakpoint
DROP POLICY IF EXISTS "household_member_access" ON "meal_plan_slots";--> statement-breakpoint
CREATE POLICY "household_member_access" ON "meal_plan_slots" AS PERMISSIVE FOR ALL TO public USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));--> statement-breakpoint
DROP POLICY IF EXISTS "household_member_access" ON "grocery_lists";--> statement-breakpoint
CREATE POLICY "household_member_access" ON "grocery_lists" AS PERMISSIVE FOR ALL TO public USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));--> statement-breakpoint
DROP POLICY IF EXISTS "household_member_access" ON "grocery_items";--> statement-breakpoint
CREATE POLICY "household_member_access" ON "grocery_items" AS PERMISSIVE FOR ALL TO public USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));--> statement-breakpoint
DROP POLICY IF EXISTS "household_member_access" ON "staple_items";--> statement-breakpoint
CREATE POLICY "household_member_access" ON "staple_items" AS PERMISSIVE FOR ALL TO public USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));--> statement-breakpoint
DROP POLICY IF EXISTS "household_member_access" ON "ai_memories";--> statement-breakpoint
CREATE POLICY "household_member_access" ON "ai_memories" AS PERMISSIVE FOR ALL TO public USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));
