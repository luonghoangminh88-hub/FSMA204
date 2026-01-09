-- Add DELETE policy for profiles table
-- Allows system_admin and org_admin to delete users in their organization

-- System admins and org admins can delete profiles
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE
  USING (
    public.get_user_role() IN ('system_admin', 'org_admin')
    AND (
      public.is_system_admin() 
      OR organization_id = public.get_user_organization()
    )
  );

-- Note: This only deletes the profile row, not the auth.users entry
-- To fully delete a user, you need to use Supabase Admin API
-- or set up ON DELETE CASCADE from auth.users to profiles
