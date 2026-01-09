-- =============================================
-- PHASE 2: SUPPLY CHAIN PARTNER TRACKING
-- Link partners to CTE events for complete traceability
-- =============================================

-- Add partner tracking to shipping events
ALTER TABLE public.cte_shipping
ADD COLUMN IF NOT EXISTS carrier_partner_id UUID REFERENCES public.supply_chain_partners(id),
ADD COLUMN IF NOT EXISTS recipient_partner_id UUID REFERENCES public.supply_chain_partners(id);

COMMENT ON COLUMN public.cte_shipping.carrier_partner_id IS 'Supply chain partner acting as carrier/transporter';
COMMENT ON COLUMN public.cte_shipping.recipient_partner_id IS 'Supply chain partner receiving the shipment';

-- Add partner tracking to receiving events
ALTER TABLE public.cte_receiving
ADD COLUMN IF NOT EXISTS sender_partner_id UUID REFERENCES public.supply_chain_partners(id);

COMMENT ON COLUMN public.cte_receiving.sender_partner_id IS 'Supply chain partner who sent the product';

-- Add partner tracking to first receiver events
ALTER TABLE public.cte_first_receiver
ADD COLUMN IF NOT EXISTS vessel_owner_partner_id UUID REFERENCES public.supply_chain_partners(id);

COMMENT ON COLUMN public.cte_first_receiver.vessel_owner_partner_id IS 'Partner who owns/operates the fishing vessel';

-- Create indexes for partner lookups
CREATE INDEX IF NOT EXISTS idx_shipping_carrier_partner ON public.cte_shipping(carrier_partner_id);
CREATE INDEX IF NOT EXISTS idx_shipping_recipient_partner ON public.cte_shipping(recipient_partner_id);
CREATE INDEX IF NOT EXISTS idx_receiving_sender_partner ON public.cte_receiving(sender_partner_id);
CREATE INDEX IF NOT EXISTS idx_first_receiver_vessel_partner ON public.cte_first_receiver(vessel_owner_partner_id);

-- View: Partner involvement in lot traceability
CREATE OR REPLACE VIEW public.lot_partner_chain AS
SELECT DISTINCT
  tl.id as lot_id,
  tl.lot_code,
  tl.product_description,
  ce.event_type,
  ce.event_datetime,
  CASE
    WHEN ce.event_type = 'shipping' AND cs.carrier_partner_id IS NOT NULL THEN cs.carrier_partner_id
    WHEN ce.event_type = 'shipping' AND cs.recipient_partner_id IS NOT NULL THEN cs.recipient_partner_id
    WHEN ce.event_type = 'receiving' AND cr.sender_partner_id IS NOT NULL THEN cr.sender_partner_id
    WHEN ce.event_type = 'first_receiver' AND cfr.vessel_owner_partner_id IS NOT NULL THEN cfr.vessel_owner_partner_id
    ELSE NULL
  END as partner_id,
  CASE
    WHEN ce.event_type = 'shipping' AND cs.carrier_partner_id IS NOT NULL THEN 'carrier'
    WHEN ce.event_type = 'shipping' AND cs.recipient_partner_id IS NOT NULL THEN 'recipient'
    WHEN ce.event_type = 'receiving' THEN 'sender'
    WHEN ce.event_type = 'first_receiver' THEN 'vessel_owner'
    ELSE NULL
  END as partner_role,
  scp.partner_name,
  scp.partner_type,
  scp.contact_name,
  scp.contact_phone,
  scp.contact_email
FROM public.traceability_lots tl
JOIN public.cte_lot_links cll ON tl.id = cll.lot_id
JOIN public.cte_events ce ON cll.cte_event_id = ce.id
LEFT JOIN public.cte_shipping cs ON ce.id = cs.cte_event_id
LEFT JOIN public.cte_receiving cr ON ce.id = cr.cte_event_id
LEFT JOIN public.cte_first_receiver cfr ON ce.id = cfr.cte_event_id
LEFT JOIN public.supply_chain_partners scp ON scp.id IN (
  cs.carrier_partner_id,
  cs.recipient_partner_id,
  cr.sender_partner_id,
  cfr.vessel_owner_partner_id
)
WHERE scp.id IS NOT NULL
ORDER BY tl.lot_code, ce.event_datetime;

COMMENT ON VIEW public.lot_partner_chain IS 'Shows all supply chain partners involved in each lot''s journey';

-- Function to get all partners for a specific lot
CREATE OR REPLACE FUNCTION get_lot_partners(p_lot_code TEXT)
RETURNS TABLE (
  partner_name TEXT,
  partner_role TEXT,
  partner_type TEXT,
  event_type TEXT,
  event_date TIMESTAMPTZ,
  contact_name TEXT,
  contact_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lpc.partner_name,
    lpc.partner_role,
    lpc.partner_type,
    lpc.event_type,
    lpc.event_datetime,
    lpc.contact_name,
    lpc.contact_phone
  FROM public.lot_partner_chain lpc
  WHERE lpc.lot_code = p_lot_code
  ORDER BY lpc.event_datetime;
END;
$$ LANGUAGE plpgsql;

-- Function to trace all lots handled by a specific partner
CREATE OR REPLACE FUNCTION get_partner_lots(p_partner_id UUID)
RETURNS TABLE (
  lot_code TEXT,
  product_description TEXT,
  event_type TEXT,
  event_datetime TIMESTAMPTZ,
  partner_role TEXT,
  quantity DECIMAL,
  unit_of_measure TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lpc.lot_code,
    lpc.product_description,
    lpc.event_type,
    lpc.event_datetime,
    lpc.partner_role,
    cll.quantity,
    cll.unit_of_measure
  FROM public.lot_partner_chain lpc
  JOIN public.cte_lot_links cll ON lpc.lot_id = cll.lot_id
  WHERE lpc.partner_id = p_partner_id
  ORDER BY lpc.event_datetime DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_lot_partners IS 'Get all supply chain partners involved with a specific lot';
COMMENT ON FUNCTION get_partner_lots IS 'Get all lots handled by a specific supply chain partner';

-- Validation function to ensure partner relationships are logical
CREATE OR REPLACE FUNCTION validate_partner_assignment()
RETURNS TRIGGER AS $$
DECLARE
  partner_org_id UUID;
  event_org_id UUID;
BEGIN
  -- Get event organization
  SELECT organization_id INTO event_org_id
  FROM public.cte_events
  WHERE id = NEW.cte_event_id;

  -- For shipping events, validate carrier and recipient partners
  IF TG_TABLE_NAME = 'cte_shipping' THEN
    -- Carrier should be partner of type 'carrier'
    IF NEW.carrier_partner_id IS NOT NULL THEN
      SELECT organization_id INTO partner_org_id
      FROM public.supply_chain_partners
      WHERE id = NEW.carrier_partner_id
        AND partner_type = 'carrier'
        AND is_active = true;
      
      IF partner_org_id IS NULL THEN
        RAISE WARNING 'Carrier partner (%) should have partner_type = "carrier" and be active', NEW.carrier_partner_id;
      END IF;
    END IF;

    -- Recipient should be partner of type 'customer'
    IF NEW.recipient_partner_id IS NOT NULL THEN
      SELECT organization_id INTO partner_org_id
      FROM public.supply_chain_partners
      WHERE id = NEW.recipient_partner_id
        AND is_active = true;
      
      IF partner_org_id IS NULL THEN
        RAISE WARNING 'Recipient partner (%) is not active', NEW.recipient_partner_id;
      END IF;
    END IF;
  END IF;

  -- For receiving events, validate sender partner
  IF TG_TABLE_NAME = 'cte_receiving' THEN
    IF NEW.sender_partner_id IS NOT NULL THEN
      SELECT organization_id INTO partner_org_id
      FROM public.supply_chain_partners
      WHERE id = NEW.sender_partner_id
        AND partner_type = 'supplier'
        AND is_active = true;
      
      IF partner_org_id IS NULL THEN
        RAISE WARNING 'Sender partner (%) should have partner_type = "supplier" and be active', NEW.sender_partner_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for partner validation
DROP TRIGGER IF EXISTS validate_shipping_partners ON public.cte_shipping;
CREATE TRIGGER validate_shipping_partners
  BEFORE INSERT OR UPDATE ON public.cte_shipping
  FOR EACH ROW
  EXECUTE FUNCTION validate_partner_assignment();

DROP TRIGGER IF EXISTS validate_receiving_partners ON public.cte_receiving;
CREATE TRIGGER validate_receiving_partners
  BEFORE INSERT OR UPDATE ON public.cte_receiving
  FOR EACH ROW
  EXECUTE FUNCTION validate_partner_assignment();
