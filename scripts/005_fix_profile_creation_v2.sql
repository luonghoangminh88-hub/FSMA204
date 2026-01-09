-- Version 2: Enhanced profile creation trigger with better organization handling
-- This replaces the need for setTimeout and retry logic in the frontend

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile immediately when auth user is created
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    language_preference,
    organization_id,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    COALESCE(NEW.raw_user_meta_data->>'language_preference', 'en'),
    (NEW.raw_user_meta_data->>'organization_id')::UUID,
    COALESCE((NEW.raw_user_meta_data->>'is_active')::BOOLEAN, TRUE)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add index to improve query performance for organization filtering
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
  ON public.profiles(organization_id) 
  WHERE organization_id IS NOT NULL;

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON public.profiles(role);

-- Add composite index for common filter queries
CREATE INDEX IF NOT EXISTS idx_profiles_org_role 
  ON public.profiles(organization_id, role) 
  WHERE organization_id IS NOT NULL;
