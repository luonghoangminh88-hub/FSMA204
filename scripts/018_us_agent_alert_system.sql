-- VEXIM U.S. Agent & Alert System Implementation
-- Purpose: Add agent contract tracking and automated alert calculations

-- =============================================
-- PART 1: ADD AGENT CONTRACT FIELDS
-- =============================================

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS agent_contract_start_date DATE NULL,
ADD COLUMN IF NOT EXISTS agent_contract_years INTEGER DEFAULT 1 CHECK (agent_contract_years IN (1, 2, 5)),
ADD COLUMN IF NOT EXISTS agent_contract_end_date DATE NULL,
ADD COLUMN IF NOT EXISTS agent_contract_status TEXT DEFAULT 'inactive' CHECK (agent_contract_status IN ('active', 'expiring_soon', 'expired', 'inactive')),
ADD COLUMN IF NOT EXISTS agent_auto_renew BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fda_renewal_year INTEGER NULL,
ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS alert_level TEXT DEFAULT 'safe' CHECK (alert_level IN ('critical', 'warning', 'safe'));

COMMENT ON COLUMN public.organizations.agent_contract_years IS 'VEXIM: Agent contract duration - 1, 2, or 5 years';
COMMENT ON COLUMN public.organizations.agent_contract_end_date IS 'Auto-calculated: start_date + (years * 365 days)';
COMMENT ON COLUMN public.organizations.fda_renewal_year IS 'Next even year for FDA renewal (2024, 2026, etc.)';
COMMENT ON COLUMN public.organizations.alert_level IS 'Auto-calculated: critical/warning/safe based on expiration dates';

-- =============================================
-- PART 2: CREATE ALERT CALCULATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_agent_alert_level(org_id UUID)
RETURNS TABLE (
  alert_level TEXT,
  alert_message TEXT,
  days_until_fda_renewal INTEGER,
  days_until_agent_expiry INTEGER,
  action_required BOOLEAN,
  can_export_fda BOOLEAN
) AS $$
DECLARE
  org RECORD;
  current_year INTEGER;
  next_even_year INTEGER;
  fda_renewal_date DATE;
  days_to_fda INTEGER;
  days_to_agent INTEGER;
  level TEXT := 'safe';
  message TEXT := 'All systems operational';
  action_needed BOOLEAN := false;
  export_allowed BOOLEAN := false;
BEGIN
  -- Get organization data
  SELECT * INTO org
  FROM public.organizations
  WHERE id = org_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'safe'::TEXT, 'Organization not found'::TEXT, 0, 0, false, false;
    RETURN;
  END IF;

  -- Calculate next FDA renewal date (Oct 1 - Dec 31 of next even year)
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  IF current_year % 2 = 0 THEN
    next_even_year := current_year;
  ELSE
    next_even_year := current_year + 1;
  END IF;
  
  fda_renewal_date := make_date(next_even_year, 12, 31);
  days_to_fda := fda_renewal_date - CURRENT_DATE;

  -- Calculate days until agent contract expiry
  IF org.agent_contract_end_date IS NOT NULL THEN
    days_to_agent := org.agent_contract_end_date - CURRENT_DATE;
  ELSE
    days_to_agent := NULL;
  END IF;

  -- CRITICAL LEVEL: FDA expired OR Agent contract expired
  IF org.fda_registration_status = 'expired' OR 
     (org.agent_contract_end_date IS NOT NULL AND org.agent_contract_end_date < CURRENT_DATE) OR
     (org.poa_signed = false) THEN
    level := 'critical';
    message := '🔴 CRITICAL: FDA registration expired or U.S. Agent authorization revoked. Export to FDA is BLOCKED.';
    action_needed := true;
    export_allowed := false;
    
  -- WARNING LEVEL: Within 30 days of expiration
  ELSIF (days_to_fda IS NOT NULL AND days_to_fda <= 30) OR 
        (days_to_agent IS NOT NULL AND days_to_agent <= 30) THEN
    level := 'warning';
    message := '🟡 WARNING: FDA renewal or Agent contract expires within 30 days. Action required soon.';
    action_needed := true;
    export_allowed := true;
    
  -- SAFE LEVEL: All clear
  ELSIF org.fda_registration_status = 'active' AND 
        org.poa_signed = true AND
        (org.agent_contract_end_date IS NULL OR org.agent_contract_end_date > CURRENT_DATE) THEN
    level := 'safe';
    message := '🟢 SAFE: FDA registration active and U.S. Agent authorized. All export features available.';
    action_needed := false;
    export_allowed := true;
  END IF;

  -- Return calculated values
  RETURN QUERY SELECT 
    level,
    message,
    days_to_fda,
    days_to_agent,
    action_needed,
    export_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_agent_alert_level IS 'VEXIM: Calculate alert level based on FDA and Agent contract status';

-- =============================================
-- PART 3: CREATE TRIGGER TO UPDATE ALERT LEVEL
-- =============================================

CREATE OR REPLACE FUNCTION update_organization_alert_level()
RETURNS TRIGGER AS $$
DECLARE
  alert_data RECORD;
BEGIN
  -- Calculate alert level
  SELECT * INTO alert_data
  FROM calculate_agent_alert_level(NEW.id)
  LIMIT 1;

  -- Update organization with calculated alert level
  NEW.alert_level := alert_data.alert_level;
  
  -- Auto-calculate agent contract end date if start date and years are provided
  IF NEW.agent_contract_start_date IS NOT NULL AND NEW.agent_contract_years IS NOT NULL THEN
    NEW.agent_contract_end_date := NEW.agent_contract_start_date + (NEW.agent_contract_years * 365);
  END IF;

  -- Update agent contract status based on dates
  IF NEW.agent_contract_end_date IS NOT NULL THEN
    IF NEW.agent_contract_end_date < CURRENT_DATE THEN
      NEW.agent_contract_status := 'expired';
    ELSIF NEW.agent_contract_end_date - CURRENT_DATE <= 60 THEN
      NEW.agent_contract_status := 'expiring_soon';
    ELSE
      NEW.agent_contract_status := 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_alert_level ON public.organizations;
CREATE TRIGGER trigger_update_alert_level
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_alert_level();

COMMENT ON TRIGGER trigger_update_alert_level ON public.organizations IS 'VEXIM: Auto-update alert level on org changes';

-- =============================================
-- PART 4: CREATE ALERT DASHBOARD VIEW
-- =============================================

CREATE OR REPLACE VIEW public.organization_alert_dashboard AS
SELECT 
  o.id,
  o.name,
  o.organization_type,
  o.fda_registration_number,
  o.fda_registration_status,
  o.agent_contract_end_date,
  o.alert_level,
  calc.alert_message,
  calc.days_until_fda_renewal,
  calc.days_until_agent_expiry,
  calc.action_required,
  calc.can_export_fda,
  -- Agent contract details
  o.us_agent_name,
  o.us_agent_email,
  o.agent_contract_start_date,
  o.agent_contract_years,
  o.agent_contract_status,
  o.agent_auto_renew,
  o.poa_signed,
  o.poa_signed_date,
  -- Renewal recommendations
  CASE 
    WHEN calc.days_until_agent_expiry IS NOT NULL AND calc.days_until_agent_expiry <= 60 
    THEN 'Generate renewal invoice for U.S. Agent contract'
    WHEN calc.days_until_fda_renewal IS NOT NULL AND calc.days_until_fda_renewal <= 90
    THEN 'Prepare FDA renewal documents (Form 3537)'
    ELSE NULL
  END as recommended_action
FROM public.organizations o
CROSS JOIN LATERAL calculate_agent_alert_level(o.id) AS calc;

COMMENT ON VIEW public.organization_alert_dashboard IS 'VEXIM: Complete alert dashboard with FDA and Agent status';

-- =============================================
-- PART 5: HELPER FUNCTIONS
-- =============================================

-- Function to get next FDA renewal date
CREATE OR REPLACE FUNCTION get_next_fda_renewal_date()
RETURNS DATE AS $$
DECLARE
  current_year INTEGER;
  next_even_year INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  IF current_year % 2 = 0 THEN
    next_even_year := current_year;
  ELSE
    next_even_year := current_year + 1;
  END IF;
  
  -- FDA renewal period: October 1 to December 31 of even years
  RETURN make_date(next_even_year, 12, 31);
END;
$$ LANGUAGE plpgsql;

-- Function to check if agent contract needs renewal
CREATE OR REPLACE FUNCTION needs_agent_renewal(org_id UUID, days_threshold INTEGER DEFAULT 60)
RETURNS BOOLEAN AS $$
DECLARE
  org_data RECORD;
BEGIN
  SELECT agent_contract_end_date INTO org_data
  FROM public.organizations
  WHERE id = org_id;
  
  IF org_data.agent_contract_end_date IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN (org_data.agent_contract_end_date - CURRENT_DATE) <= days_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ VEXIM U.S. Agent Alert System Complete';
  RAISE NOTICE '📋 Added agent contract tracking fields';
  RAISE NOTICE '🚨 Created automated alert level calculation';
  RAISE NOTICE '⏰ Implemented FDA renewal deadline logic (even years)';
  RAISE NOTICE '🔔 Created organization_alert_dashboard view';
  RAISE NOTICE '⚡ Ready for UI integration';
END $$;
