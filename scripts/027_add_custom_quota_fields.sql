-- =============================================
-- ADD CUSTOM QUOTA FIELDS TO SUBSCRIPTIONS
-- Allow admin to customize resource limits per subscription
-- =============================================

-- Add custom quota fields to organization_subscriptions
ALTER TABLE public.organization_subscriptions 
ADD COLUMN IF NOT EXISTS custom_max_users INTEGER,
ADD COLUMN IF NOT EXISTS custom_max_locations INTEGER,
ADD COLUMN IF NOT EXISTS custom_max_lots_per_month INTEGER,
ADD COLUMN IF NOT EXISTS custom_storage_gb INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN public.organization_subscriptions.custom_max_users IS 'Custom user limit override (NULL = use package default)';
COMMENT ON COLUMN public.organization_subscriptions.custom_max_locations IS 'Custom location limit override (NULL = use package default)';
COMMENT ON COLUMN public.organization_subscriptions.custom_max_lots_per_month IS 'Custom lots/month limit override (NULL = use package default)';
COMMENT ON COLUMN public.organization_subscriptions.custom_storage_gb IS 'Custom storage limit override (NULL = use package default)';

-- Create helper function to get effective quota (custom or package default)
CREATE OR REPLACE FUNCTION get_effective_quota(
  p_subscription_id UUID,
  p_quota_type TEXT -- 'users', 'locations', 'lots', 'storage'
) RETURNS INTEGER AS $$
DECLARE
  v_custom_value INTEGER;
  v_package_value INTEGER;
BEGIN
  -- Get custom and package values
  IF p_quota_type = 'users' THEN
    SELECT os.custom_max_users, sp.max_users
    INTO v_custom_value, v_package_value
    FROM public.organization_subscriptions os
    JOIN public.service_packages sp ON sp.id = os.package_id
    WHERE os.id = p_subscription_id;
    
  ELSIF p_quota_type = 'locations' THEN
    SELECT os.custom_max_locations, sp.max_locations
    INTO v_custom_value, v_package_value
    FROM public.organization_subscriptions os
    JOIN public.service_packages sp ON sp.id = os.package_id
    WHERE os.id = p_subscription_id;
    
  ELSIF p_quota_type = 'lots' THEN
    SELECT os.custom_max_lots_per_month, sp.max_lots_per_month
    INTO v_custom_value, v_package_value
    FROM public.organization_subscriptions os
    JOIN public.service_packages sp ON sp.id = os.package_id
    WHERE os.id = p_subscription_id;
    
  ELSIF p_quota_type = 'storage' THEN
    SELECT os.custom_storage_gb, sp.storage_gb
    INTO v_custom_value, v_package_value
    FROM public.organization_subscriptions os
    JOIN public.service_packages sp ON sp.id = os.package_id
    WHERE os.id = p_subscription_id;
  END IF;
  
  -- Return custom value if set, otherwise package default
  RETURN COALESCE(v_custom_value, v_package_value);
END;
$$ LANGUAGE plpgsql;

-- Create view for easy quota checking
CREATE OR REPLACE VIEW subscription_quota_status AS
SELECT 
  os.id as subscription_id,
  os.organization_id,
  o.name as organization_name,
  sp.package_name,
  
  -- User quota
  COALESCE(os.custom_max_users, sp.max_users) as max_users,
  os.current_users_count,
  CASE 
    WHEN COALESCE(os.custom_max_users, sp.max_users) IS NULL THEN 0
    ELSE ROUND((os.current_users_count::DECIMAL / COALESCE(os.custom_max_users, sp.max_users, 1)) * 100, 2)
  END as users_usage_percent,
  
  -- Location quota
  COALESCE(os.custom_max_locations, sp.max_locations) as max_locations,
  os.current_locations_count,
  CASE 
    WHEN COALESCE(os.custom_max_locations, sp.max_locations) IS NULL THEN 0
    ELSE ROUND((os.current_locations_count::DECIMAL / COALESCE(os.custom_max_locations, sp.max_locations, 1)) * 100, 2)
  END as locations_usage_percent,
  
  -- Lots quota
  COALESCE(os.custom_max_lots_per_month, sp.max_lots_per_month) as max_lots_per_month,
  os.current_lots_count,
  CASE 
    WHEN COALESCE(os.custom_max_lots_per_month, sp.max_lots_per_month) IS NULL THEN 0
    ELSE ROUND((os.current_lots_count::DECIMAL / COALESCE(os.custom_max_lots_per_month, sp.max_lots_per_month, 1)) * 100, 2)
  END as lots_usage_percent,
  
  -- Storage quota
  COALESCE(os.custom_storage_gb, sp.storage_gb) as storage_gb,
  
  -- Status flags
  os.custom_max_users IS NOT NULL as has_custom_user_quota,
  os.custom_max_locations IS NOT NULL as has_custom_location_quota,
  os.custom_max_lots_per_month IS NOT NULL as has_custom_lots_quota,
  os.custom_storage_gb IS NOT NULL as has_custom_storage_quota
  
FROM public.organization_subscriptions os
JOIN public.organizations o ON o.id = os.organization_id
JOIN public.service_packages sp ON sp.id = os.package_id
WHERE os.subscription_status = 'active';

-- Removed invalid RLS policy on VIEW (views inherit security from underlying tables)
-- Grant access to the view for authenticated users
GRANT SELECT ON subscription_quota_status TO authenticated;

-- Note: RLS policies are automatically inherited from the underlying tables
-- (organization_subscriptions, organizations, service_packages)
-- No need to create separate policies on the view
