-- Fix RLS Security Vulnerabilities
-- Prevents org_admin from seeing system_admin profiles

-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_select_own_org" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_system_admin" ON public.profiles;

-- Recreate with proper isolation
-- System admins can view all profiles
CREATE POLICY "profiles_select_system_admin" ON public.profiles
  FOR SELECT
  USING (public.is_system_admin());

-- Users can ONLY view profiles in their organization (excluding system admins)
CREATE POLICY "profiles_select_own_org" ON public.profiles
  FOR SELECT
  USING (
    organization_id = public.get_user_organization()
    AND organization_id IS NOT NULL  -- Explicitly exclude NULL org_id (system admins)
    AND role != 'system_admin'       -- Double protection: exclude system_admin role
  );

-- Users can view their own profile
-- (Keep existing policy - no changes needed)

-- Fix organizations policies
DROP POLICY IF EXISTS "organizations_select_system_admin" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select_own" ON public.organizations;

-- Only system admins can view all organizations
CREATE POLICY "organizations_select_system_admin" ON public.organizations
  FOR SELECT
  USING (public.is_system_admin());

-- Regular users can ONLY view their own organization
CREATE POLICY "organizations_select_own" ON public.organizations
  FOR SELECT
  USING (
    id = public.get_user_organization()
    AND NOT public.is_system_admin()  -- Prevent duplicate results for system_admin
  );

-- Add audit logging for sensitive queries
CREATE OR REPLACE FUNCTION public.log_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when non-system-admin tries to access profiles
  IF TG_OP = 'SELECT' AND NOT public.is_system_admin() THEN
    INSERT INTO audit_log (
      table_name,
      action,
      user_id,
      organization_id,
      record_id,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      'SENSITIVE_SELECT',
      auth.uid(),
      public.get_user_organization(),
      NULL,
      NOW()
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
