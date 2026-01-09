-- FSMA 204: Shelf Life Management and Recall Management
-- Handles lot disposal, shelf life extensions, and product recalls

-- =============================================
-- SHELF LIFE EXTENSIONS
-- =============================================

-- Track shelf life extension history
CREATE TABLE IF NOT EXISTS public.shelf_life_extensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.traceability_lots(id) ON DELETE CASCADE,
  original_expiration_date DATE NOT NULL,
  new_expiration_date DATE NOT NULL,
  days_extended INTEGER GENERATED ALWAYS AS (new_expiration_date - original_expiration_date) STORED,
  extension_reason TEXT NOT NULL,
  extension_justification TEXT,
  quality_test_results TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LOT DISPOSAL
-- =============================================

-- Track lot disposals (waste/expiration/quality issues)
CREATE TABLE IF NOT EXISTS public.lot_disposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.traceability_lots(id) ON DELETE CASCADE,
  disposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_disposed DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  disposal_reason TEXT NOT NULL CHECK (disposal_reason IN ('expired', 'quality_issue', 'contamination', 'damage', 'customer_return', 'recall', 'other')),
  disposal_method TEXT NOT NULL CHECK (disposal_method IN ('landfill', 'composting', 'incineration', 'animal_feed', 'biogas', 'other')),
  disposal_location TEXT,
  disposal_cost DECIMAL(10, 2),
  notes TEXT,
  photos_urls TEXT[],
  disposed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUCT RECALLS
-- =============================================

-- Main recall events table
CREATE TABLE IF NOT EXISTS public.recall_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  recall_number TEXT UNIQUE NOT NULL, -- Format: ORG-YYYY-NNN
  recall_initiation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recall_type TEXT NOT NULL CHECK (recall_type IN ('voluntary_firm', 'voluntary_fda_request', 'fda_mandated')),
  recall_class TEXT NOT NULL CHECK (recall_class IN ('class_i', 'class_ii', 'class_iii')),
  -- Class I: Dangerous or defective products that could cause serious health problems or death
  -- Class II: Products that might cause temporary health problems or slight threat of serious nature
  -- Class III: Products unlikely to cause adverse health reaction but violate FDA regulations
  recall_reason TEXT NOT NULL,
  hazard_description TEXT NOT NULL,
  product_description TEXT NOT NULL,
  affected_lot_codes TEXT[] NOT NULL,
  recall_status TEXT DEFAULT 'initiated' CHECK (recall_status IN ('initiated', 'in_progress', 'completed', 'terminated')),
  total_units_affected INTEGER,
  total_units_recovered INTEGER,
  recovery_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN total_units_affected > 0 
    THEN (total_units_recovered::DECIMAL / total_units_affected * 100)
    ELSE 0 END
  ) STORED,
  distribution_pattern TEXT, -- States/countries where product was distributed
  public_notification_required BOOLEAN DEFAULT true,
  public_notification_date DATE,
  press_release_url TEXT,
  fda_notification_date DATE,
  fda_contact_name TEXT,
  fda_contact_email TEXT,
  estimated_cost DECIMAL(15, 2),
  completion_date DATE,
  initiated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affected lots in recall
CREATE TABLE IF NOT EXISTS public.recall_affected_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recall_id UUID REFERENCES public.recall_events(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.traceability_lots(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  quantity_produced DECIMAL(15, 3) NOT NULL,
  quantity_recovered DECIMAL(15, 3) DEFAULT 0,
  quantity_outstanding DECIMAL(15, 3) GENERATED ALWAYS AS (quantity_produced - quantity_recovered) STORED,
  recovery_status TEXT DEFAULT 'pending' CHECK (recovery_status IN ('pending', 'partial', 'complete')),
  last_known_location_id UUID REFERENCES public.locations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recall_id, lot_id)
);

-- Downstream impact tracking (who received affected lots)
CREATE TABLE IF NOT EXISTS public.recall_downstream_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recall_id UUID REFERENCES public.recall_events(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.supply_chain_partners(id),
  organization_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notification_date TIMESTAMPTZ,
  notification_method TEXT CHECK (notification_method IN ('email', 'phone', 'fax', 'letter', 'in_person')),
  acknowledgement_received BOOLEAN DEFAULT false,
  acknowledgement_date TIMESTAMPTZ,
  units_shipped_to_contact INTEGER,
  units_returned INTEGER,
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recall effectiveness checks
CREATE TABLE IF NOT EXISTS public.recall_effectiveness_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recall_id UUID REFERENCES public.recall_events(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('level_a', 'level_b', 'level_c', 'level_d', 'level_e')),
  -- Level A: 100% of direct accounts
  -- Level B: Sample of direct accounts + 100% of sub-accounts
  -- Level C: Sample of direct + sample of sub-accounts
  -- Level D: Sample of direct accounts only
  -- Level E: No checks (firm confirms recall effectiveness)
  accounts_contacted INTEGER NOT NULL,
  accounts_responded INTEGER,
  product_found_at_accounts INTEGER,
  product_recovered INTEGER,
  effectiveness_percentage DECIMAL(5, 2),
  conducted_by UUID REFERENCES public.profiles(id),
  findings TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_shelf_extensions_lot ON public.shelf_life_extensions(lot_id);
CREATE INDEX idx_shelf_extensions_org ON public.shelf_life_extensions(organization_id);

CREATE INDEX idx_disposals_lot ON public.lot_disposals(lot_id);
CREATE INDEX idx_disposals_org ON public.lot_disposals(organization_id);
CREATE INDEX idx_disposals_date ON public.lot_disposals(disposal_date);

CREATE INDEX idx_recalls_org ON public.recall_events(organization_id);
CREATE INDEX idx_recalls_status ON public.recall_events(recall_status);
CREATE INDEX idx_recalls_date ON public.recall_events(recall_initiation_date);

CREATE INDEX idx_recall_lots_recall ON public.recall_affected_lots(recall_id);
CREATE INDEX idx_recall_lots_lot ON public.recall_affected_lots(lot_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to extend shelf life
CREATE OR REPLACE FUNCTION extend_lot_shelf_life(
  p_lot_id UUID,
  p_new_expiration_date DATE,
  p_reason TEXT,
  p_justification TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_lot_record RECORD;
  v_extension_id UUID;
BEGIN
  -- Get current lot info
  SELECT * INTO v_lot_record
  FROM traceability_lots
  WHERE id = p_lot_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lot not found');
  END IF;

  IF v_lot_record.status NOT IN ('active', 'in_transit', 'received') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot extend shelf life for lots with status: ' || v_lot_record.status);
  END IF;

  IF p_new_expiration_date <= v_lot_record.expiration_date THEN
    RETURN json_build_object('success', false, 'error', 'New expiration date must be after current expiration date');
  END IF;

  -- Record extension
  INSERT INTO shelf_life_extensions (
    organization_id, lot_id, original_expiration_date, new_expiration_date,
    extension_reason, extension_justification, approved_by, approved_at, created_by
  ) VALUES (
    v_lot_record.organization_id, p_lot_id, v_lot_record.expiration_date, p_new_expiration_date,
    p_reason, p_justification, p_user_id, NOW(), p_user_id
  ) RETURNING id INTO v_extension_id;

  -- Update lot expiration date
  UPDATE traceability_lots
  SET expiration_date = p_new_expiration_date, updated_at = NOW()
  WHERE id = p_lot_id;

  RETURN json_build_object(
    'success', true,
    'extension_id', v_extension_id,
    'old_date', v_lot_record.expiration_date,
    'new_date', p_new_expiration_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to dispose lot
CREATE OR REPLACE FUNCTION dispose_lot(
  p_lot_id UUID,
  p_quantity DECIMAL,
  p_reason TEXT,
  p_method TEXT,
  p_notes TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_lot_record RECORD;
  v_disposal_id UUID;
BEGIN
  SELECT * INTO v_lot_record
  FROM traceability_lots
  WHERE id = p_lot_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lot not found');
  END IF;

  IF p_quantity > v_lot_record.quantity THEN
    RETURN json_build_object('success', false, 'error', 'Disposal quantity exceeds lot quantity');
  END IF;

  -- Record disposal
  INSERT INTO lot_disposals (
    organization_id, lot_id, quantity_disposed, unit_of_measure,
    disposal_reason, disposal_method, notes, disposed_by
  ) VALUES (
    v_lot_record.organization_id, p_lot_id, p_quantity, v_lot_record.unit_of_measure,
    p_reason, p_method, p_notes, p_user_id
  ) RETURNING id INTO v_disposal_id;

  -- Update lot status if fully disposed
  IF p_quantity >= v_lot_record.quantity THEN
    UPDATE traceability_lots
    SET status = 'disposed', updated_at = NOW()
    WHERE id = p_lot_id;
  ELSE
    -- Partial disposal: reduce quantity
    UPDATE traceability_lots
    SET quantity = quantity - p_quantity, updated_at = NOW()
    WHERE id = p_lot_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'disposal_id', v_disposal_id,
    'quantity_disposed', p_quantity,
    'lot_fully_disposed', p_quantity >= v_lot_record.quantity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get downstream impact for recall
CREATE OR REPLACE FUNCTION get_recall_downstream_impact(p_lot_codes TEXT[])
RETURNS TABLE (
  downstream_org_id UUID,
  downstream_org_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  lot_code TEXT,
  quantity_shipped DECIMAL,
  ship_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.recipient_organization_id,
    o.name,
    sc.contact_name,
    sc.contact_email,
    sc.contact_phone,
    tl.lot_code,
    s.quantity_shipped,
    s.ship_date
  FROM cte_shipping s
  JOIN cte_lot_links cll ON cll.cte_event_id = s.cte_event_id
  JOIN traceability_lots tl ON tl.id = cll.lot_id
  LEFT JOIN organizations o ON o.id = s.recipient_organization_id
  LEFT JOIN supply_chain_partners sc ON sc.partner_organization_id = s.recipient_organization_id
  WHERE tl.lot_code = ANY(p_lot_codes)
  ORDER BY s.ship_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.shelf_life_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_disposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_affected_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_downstream_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_effectiveness_checks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.recall_events IS 'FSMA 204: Product recall management and tracking';
COMMENT ON TABLE public.shelf_life_extensions IS 'Track shelf life extensions with justification';
COMMENT ON TABLE public.lot_disposals IS 'Track waste and disposal of lots';
