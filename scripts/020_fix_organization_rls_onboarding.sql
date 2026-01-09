-- Fix RLS Policy for Organization Creation during Onboarding
-- Allow authenticated users to create their first organization

-- Drop old policy
DROP POLICY IF EXISTS "organizations_insert_system_admin" ON public.organizations;

-- Create new policy that allows:
-- 1. System admins can always create organizations
-- 2. Authenticated users can create organization if they don't have one yet
CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT
  WITH CHECK (
    -- System admin can always create
    public.is_system_admin() 
    OR 
    -- Or user is authenticated and doesn't have an organization yet
    (
      auth.uid() IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

COMMENT ON POLICY "organizations_insert" ON public.organizations IS 
  'Allows system admins to create any organization, and authenticated users to create their first organization during onboarding';
