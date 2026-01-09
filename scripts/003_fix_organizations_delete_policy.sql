-- Add missing DELETE policy for organizations table
-- This allows system_admin users to delete organizations

DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS organizations_delete_system_admin ON organizations;
  
  -- Create delete policy for system_admin role
  CREATE POLICY organizations_delete_system_admin
  ON organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );
  
  RAISE NOTICE 'Successfully created organizations delete policy for system_admin';
END $$;
