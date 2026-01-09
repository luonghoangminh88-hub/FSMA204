-- VEXIM FDA RENEWAL TRACKING
-- Purpose: Add date tracking for FDA facility registration and U.S. Agent contract renewals

-- =============================================
-- PART 1: ADD RENEWAL TRACKING FIELDS
-- =============================================

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS fda_renewal_deadline DATE NULL,
ADD COLUMN IF NOT EXISTS us_agent_contract_start DATE NULL,
ADD COLUMN IF NOT EXISTS us_agent_contract_duration_years INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS us_agent_contract_expiry DATE NULL,
ADD COLUMN IF NOT EXISTS use_vexim_agent BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.organizations.fda_renewal_deadline IS 'FDA facility registration renews biennially (every 2 years) at end of even years: 12/31/2024, 12/31/2026, etc.';
COMMENT ON COLUMN public.organizations.us_agent_contract_expiry IS 'U.S. Agent contract expiration calculated from start date + duration';
COMMENT ON COLUMN public.organizations.use_vexim_agent IS 'Whether organization uses VEXIM as their U.S. Agent service';

-- =============================================
-- PART 2: CREATE FUNCTION TO CALCULATE FDA RENEWAL DEADLINE
-- =============================================

CREATE OR REPLACE FUNCTION calculate_fda_renewal_deadline(registration_date DATE)
RETURNS DATE AS $$
DECLARE
  current_year INT;
  target_year INT;
BEGIN
  -- FDA registration renews every 2 years at end of even years
  current_year := EXTRACT(YEAR FROM COALESCE(registration_date, CURRENT_DATE));
  
  -- If current year is odd, next deadline is next even year
  -- If current year is even, deadline is end of that year
  IF current_year % 2 = 0 THEN
    target_year := current_year;
  ELSE
    target_year := current_year + 1;
  END IF;
  
  -- Return December 31 of target even year
  RETURN make_date(target_year, 12, 31);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- PART 3: CREATE FUNCTION TO CALCULATE AGENT CONTRACT EXPIRY
-- =============================================

CREATE OR REPLACE FUNCTION calculate_agent_contract_expiry(start_date DATE, duration_years INT)
RETURNS DATE AS $$
BEGIN
  IF start_date IS NULL OR duration_years IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN start_date + (duration_years || ' years')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- PART 4: CREATE TRIGGER TO AUTO-CALCULATE DEADLINES
-- =============================================

CREATE OR REPLACE FUNCTION update_fda_renewal_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate FDA renewal deadline when registration date changes
  IF NEW.fda_registration_date IS NOT NULL AND 
     (OLD.fda_registration_date IS NULL OR NEW.fda_registration_date != OLD.fda_registration_date) THEN
    NEW.fda_renewal_deadline := calculate_fda_renewal_deadline(NEW.fda_registration_date);
  END IF;
  
  -- Auto-calculate agent contract expiry when start date or duration changes
  IF NEW.us_agent_contract_start IS NOT NULL AND NEW.us_agent_contract_duration_years IS NOT NULL THEN
    IF OLD.us_agent_contract_start IS NULL OR 
       OLD.us_agent_contract_duration_years IS NULL OR
       NEW.us_agent_contract_start != OLD.us_agent_contract_start OR
       NEW.us_agent_contract_duration_years != OLD.us_agent_contract_duration_years THEN
      NEW.us_agent_contract_expiry := calculate_agent_contract_expiry(
        NEW.us_agent_contract_start, 
        NEW.us_agent_contract_duration_years
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fda_renewal_deadlines ON public.organizations;
CREATE TRIGGER trigger_update_fda_renewal_deadlines
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_fda_renewal_deadlines();

-- =============================================
-- PART 5: CREATE FDA ALERTS VIEW
-- =============================================

CREATE OR REPLACE VIEW public.fda_renewal_alerts AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.fda_registration_number,
  o.fda_renewal_deadline,
  o.us_agent_contract_expiry,
  o.use_vexim_agent,
  
  -- Days until FDA renewal
  CASE 
    WHEN o.fda_renewal_deadline IS NOT NULL THEN
      o.fda_renewal_deadline - CURRENT_DATE
    ELSE NULL
  END as days_until_fda_renewal,
  
  -- FDA renewal status
  CASE 
    WHEN o.fda_renewal_deadline IS NULL THEN 'not_set'
    WHEN o.fda_renewal_deadline < CURRENT_DATE THEN 'expired'
    WHEN o.fda_renewal_deadline - CURRENT_DATE <= 30 THEN 'critical'
    WHEN o.fda_renewal_deadline - CURRENT_DATE <= 90 THEN 'warning'
    ELSE 'ok'
  END as fda_renewal_status,
  
  -- Days until agent contract expiry
  CASE 
    WHEN o.us_agent_contract_expiry IS NOT NULL THEN
      o.us_agent_contract_expiry - CURRENT_DATE
    ELSE NULL
  END as days_until_agent_expiry,
  
  -- Agent contract status
  CASE 
    WHEN o.us_agent_contract_expiry IS NULL THEN 'not_set'
    WHEN o.us_agent_contract_expiry < CURRENT_DATE THEN 'expired'
    WHEN o.us_agent_contract_expiry - CURRENT_DATE <= 30 THEN 'critical'
    WHEN o.us_agent_contract_expiry - CURRENT_DATE <= 90 THEN 'warning'
    ELSE 'ok'
  END as agent_contract_status

FROM public.organizations o
WHERE o.fda_registration_number IS NOT NULL;

COMMENT ON VIEW public.fda_renewal_alerts IS 'Real-time tracking of FDA registration and U.S. Agent contract renewal deadlines';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ FDA Renewal Tracking Migration Complete';
  RAISE NOTICE '📅 FDA registration renews every 2 years at 12/31 of even years';
  RAISE NOTICE '📝 U.S. Agent contracts track start date + duration';
  RAISE NOTICE '⚠️ Automatic alerts for renewals within 90 days';
  RAISE NOTICE '🔔 Critical alerts for renewals within 30 days';
END $$;
