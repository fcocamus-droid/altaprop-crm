-- Fix RLS: SUPERADMIN needs to see POSTULANTE profiles (they have no subscriber_id)
-- Allow SUPERADMIN to see: their team + any POSTULANTE profile
DROP POLICY IF EXISTS "Admins and agents can view all profiles" ON public.profiles;
CREATE POLICY "Admins and agents can view all profiles" ON public.profiles FOR SELECT
  USING (
    public.get_user_role() = 'SUPERADMINBOSS'
    OR public.get_user_role() = 'AGENTE'
    OR (public.get_user_role() = 'SUPERADMIN' AND (
      subscriber_id = public.get_subscriber_id()
      OR id = auth.uid()
      OR role = 'POSTULANTE'
    ))
  );
