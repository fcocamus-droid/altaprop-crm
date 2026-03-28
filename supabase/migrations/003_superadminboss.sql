-- Migration: Add SUPERADMINBOSS role
-- SUPERADMINBOSS is the platform owner (fcocamusf@gmail.com)
-- SUPERADMIN are subscribers/clients who manage their own business

-- 1. Update CHECK constraint on profiles to include SUPERADMINBOSS
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE', 'PROPIETARIO', 'POSTULANTE'));

-- 2. Update RLS policies to include SUPERADMINBOSS alongside SUPERADMIN

-- PROFILES: Admins and agents can view all profiles
DROP POLICY IF EXISTS "Admins and agents can view all profiles" ON public.profiles;
CREATE POLICY "Admins and agents can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE'));

-- PROFILES: Admins can update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN'));

-- PROPERTIES: Admins can view all properties
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties"
  ON public.properties FOR SELECT
  USING (public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN'));

-- PROPERTIES: Owners agents admins can insert properties
DROP POLICY IF EXISTS "Owners agents admins can insert properties" ON public.properties;
CREATE POLICY "Owners agents admins can insert properties"
  ON public.properties FOR INSERT
  WITH CHECK (public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE', 'PROPIETARIO'));

-- PROPERTIES: Admins can update any property
DROP POLICY IF EXISTS "Admins can update any property" ON public.properties;
CREATE POLICY "Admins can update any property"
  ON public.properties FOR UPDATE
  USING (public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN'));

-- PROPERTIES: Admins can delete any property
DROP POLICY IF EXISTS "Admins can delete any property" ON public.properties;
CREATE POLICY "Admins can delete any property"
  ON public.properties FOR DELETE
  USING (public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN'));

-- PROPERTY IMAGES: Property owners can manage images
DROP POLICY IF EXISTS "Property owners can manage images" ON public.property_images;
CREATE POLICY "Property owners can manage images"
  ON public.property_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND (owner_id = auth.uid() OR agent_id = auth.uid())
    )
    OR public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN')
  );

-- PROPERTY IMAGES: Property owners can delete images
DROP POLICY IF EXISTS "Property owners can delete images" ON public.property_images;
CREATE POLICY "Property owners can delete images"
  ON public.property_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND (owner_id = auth.uid() OR agent_id = auth.uid())
    )
    OR public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN')
  );

-- APPLICATIONS: Admins can view all applications
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
CREATE POLICY "Admins can view all applications"
  ON public.applications FOR SELECT
  USING (public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN'));

-- APPLICATIONS: Owners agents admins can update application status
DROP POLICY IF EXISTS "Owners agents admins can update application status" ON public.applications;
CREATE POLICY "Owners agents admins can update application status"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND (owner_id = auth.uid() OR agent_id = auth.uid())
    )
    OR public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN')
  );

-- APPLICATION DOCUMENTS: Document viewers match application access
DROP POLICY IF EXISTS "Document viewers match application access" ON public.application_documents;
CREATE POLICY "Document viewers match application access"
  ON public.application_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
      AND (
        a.applicant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = a.property_id AND (p.owner_id = auth.uid() OR p.agent_id = auth.uid())
        )
        OR public.get_user_role() IN ('SUPERADMINBOSS', 'SUPERADMIN')
      )
    )
  );
