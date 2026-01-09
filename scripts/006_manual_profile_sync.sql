-- Manual sync script to create missing profiles from auth.users
-- Run this if you have existing auth users without profiles

DO $$
DECLARE
  auth_user RECORD;
  profile_exists BOOLEAN;
BEGIN
  -- Loop through all auth users
  FOR auth_user IN 
    SELECT 
      id,
      email,
      raw_user_meta_data,
      email_confirmed_at,
      created_at
    FROM auth.users
  LOOP
    -- Check if profile exists
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE id = auth_user.id
    ) INTO profile_exists;
    
    -- Create profile if missing
    IF NOT profile_exists THEN
      -- Removed 'status' column as it doesn't exist in profiles table
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        organization_id,
        created_at
      )
      VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1)),
        COALESCE(auth_user.raw_user_meta_data->>'phone', ''),
        COALESCE(auth_user.raw_user_meta_data->>'role', 'viewer'),
        (auth_user.raw_user_meta_data->>'organization_id')::uuid,
        auth_user.created_at
      );
      
      RAISE NOTICE 'Created profile for user: %', auth_user.email;
    END IF;
  END LOOP;
END $$;

-- Verify sync
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  COUNT(*) - (SELECT COUNT(*) FROM public.profiles) as missing_profiles
FROM auth.users;
