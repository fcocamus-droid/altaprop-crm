-- Migration: Multi-tenant isolation via subscriber_id

-- 1. Add subscriber_id to profiles, properties, visits
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscriber_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS subscriber_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS subscriber_id uuid REFERENCES public.profiles(id);

-- 2. Set subscriber_id for existing SUPERADMIN users (they are their own subscriber)
UPDATE public.profiles SET subscriber_id = id WHERE role = 'SUPERADMIN' AND subscriber_id IS NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_subscriber ON public.profiles(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_properties_subscriber ON public.properties(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_visits_subscriber ON public.visits(subscriber_id);

-- 4. Helper function to get current user's subscriber_id
CREATE OR REPLACE FUNCTION public.get_subscriber_id()
RETURNS uuid AS $$
  SELECT COALESCE(subscriber_id, id) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Update RLS policies for PROPERTIES
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties" ON public.properties FOR SELECT
  USING (
    public.get_user_role() = 'SUPERADMINBOSS'
    OR (public.get_user_role() = 'SUPERADMIN' AND subscriber_id = public.get_subscriber_id())
  );

DROP POLICY IF EXISTS "Owners agents admins can insert properties" ON public.properties;
CREATE POLICY "Owners agents admins can insert properties" ON public.properties FOR INSERT
  WITH CHECK (public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE', 'PROPIETARIO'));

DROP POLICY IF EXISTS "Admins can update any property" ON public.properties;
CREATE POLICY "Admins can update any property" ON public.properties FOR UPDATE
  USING (
    public.get_user_role() = 'SUPERADMINBOSS'
    OR (public.get_user_role() = 'SUPERADMIN' AND subscriber_id = public.get_subscriber_id())
  );

DROP POLICY IF EXISTS "Admins can delete any property" ON public.properties;
CREATE POLICY "Admins can delete any property" ON public.properties FOR DELETE
  USING (
    public.get_user_role() = 'SUPERADMINBOSS'
    OR (public.get_user_role() = 'SUPERADMIN' AND subscriber_id = public.get_subscriber_id())
  );

-- 6. Update RLS policies for VISITS
DROP POLICY IF EXISTS "Admins can view all visits" ON public.visits;
CREATE POLICY "Admins can view all visits" ON public.visits FOR SELECT
  USING (
    public.get_user_role() = 'SUPERADMINBOSS'
    OR (public.get_user_role() = 'SUPERADMIN' AND subscriber_id = public.get_subscriber_id())
  );

DROP POLICY IF EXISTS "Admins can delete visits" ON public.visits;
CREATE POLICY "Admins can delete visits" ON public.visits FOR DELETE
  USING (
    public.get_user_role() = 'SUPERADMINBOSS'
    OR (public.get_user_role() = 'SUPERADMIN' AND subscriber_id = public.get_subscriber_id())
  );

-- 7. Update RLS policies for PROFILES (subscriber sees only their team)
DROP POLICY IF EXISTS "Admins and agents can view all profiles" ON public.profiles;
CREATE POLICY "Admins and agents can view all profiles" ON public.profiles FOR SELECT
  USING (
    public.get_user_role() = 'SUPERADMINBOSS'
    OR public.get_user_role() = 'AGENTE'
    OR (public.get_user_role() = 'SUPERADMIN' AND (subscriber_id = public.get_subscriber_id() OR id = auth.uid()))
  );

-- 8. Update RLS policies for APPLICATIONS (via property subscriber_id)
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
CREATE POLICY "Admins can view all applications" ON public.applications FOR SELECT
  USING (
    public.get_user_role() = 'SUPERADMINBOSS'
    OR (public.get_user_role() IN ('SUPERADMIN', 'AGENTE') AND EXISTS (
      SELECT 1 FROM public.properties WHERE id = property_id AND subscriber_id = public.get_subscriber_id()
    ))
  );
