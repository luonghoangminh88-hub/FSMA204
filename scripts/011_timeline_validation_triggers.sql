-- =============================================
-- PHASE 2: TIMELINE VALIDATION TRIGGERS
-- Prevent out-of-order CTE events and validate chronological consistency
-- =============================================

-- Function to validate event timeline order
CREATE OR REPLACE FUNCTION validate_cte_timeline()
RETURNS TRIGGER AS $$
DECLARE
  parent_lot_production_date DATE;
  parent_lot_latest_event_date TIMESTAMPTZ;
  transformation_input_max_date TIMESTAMPTZ;
BEGIN
  -- RULE 1: Transformation events must occur AFTER all input lot events
  IF NEW.event_type = 'transformation' THEN
    -- Get the latest event date from all input lots
    SELECT MAX(ce.event_datetime)
    INTO transformation_input_max_date
    FROM public.transformation_inputs ti
    JOIN public.cte_events ce ON ti.input_lot_id IN (
      SELECT lot_id FROM public.cte_lot_links WHERE cte_event_id = ce.id
    )
    WHERE ti.transformation_id IN (
      SELECT id FROM public.cte_transformation WHERE cte_event_id = NEW.id
    );
    
    IF transformation_input_max_date IS NOT NULL AND NEW.event_datetime < transformation_input_max_date THEN
      RAISE EXCEPTION 'Transformation event cannot occur before input lot events. Latest input event: %, Current event: %',
        transformation_input_max_date, NEW.event_datetime;
    END IF;
  END IF;

  -- RULE 2: Cooling must happen after harvesting
  IF NEW.event_type = 'cooling' THEN
    -- Find related harvesting event through lot linkage
    SELECT MAX(ce.event_datetime)
    INTO parent_lot_latest_event_date
    FROM public.cte_lot_links cll
    JOIN public.cte_events ce ON cll.cte_event_id = ce.id
    WHERE cll.lot_id IN (
      SELECT lot_id FROM public.cte_lot_links WHERE cte_event_id = NEW.id
    )
    AND ce.event_type = 'harvesting'
    AND ce.event_datetime < NEW.event_datetime;
    
    IF parent_lot_latest_event_date IS NULL THEN
      RAISE WARNING 'Cooling event should have a preceding harvesting event';
    END IF;
  END IF;

  -- RULE 3: Initial packing must happen after harvesting
  IF NEW.event_type = 'initial_packing' THEN
    SELECT MAX(ce.event_datetime)
    INTO parent_lot_latest_event_date
    FROM public.cte_lot_links cll
    JOIN public.cte_events ce ON cll.cte_event_id = ce.id
    WHERE cll.lot_id IN (
      SELECT lot_id FROM public.cte_lot_links WHERE cte_event_id = NEW.id
    )
    AND ce.event_type IN ('harvesting', 'cooling')
    AND ce.event_datetime < NEW.event_datetime;
    
    IF parent_lot_latest_event_date IS NULL THEN
      RAISE WARNING 'Initial packing event should have a preceding harvesting/cooling event';
    END IF;
  END IF;

  -- RULE 4: Receiving must happen after shipping
  IF NEW.event_type = 'receiving' THEN
    -- Check if there's a corresponding shipping event
    SELECT MAX(ce.event_datetime)
    INTO parent_lot_latest_event_date
    FROM public.cte_lot_links cll
    JOIN public.cte_events ce ON cll.cte_event_id = ce.id
    WHERE cll.lot_id IN (
      SELECT lot_id FROM public.cte_lot_links WHERE cte_event_id = NEW.id
    )
    AND ce.event_type = 'shipping'
    AND ce.event_datetime < NEW.event_datetime;
    
    IF parent_lot_latest_event_date IS NOT NULL AND NEW.event_datetime < parent_lot_latest_event_date THEN
      RAISE EXCEPTION 'Receiving event cannot occur before shipping event. Ship date: %, Receive date: %',
        parent_lot_latest_event_date, NEW.event_datetime;
    END IF;
  END IF;

  -- RULE 5: Validate against lot production date
  IF NEW.event_type IN ('cooling', 'initial_packing', 'transformation', 'shipping') THEN
    SELECT MIN(tl.production_date)
    INTO parent_lot_production_date
    FROM public.cte_lot_links cll
    JOIN public.traceability_lots tl ON cll.lot_id = tl.id
    WHERE cll.cte_event_id = NEW.id;
    
    IF parent_lot_production_date IS NOT NULL AND DATE(NEW.event_datetime) < parent_lot_production_date THEN
      RAISE EXCEPTION 'Event date (%) cannot be before lot production date (%)',
        DATE(NEW.event_datetime), parent_lot_production_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timeline validation
DROP TRIGGER IF EXISTS validate_timeline_before_insert ON public.cte_events;
CREATE TRIGGER validate_timeline_before_insert
  BEFORE INSERT ON public.cte_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_cte_timeline();

DROP TRIGGER IF EXISTS validate_timeline_before_update ON public.cte_events;
CREATE TRIGGER validate_timeline_before_update
  BEFORE UPDATE OF event_datetime ON public.cte_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_cte_timeline();

-- =============================================
-- SHELF LIFE & EXPIRATION VALIDATION
-- =============================================

-- Function to calculate and warn about expiration
CREATE OR REPLACE FUNCTION check_lot_expiration()
RETURNS TRIGGER AS $$
DECLARE
  food_shelf_life INTEGER;
  calculated_expiration DATE;
BEGIN
  -- Get shelf life from food definition
  IF NEW.food_id IS NOT NULL THEN
    SELECT shelf_life_days
    INTO food_shelf_life
    FROM public.ftl_foods
    WHERE id = NEW.food_id;
    
    -- Auto-calculate expiration if production date exists
    IF NEW.production_date IS NOT NULL AND food_shelf_life IS NOT NULL THEN
      calculated_expiration := NEW.production_date + (food_shelf_life || ' days')::INTERVAL;
      
      -- Set expiration if not provided
      IF NEW.expiration_date IS NULL THEN
        NEW.expiration_date := calculated_expiration;
        RAISE NOTICE 'Auto-calculated expiration date: % (shelf life: % days)', calculated_expiration, food_shelf_life;
      END IF;
      
      -- Warn if expiration is beyond shelf life
      IF NEW.expiration_date > calculated_expiration THEN
        RAISE WARNING 'Expiration date (%) exceeds recommended shelf life. Calculated expiration: %',
          NEW.expiration_date, calculated_expiration;
      END IF;
    END IF;
  END IF;

  -- Warn if lot is expired
  IF NEW.expiration_date IS NOT NULL AND NEW.expiration_date < CURRENT_DATE THEN
    RAISE WARNING 'Lot % is expired. Expiration date: %', NEW.lot_code, NEW.expiration_date;
  END IF;

  -- Warn if approaching expiration (within 7 days)
  IF NEW.expiration_date IS NOT NULL AND NEW.expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days') THEN
    RAISE NOTICE 'Lot % expires soon: %', NEW.lot_code, NEW.expiration_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expiration validation
DROP TRIGGER IF EXISTS check_expiration_on_lot ON public.traceability_lots;
CREATE TRIGGER check_expiration_on_lot
  BEFORE INSERT OR UPDATE ON public.traceability_lots
  FOR EACH ROW
  EXECUTE FUNCTION check_lot_expiration();

-- Create view for expired/expiring lots
CREATE OR REPLACE VIEW public.lot_expiration_alerts AS
SELECT
  tl.id,
  tl.organization_id, -- Added organization_id for filtering
  tl.lot_code,
  tl.product_description,
  tl.production_date,
  tl.expiration_date,
  tl.quantity,
  tl.unit_of_measure,
  tl.status,
  o.name as organization_name,
  CASE
    WHEN tl.expiration_date < CURRENT_DATE THEN 'expired'
    WHEN tl.expiration_date <= (CURRENT_DATE + INTERVAL '7 days') THEN 'expiring_soon'
    WHEN tl.expiration_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring_month'
    ELSE 'ok'
  END as expiration_status,
  (tl.expiration_date - CURRENT_DATE) as days_until_expiration
FROM public.traceability_lots tl
JOIN public.organizations o ON tl.organization_id = o.id
WHERE tl.expiration_date IS NOT NULL
  AND tl.status IN ('active', 'in_transit', 'received')
ORDER BY tl.expiration_date ASC;

COMMENT ON VIEW public.lot_expiration_alerts IS 'Shows lots that are expired or expiring soon for inventory management';
