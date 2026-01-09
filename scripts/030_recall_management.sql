-- =============================================
-- RECALL MANAGEMENT SYSTEM
-- =============================================
-- Tracks product recalls per FSMA 204 requirements

-- Main recall events table
CREATE TABLE IF NOT EXISTS public.recall_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  recall_number TEXT NOT NULL UNIQUE,
  recall_initiation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recall_type TEXT NOT NULL CHECK (recall_type IN ('voluntary_firm', 'voluntary_fda_request', 'fda_mandated')),
  recall_class TEXT NOT NULL CHECK (recall_class IN ('class_i', 'class_ii', 'class_iii')),
  recall_reason TEXT NOT NULL,
  hazard_description TEXT NOT NULL,
  product_description TEXT,
  affected_lot_codes TEXT[] NOT NULL,
  distribution_pattern TEXT,
  public_notification_required BOOLEAN DEFAULT true,
  recall_status TEXT DEFAULT 'initiated' CHECK (recall_status IN ('initiated', 'in_progress', 'completed', 'terminated')),
  total_units_affected DECIMAL(15, 3) DEFAULT 0,
  total_units_recovered DECIMAL(15, 3) DEFAULT 0,
  recovery_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN total_units_affected > 0 
    THEN (total_units_recovered / total_units_affected * 100)
    ELSE 0 END
  ) STORED,
  initiated_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affected lots tracking
CREATE TABLE IF NOT EXISTS public.recall_affected_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recall_id UUID REFERENCES public.recall_events(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.traceability_lots(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  quantity_produced DECIMAL(15, 3) NOT NULL,
  quantity_recovered DECIMAL(15, 3) DEFAULT 0,
  recovery_status TEXT DEFAULT 'pending' CHECK (recovery_status IN ('pending', 'partial', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recall_id, lot_id)
);

-- Recall communications log
CREATE TABLE IF NOT EXISTS public.recall_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recall_id UUID REFERENCES public.recall_events(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('customer_notification', 'fda_report', 'press_release', 'internal_memo', 'supplier_alert')),
  recipient TEXT NOT NULL,
  sent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  communication_content TEXT,
  confirmation_received BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recall_events_org ON public.recall_events(organization_id);
CREATE INDEX idx_recall_events_status ON public.recall_events(recall_status);
CREATE INDEX idx_recall_events_date ON public.recall_events(recall_initiation_date);
CREATE INDEX idx_recall_affected_lots_recall ON public.recall_affected_lots(recall_id);
CREATE INDEX idx_recall_communications_recall ON public.recall_communications(recall_id);

-- Enable RLS
ALTER TABLE public.recall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_affected_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_communications ENABLE ROW LEVEL SECURITY;

-- Function to get downstream impact for recalls
CREATE OR REPLACE FUNCTION get_recall_downstream_impact(p_lot_codes TEXT[])
RETURNS TABLE (
  contact_organization TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  affected_lots TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    o.name as contact_organization,
    scp.contact_name,
    scp.contact_phone,
    scp.contact_email,
    ARRAY_AGG(DISTINCT cs.lot_code) as affected_lots
  FROM public.cte_shipping cs
  JOIN public.cte_events ce ON cs.cte_event_id = ce.id
  JOIN public.cte_lot_links cll ON cll.cte_event_id = ce.id
  JOIN public.traceability_lots tl ON tl.id = cll.lot_id
  LEFT JOIN public.organizations o ON o.id = cs.recipient_organization_id
  LEFT JOIN public.supply_chain_partners scp ON scp.partner_organization_id = o.id
  WHERE tl.lot_code = ANY(p_lot_codes)
  GROUP BY o.name, scp.contact_name, scp.contact_phone, scp.contact_email;
END;
$$ LANGUAGE plpgsql;
