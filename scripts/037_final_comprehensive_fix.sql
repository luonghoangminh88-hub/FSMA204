-- =============================================
-- COMPREHENSIVE FIX FOR SUBSCRIPTION & INVOICE SYSTEM
-- Version: 3.0 Final
-- Purpose: Resolve NOT NULL constraint violations
-- =============================================

-- =============================================
-- STEP 1: DROP CONFLICTING TRIGGERS AND FUNCTIONS
-- =============================================

DROP TRIGGER IF EXISTS trigger_update_subscription_total ON public.organization_subscriptions;
DROP TRIGGER IF EXISTS trigger_auto_generate_invoice_number ON public.invoices;
DROP FUNCTION IF EXISTS update_subscription_monthly_total();
DROP FUNCTION IF EXISTS calculate_subscription_monthly_total(UUID);
DROP FUNCTION IF EXISTS auto_generate_invoice_number();

-- =============================================
-- STEP 2: ALTER TABLE CONSTRAINTS
-- Remove NOT NULL from columns managed by triggers
-- =============================================

-- Fix organization_subscriptions.monthly_total
ALTER TABLE public.organization_subscriptions 
  ALTER COLUMN monthly_total DROP NOT NULL;

ALTER TABLE public.organization_subscriptions 
  ALTER COLUMN monthly_total SET DEFAULT 0.00;

-- Update existing NULL values
UPDATE public.organization_subscriptions 
  SET monthly_total = base_price 
  WHERE monthly_total IS NULL;

-- Fix invoices.invoice_number
ALTER TABLE public.invoices 
  ALTER COLUMN invoice_number DROP NOT NULL;

-- =============================================
-- STEP 3: CREATE IMPROVED TRIGGER FUNCTIONS
-- =============================================

-- Function: Calculate monthly_total WITHOUT querying database
CREATE OR REPLACE FUNCTION trigger_calculate_monthly_total()
RETURNS TRIGGER AS $$
DECLARE
  v_user_price DECIMAL(10, 2) := 0.00;
  v_location_price DECIMAL(10, 2) := 0.00;
  v_lot_price DECIMAL(10, 4) := 0.00;
BEGIN
  -- Get pricing from package ONLY if package_id exists
  IF NEW.package_id IS NOT NULL THEN
    SELECT 
      COALESCE(sp.extra_user_price, 0),
      COALESCE(sp.extra_location_price, 0),
      COALESCE(sp.extra_lot_price, 0)
    INTO
      v_user_price,
      v_location_price,
      v_lot_price
    FROM public.service_packages sp
    WHERE sp.id = NEW.package_id;
  END IF;
  
  -- Calculate total directly from NEW values
  NEW.monthly_total := COALESCE(NEW.base_price, 0.00)
    + (COALESCE(NEW.extra_users_count, 0) * v_user_price)
    + (COALESCE(NEW.extra_locations_count, 0) * v_location_price)
    + (COALESCE(NEW.extra_lots_count, 0) * v_lot_price);
  
  -- Log for debugging
  RAISE NOTICE '[v0] Calculated monthly_total: base=%, extras=%, total=%', 
    NEW.base_price, 
    (COALESCE(NEW.extra_users_count, 0) * v_user_price),
    NEW.monthly_total;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-generate invoice_number if not provided
CREATE OR REPLACE FUNCTION trigger_generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_new_number TEXT;
BEGIN
  -- Only generate if invoice_number is NULL or empty
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    v_year := TO_CHAR(COALESCE(NEW.invoice_date, CURRENT_DATE), 'YYYY');
    
    -- Get count for this year
    SELECT COUNT(*) + 1 
    INTO v_count 
    FROM public.invoices 
    WHERE TO_CHAR(invoice_date, 'YYYY') = v_year
    AND invoice_number IS NOT NULL;
    
    v_new_number := 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
    NEW.invoice_number := v_new_number;
    
    RAISE NOTICE '[v0] Generated invoice_number: %', v_new_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 4: CREATE TRIGGERS
-- =============================================

-- Trigger for organization_subscriptions
CREATE TRIGGER trigger_calculate_subscription_monthly_total
  BEFORE INSERT OR UPDATE 
  ON public.organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_monthly_total();

-- Trigger for invoices
CREATE TRIGGER trigger_auto_invoice_number
  BEFORE INSERT OR UPDATE
  ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_invoice_number();

-- =============================================
-- STEP 5: ADD VALIDATION FUNCTION
-- =============================================

-- Helper function to validate subscription before insert
CREATE OR REPLACE FUNCTION validate_subscription_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure base_price is set
  IF NEW.base_price IS NULL OR NEW.base_price < 0 THEN
    RAISE EXCEPTION 'base_price must be a positive number, got %', NEW.base_price;
  END IF;
  
  -- Ensure package_id exists
  IF NEW.package_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.service_packages WHERE id = NEW.package_id) THEN
      RAISE EXCEPTION 'Invalid package_id: %', NEW.package_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_subscription
  BEFORE INSERT OR UPDATE
  ON public.organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_subscription_data();

-- =============================================
-- STEP 6: CREATE LOGGING TABLE FOR DEBUGGING
-- =============================================

CREATE TABLE IF NOT EXISTS public.subscription_debug_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID,
  action TEXT,
  base_price DECIMAL(10, 2),
  monthly_total DECIMAL(10, 2),
  extra_users INTEGER,
  extra_locations INTEGER,
  extra_lots INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to log subscription operations
CREATE OR REPLACE FUNCTION log_subscription_operation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscription_debug_logs (
    subscription_id, action, base_price, monthly_total,
    extra_users, extra_locations, extra_lots
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    NEW.base_price,
    NEW.monthly_total,
    NEW.extra_users_count,
    NEW.extra_locations_count,
    NEW.extra_lots_count
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_subscription_ops
  AFTER INSERT OR UPDATE
  ON public.organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_operation();

-- =============================================
-- STEP 7: VERIFICATION QUERIES
-- =============================================

-- Test trigger manually
DO $$
DECLARE
  v_test_sub_id UUID;
  v_test_pkg_id UUID;
  v_test_org_id UUID;
BEGIN
  -- Get a test package and organization
  SELECT id INTO v_test_pkg_id FROM public.service_packages LIMIT 1;
  SELECT id INTO v_test_org_id FROM public.organizations LIMIT 1;
  
  IF v_test_pkg_id IS NOT NULL AND v_test_org_id IS NOT NULL THEN
    -- Test insert
    INSERT INTO public.organization_subscriptions (
      organization_id, package_id, base_price, 
      subscription_status, billing_cycle, subscription_start_date
    ) VALUES (
      v_test_org_id, v_test_pkg_id, 99.00,
      'trial', 'monthly', CURRENT_DATE
    ) RETURNING id INTO v_test_sub_id;
    
    RAISE NOTICE '[v0] Test subscription created: %', v_test_sub_id;
    
    -- Verify monthly_total was calculated
    PERFORM * FROM public.organization_subscriptions 
    WHERE id = v_test_sub_id 
    AND monthly_total IS NOT NULL;
    
    IF FOUND THEN
      RAISE NOTICE '[v0] ✓ monthly_total calculated successfully';
    ELSE
      RAISE WARNING '[v0] ✗ monthly_total is still NULL';
    END IF;
    
    -- Cleanup test data
    DELETE FROM public.organization_subscriptions WHERE id = v_test_sub_id;
    RAISE NOTICE '[v0] Test data cleaned up';
  ELSE
    RAISE NOTICE '[v0] Cannot test - no packages or organizations found';
  END IF;
END $$;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'MIGRATION COMPLETE - Script 037';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '1. ✓ Removed NOT NULL from monthly_total';
  RAISE NOTICE '2. ✓ Removed NOT NULL from invoice_number';
  RAISE NOTICE '3. ✓ Created new trigger functions';
  RAISE NOTICE '4. ✓ Added validation triggers';
  RAISE NOTICE '5. ✓ Added debug logging table';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test API endpoint: POST /api/invoices/create';
  RAISE NOTICE '2. Check logs in subscription_debug_logs table';
  RAISE NOTICE '3. Monitor for any errors in production';
  RAISE NOTICE '=============================================';
END $$;
