-- VEXIM FDA COMPLIANCE v2.2: "Mở ở Đầu vào, Kiểm soát ở Đầu ra"
-- Phase 1: Database Foundation Migration
-- Purpose: Add FDA registration fields as NULLABLE to support flexible SaaS model

-- =============================================
-- PART 1: ADD FDA FIELDS TO ORGANIZATIONS
-- =============================================

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS fda_registration_number TEXT NULL,
ADD COLUMN IF NOT EXISTS fda_registration_status TEXT NULL CHECK (fda_registration_status IN ('active', 'inactive', 'pending', 'expired')),
ADD COLUMN IF NOT EXISTS fda_registration_date DATE NULL,
ADD COLUMN IF NOT EXISTS fda_facility_type TEXT NULL CHECK (fda_facility_type IN ('domestic', 'foreign')),
ADD COLUMN IF NOT EXISTS duns_number TEXT NULL,
ADD COLUMN IF NOT EXISTS us_agent_name TEXT NULL,
ADD COLUMN IF NOT EXISTS us_agent_company TEXT NULL,
ADD COLUMN IF NOT EXISTS us_agent_address TEXT NULL,
ADD COLUMN IF NOT EXISTS us_agent_city TEXT NULL,
ADD COLUMN IF NOT EXISTS us_agent_state TEXT NULL,
ADD COLUMN IF NOT EXISTS us_agent_postal_code TEXT NULL,
ADD COLUMN IF NOT EXISTS us_agent_phone TEXT NULL,
ADD COLUMN IF NOT EXISTS us_agent_email TEXT NULL,
ADD COLUMN IF NOT EXISTS poa_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS poa_signed_date DATE NULL,
ADD COLUMN IF NOT EXISTS poa_document_url TEXT NULL,
ADD COLUMN IF NOT EXISTS parent_company_name TEXT NULL,
ADD COLUMN IF NOT EXISTS parent_company_duns TEXT NULL;

-- Add comment explaining VEXIM philosophy
COMMENT ON COLUMN public.organizations.fda_registration_number IS 'VEXIM v2.2: NULLABLE - allows domestic-only users. Only required for USA exports.';
COMMENT ON COLUMN public.organizations.poa_signed IS 'VEXIM v2.2: Required for FDA exports but not for lot creation';

-- =============================================
-- PART 2: ADD EXPORT TRACKING TO LOTS
-- =============================================

ALTER TABLE public.traceability_lots
ADD COLUMN IF NOT EXISTS last_exported_standard VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS last_exported_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS export_count_internal INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS export_count_fda INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS export_count_usa_traceability INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_lots_export_standard ON public.traceability_lots(last_exported_standard);
CREATE INDEX IF NOT EXISTS idx_lots_last_exported ON public.traceability_lots(last_exported_at);

-- =============================================
-- PART 3: CREATE EXPORT HISTORY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.export_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  lot_codes TEXT[] NOT NULL,
  export_type TEXT NOT NULL CHECK (export_type IN ('INTERNAL', 'FDA_3537', 'USA_TRACEABILITY')),
  export_format TEXT NOT NULL CHECK (export_format IN ('PDF', 'EXCEL', 'XML', 'JSON')),
  exported_by UUID REFERENCES public.profiles(id),
  file_url TEXT,
  file_size_bytes INTEGER,
  validation_passed BOOLEAN DEFAULT true,
  validation_warnings JSONB,
  validation_errors JSONB,
  export_metadata JSONB, -- Additional metadata like filters, date ranges, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_export_history_org ON public.export_history(organization_id);
CREATE INDEX idx_export_history_type ON public.export_history(export_type);
CREATE INDEX idx_export_history_created ON public.export_history(created_at DESC);

ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.export_history IS 'VEXIM v2.2: Audit trail for all export actions, tracks validation results';

-- =============================================
-- PART 4: CREATE FDA COMPLIANCE SCORING VIEW
-- =============================================

CREATE OR REPLACE VIEW public.fda_compliance_readiness AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  
  -- Legal Compliance Checks (FDA Registration)
  CASE WHEN o.fda_registration_number IS NOT NULL THEN 1 ELSE 0 END as has_fda_number,
  CASE WHEN o.fda_registration_status = 'active' THEN 1 ELSE 0 END as is_fda_active,
  CASE WHEN o.poa_signed = true THEN 1 ELSE 0 END as has_poa,
  CASE WHEN o.us_agent_name IS NOT NULL THEN 1 ELSE 0 END as has_us_agent_name,
  CASE WHEN o.us_agent_email IS NOT NULL THEN 1 ELSE 0 END as has_us_agent_email,
  CASE WHEN o.us_agent_phone IS NOT NULL THEN 1 ELSE 0 END as has_us_agent_phone,
  
  -- Calculate Legal Readiness Score (0-100)
  (
    (CASE WHEN o.fda_registration_number IS NOT NULL THEN 25 ELSE 0 END) +
    (CASE WHEN o.fda_registration_status = 'active' THEN 25 ELSE 0 END) +
    (CASE WHEN o.poa_signed = true THEN 20 ELSE 0 END) +
    (CASE WHEN o.us_agent_name IS NOT NULL THEN 10 ELSE 0 END) +
    (CASE WHEN o.us_agent_email IS NOT NULL THEN 10 ELSE 0 END) +
    (CASE WHEN o.us_agent_phone IS NOT NULL THEN 10 ELSE 0 END)
  ) as legal_readiness_score,
  
  -- Can export FDA?
  CASE 
    WHEN o.fda_registration_number IS NOT NULL 
      AND o.fda_registration_status = 'active'
      AND o.poa_signed = true
      AND o.us_agent_name IS NOT NULL
      AND o.us_agent_email IS NOT NULL
      AND o.us_agent_phone IS NOT NULL
    THEN true 
    ELSE false 
  END as can_export_fda,
  
  -- Missing fields array
  ARRAY_REMOVE(ARRAY[
    CASE WHEN o.fda_registration_number IS NULL THEN 'FDA Registration Number' END,
    CASE WHEN o.fda_registration_status != 'active' THEN 'Active FDA Status' END,
    CASE WHEN o.poa_signed != true THEN 'Power of Attorney' END,
    CASE WHEN o.us_agent_name IS NULL THEN 'U.S. Agent Name' END,
    CASE WHEN o.us_agent_email IS NULL THEN 'U.S. Agent Email' END,
    CASE WHEN o.us_agent_phone IS NULL THEN 'U.S. Agent Phone' END
  ], NULL) as missing_fields

FROM public.organizations o;

COMMENT ON VIEW public.fda_compliance_readiness IS 'VEXIM v2.2: Calculates legal readiness for FDA exports without blocking data entry';

-- =============================================
-- PART 5: RLS POLICIES FOR EXPORT HISTORY
-- =============================================

-- Users can view their own org's export history
CREATE POLICY export_history_select_own_org ON public.export_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only org_admin and managers can create export records
CREATE POLICY export_history_insert_managers ON public.export_history
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('org_admin', 'manager', 'system_admin')
    )
  );

-- =============================================
-- PART 6: HELPER FUNCTIONS
-- =============================================

-- Function to get missing FDA fields for an organization
CREATE OR REPLACE FUNCTION get_fda_missing_fields(org_id UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN (
    SELECT missing_fields 
    FROM public.fda_compliance_readiness 
    WHERE organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if organization can export to FDA
CREATE OR REPLACE FUNCTION can_export_to_fda(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT can_export_fda 
    FROM public.fda_compliance_readiness 
    WHERE organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_export_to_fda IS 'VEXIM v2.2: Check if org meets FDA export requirements';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ VEXIM FDA Compliance v2.2 Migration Complete';
  RAISE NOTICE '📋 Added FDA fields to organizations (all NULLABLE)';
  RAISE NOTICE '📊 Created export_history table for audit trail';
  RAISE NOTICE '🎯 Created fda_compliance_readiness view for scoring';
  RAISE NOTICE '🔒 Applied RLS policies for export history';
  RAISE NOTICE '⚡ Ready for Phase 2: Core Validation Logic';
END $$;
