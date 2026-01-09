-- =============================================
-- AUTO SUBSCRIPTION & USER COUNT TRACKING
-- Automatically assign Starter package and track user counts
-- =============================================

-- =============================================
-- PART 1: AUTO-CREATE STARTER SUBSCRIPTION FOR NEW ORGANIZATIONS
-- =============================================

CREATE OR REPLACE FUNCTION auto_create_starter_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_starter_package_id UUID;
  v_starter_price DECIMAL(10, 2);
BEGIN
  -- Get Starter package details
  SELECT id, price_monthly 
  INTO v_starter_package_id, v_starter_price
  FROM public.service_packages 
  WHERE package_code = 'starter' 
  AND is_active = true
  LIMIT 1;
  
  -- Only proceed if Starter package exists
  IF v_starter_package_id IS NOT NULL THEN
    -- Create active subscription with proper monthly_total set
    INSERT INTO public.organization_subscriptions (
      organization_id,
      package_id,
      subscription_status,
      billing_cycle,
      subscription_start_date,
      next_billing_date,
      usage_period_start,
      usage_period_end,
      base_price,
      monthly_total,
      current_users_count,
      current_locations_count,
      current_lots_count,
      extra_users_count,
      extra_locations_count,
      extra_lots_count
    ) VALUES (
      NEW.id,
      v_starter_package_id,
      'active',
      'monthly',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 month',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 month',
      v_starter_price,
      v_starter_price,
      0,
      0,
      0,
      0,
      0,
      0
    );
    
    RAISE NOTICE 'Auto-created Starter subscription for organization: %', NEW.name;
  ELSE
    RAISE WARNING 'Starter package not found. Please create service packages first.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_create_starter_subscription ON public.organizations;

CREATE TRIGGER trigger_auto_create_starter_subscription
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_starter_subscription();

COMMENT ON TRIGGER trigger_auto_create_starter_subscription ON public.organizations 
IS 'Automatically creates a Starter subscription when a new organization is created';

-- =============================================
-- PART 2: AUTO-UPDATE USER COUNT IN SUBSCRIPTION
-- =============================================

-- Function to count active users for an organization
CREATE OR REPLACE FUNCTION count_organization_users(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_user_count INTEGER;
BEGIN
  -- Count all active users (staff, manager, org_admin) in the organization
  -- Note: system_admin users are excluded as they don't belong to a specific org
  SELECT COUNT(*)
  INTO v_user_count
  FROM public.profiles
  WHERE organization_id = p_organization_id
  AND is_active = true
  AND role IN ('org_admin', 'manager', 'operator', 'viewer'); -- Count all user roles
  
  RETURN COALESCE(v_user_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update user count in active subscription
CREATE OR REPLACE FUNCTION update_subscription_user_count()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_new_count INTEGER;
  v_old_count INTEGER;
BEGIN
  -- Determine organization_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;
  ELSE
    v_org_id := NEW.organization_id;
  END IF;
  
  -- Skip if no organization (e.g., system_admin users)
  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Count current active users
  v_new_count := count_organization_users(v_org_id);
  
  -- Update the active subscription's user count
  UPDATE public.organization_subscriptions
  SET 
    current_users_count = v_new_count,
    updated_at = NOW()
  WHERE organization_id = v_org_id
  AND subscription_status = 'active';
  
  -- Log the change
  IF FOUND THEN
    RAISE NOTICE 'Updated user count for org %: % users', v_org_id, v_new_count;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_user_count_on_profile_change ON public.profiles;

-- Create trigger on profiles table to track user count changes
CREATE TRIGGER trigger_update_user_count_on_profile_change
  AFTER INSERT OR UPDATE OF is_active, organization_id, role OR DELETE
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_user_count();

COMMENT ON TRIGGER trigger_update_user_count_on_profile_change ON public.profiles
IS 'Automatically updates current_users_count in organization_subscriptions when users are added/removed/changed';

-- =============================================
-- PART 3: AUTO-UPDATE LOCATION COUNT
-- =============================================

-- Function to count active locations for an organization
CREATE OR REPLACE FUNCTION count_organization_locations(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_location_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_location_count
  FROM public.locations
  WHERE organization_id = p_organization_id
  AND is_active = true;
  
  RETURN COALESCE(v_location_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update location count in active subscription
CREATE OR REPLACE FUNCTION update_subscription_location_count()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_new_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;
  ELSE
    v_org_id := NEW.organization_id;
  END IF;
  
  v_new_count := count_organization_locations(v_org_id);
  
  UPDATE public.organization_subscriptions
  SET 
    current_locations_count = v_new_count,
    updated_at = NOW()
  WHERE organization_id = v_org_id
  AND subscription_status = 'active';
  
  IF FOUND THEN
    RAISE NOTICE 'Updated location count for org %: % locations', v_org_id, v_new_count;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_location_count_on_location_change ON public.locations;

CREATE TRIGGER trigger_update_location_count_on_location_change
  AFTER INSERT OR UPDATE OF is_active OR DELETE
  ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_location_count();

COMMENT ON TRIGGER trigger_update_location_count_on_location_change ON public.locations
IS 'Automatically updates current_locations_count in organization_subscriptions';

-- =============================================
-- PART 4: AUTO-UPDATE LOT COUNT (MONTHLY)
-- =============================================

-- Function to count lots created in current billing period
CREATE OR REPLACE FUNCTION count_organization_lots_current_period(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_lot_count INTEGER;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Get current usage period from active subscription
  SELECT usage_period_start, usage_period_end
  INTO v_period_start, v_period_end
  FROM public.organization_subscriptions
  WHERE organization_id = p_organization_id
  AND subscription_status = 'active'
  LIMIT 1;
  
  -- If no active subscription or period not set, use current month
  IF v_period_start IS NULL THEN
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;
  END IF;
  
  -- Count lots created in the current period
  SELECT COUNT(*)
  INTO v_lot_count
  FROM public.traceability_lots
  WHERE organization_id = p_organization_id
  AND created_at >= v_period_start
  AND created_at < v_period_end;
  
  RETURN COALESCE(v_lot_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update lot count in active subscription
CREATE OR REPLACE FUNCTION update_subscription_lot_count()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_new_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;
  ELSE
    v_org_id := NEW.organization_id;
  END IF;
  
  v_new_count := count_organization_lots_current_period(v_org_id);
  
  UPDATE public.organization_subscriptions
  SET 
    current_lots_count = v_new_count,
    updated_at = NOW()
  WHERE organization_id = v_org_id
  AND subscription_status = 'active';
  
  IF FOUND THEN
    RAISE NOTICE 'Updated lot count for org %: % lots this period', v_org_id, v_new_count;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lot_count_on_lot_change ON public.traceability_lots;

CREATE TRIGGER trigger_update_lot_count_on_lot_change
  AFTER INSERT OR DELETE
  ON public.traceability_lots
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_lot_count();

COMMENT ON TRIGGER trigger_update_lot_count_on_lot_change ON public.traceability_lots
IS 'Automatically updates current_lots_count in organization_subscriptions for current billing period';

-- =============================================
-- PART 5: HELPER FUNCTIONS FOR QUOTA CHECKING
-- =============================================

-- Fixed check_quota_limits to JOIN with service_packages and use COALESCE for custom quota
-- Check if organization is within quota limits
CREATE OR REPLACE FUNCTION check_quota_limits(
  p_organization_id UUID,
  p_resource_type TEXT -- 'users', 'locations', 'lots'
) RETURNS TABLE (
  is_within_limit BOOLEAN,
  current_count INTEGER,
  max_allowed INTEGER,
  usage_percent DECIMAL(5,2),
  is_unlimited BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Use effective quota (custom or package default) for limit checking
    CASE 
      WHEN COALESCE(os.custom_max_users, sp.max_users) IS NULL AND p_resource_type = 'users' THEN true
      WHEN COALESCE(os.custom_max_locations, sp.max_locations) IS NULL AND p_resource_type = 'locations' THEN true
      WHEN COALESCE(os.custom_max_lots_per_month, sp.max_lots_per_month) IS NULL AND p_resource_type = 'lots' THEN true
      WHEN p_resource_type = 'users' THEN os.current_users_count <= COALESCE(os.custom_max_users, sp.max_users, 999999)
      WHEN p_resource_type = 'locations' THEN os.current_locations_count <= COALESCE(os.custom_max_locations, sp.max_locations, 999999)
      WHEN p_resource_type = 'lots' THEN os.current_lots_count <= COALESCE(os.custom_max_lots_per_month, sp.max_lots_per_month, 999999)
      ELSE false
    END as is_within_limit,
    
    CASE p_resource_type
      WHEN 'users' THEN os.current_users_count
      WHEN 'locations' THEN os.current_locations_count
      WHEN 'lots' THEN os.current_lots_count
      ELSE 0
    END as current_count,
    
    -- Return effective quota (custom or package default)
    CASE p_resource_type
      WHEN 'users' THEN COALESCE(os.custom_max_users, sp.max_users)
      WHEN 'locations' THEN COALESCE(os.custom_max_locations, sp.max_locations)
      WHEN 'lots' THEN COALESCE(os.custom_max_lots_per_month, sp.max_lots_per_month)
      ELSE NULL
    END as max_allowed,
    
    CASE 
      WHEN p_resource_type = 'users' AND COALESCE(os.custom_max_users, sp.max_users) IS NOT NULL THEN 
        ROUND((os.current_users_count::DECIMAL / COALESCE(os.custom_max_users, sp.max_users)) * 100, 2)
      WHEN p_resource_type = 'locations' AND COALESCE(os.custom_max_locations, sp.max_locations) IS NOT NULL THEN 
        ROUND((os.current_locations_count::DECIMAL / COALESCE(os.custom_max_locations, sp.max_locations)) * 100, 2)
      WHEN p_resource_type = 'lots' AND COALESCE(os.custom_max_lots_per_month, sp.max_lots_per_month) IS NOT NULL THEN 
        ROUND((os.current_lots_count::DECIMAL / COALESCE(os.custom_max_lots_per_month, sp.max_lots_per_month)) * 100, 2)
      ELSE 0
    END as usage_percent,
    
    CASE p_resource_type
      WHEN 'users' THEN COALESCE(os.custom_max_users, sp.max_users) IS NULL
      WHEN 'locations' THEN COALESCE(os.custom_max_locations, sp.max_locations) IS NULL
      WHEN 'lots' THEN COALESCE(os.custom_max_lots_per_month, sp.max_lots_per_month) IS NULL
      ELSE false
    END as is_unlimited
    
  FROM public.organization_subscriptions os
  JOIN public.service_packages sp ON sp.id = os.package_id
  WHERE os.organization_id = p_organization_id
  AND os.subscription_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PART 6: INITIAL DATA SYNC
-- =============================================

-- Sync existing organizations with user/location/lot counts
-- Run this once to update existing subscriptions
DO $$
DECLARE
  v_org RECORD;
  v_user_count INTEGER;
  v_location_count INTEGER;
  v_lot_count INTEGER;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations WHERE is_active = true LOOP
    v_user_count := count_organization_users(v_org.id);
    v_location_count := count_organization_locations(v_org.id);
    v_lot_count := count_organization_lots_current_period(v_org.id);
    
    UPDATE public.organization_subscriptions
    SET 
      current_users_count = v_user_count,
      current_locations_count = v_location_count,
      current_lots_count = v_lot_count,
      updated_at = NOW()
    WHERE organization_id = v_org.id
    AND subscription_status = 'active';
    
    IF FOUND THEN
      RAISE NOTICE 'Synced counts for org %: % users, % locations, % lots', 
        v_org.id, v_user_count, v_location_count, v_lot_count;
    END IF;
  END LOOP;
END;
$$;

-- =============================================
-- VERIFICATION & PERMISSIONS
-- =============================================

-- Note: subscription_quota_status view is created in script 027
-- This script only creates the helper functions and triggers

-- Grant permissions
GRANT EXECUTE ON FUNCTION count_organization_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_organization_locations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_organization_lots_current_period(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_quota_limits(UUID, TEXT) TO authenticated;
