-- VEXIM U.S. Agent & Alert System - FIXED VERSION
-- Purpose: Add agent contract tracking and automated alert calculations
-- Version: 2.0 - Fixed critical alert logic to avoid false positives

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
-- PART 2: CREATE ALERT CALCULATION FUNCTION (FIXED)
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

  -- Fixed critical alert logic - only trigger if ACTUALLY expired
  -- CRITICAL LEVEL: FDA expired OR Agent contract expired (past date)
  IF org.fda_registration_status = 'expired' OR 
     (org.agent_contract_end_date IS NOT NULL AND org.agent_contract_end_date < CURRENT_DATE) THEN
    level := 'critical';
    message := 'NGUY CẤP: Đăng ký FDA đã hết hạn hoặc hợp đồng U.S. Agent đã bị thu hồi. Xuất khẩu FDA bị CHẶN.';
    action_needed := true;
    export_allowed := false;
    
  -- WARNING LEVEL: Within 60 days of expiration OR PoA not signed
  ELSIF (days_to_fda IS NOT NULL AND days_to_fda <= 60) OR 
        (days_to_agent IS NOT NULL AND days_to_agent <= 60) OR
        (org.fda_registration_status = 'active' AND org.poa_signed = false) THEN
    level := 'warning';
    
    -- Specific message based on issue
    IF org.poa_signed = false THEN
      message := 'CẢNH BÁO: Giấy ủy quyền (PoA) chưa được ký. Vui lòng hoàn tất để kích hoạt đầy đủ chức năng.';
    ELSE
      message := 'CẢNH BÁO: Đăng ký FDA hoặc hợp đồng Agent sắp hết hạn trong vòng 60 ngày. Cần hành động sớm.';
    END IF;
    
    action_needed := true;
    export_allowed := true;
    
  -- SAFE LEVEL: All clear
  ELSIF org.fda_registration_status = 'active' AND 
        (org.agent_contract_end_date IS NULL OR org.agent_contract_end_date > CURRENT_DATE + INTERVAL '60 days') THEN
    level := 'safe';
    message := 'AN TOÀN: Đăng ký FDA đang hoạt động và U.S. Agent được ủy quyền. Tất cả tính năng xuất khẩu khả dụng.';
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

COMMENT ON FUNCTION calculate_agent_alert_level IS 'VEXIM: Calculate alert level based on FDA and Agent contract status - FIXED v2';


-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_alert_level ON public.organizations;
CREATE TRIGGER trigger_update_alert_level
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_alert_level();

-- Recreate view
DROP VIEW IF EXISTS public.organization_alert_dashboard;
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
    THEN 'Tạo hóa đơn gia hạn cho hợp đồng U.S. Agent'
    WHEN calc.days_until_fda_renewal IS NOT NULL AND calc.days_until_fda_renewal <= 90
    THEN 'Chuẩn bị tài liệu gia hạn FDA (Form 3537)'
    WHEN o.poa_signed = false
    THEN 'Hoàn tất ký Giấy ủy quyền (Power of Attorney)'
    ELSE NULL
  END as recommended_action
FROM public.organizations o
CROSS JOIN LATERAL calculate_agent_alert_level(o.id) AS calc;

COMMENT ON VIEW public.organization_alert_dashboard IS 'VEXIM: Complete alert dashboard with FDA and Agent status - FIXED v2';

DO $$
BEGIN
  RAISE NOTICE '✅ VEXIM Alert System v2.0 - FIXED';
  RAISE NOTICE '🔧 Fixed critical alert logic - only triggers when ACTUALLY expired';
  RAISE NOTICE '📋 PoA not signed = WARNING (not critical)';
  RAISE NOTICE '⏰ 60-day warning window for renewals';
END $$;
