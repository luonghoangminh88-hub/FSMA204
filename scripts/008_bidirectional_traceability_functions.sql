-- =============================================
-- BIDIRECTIONAL TRACEABILITY FUNCTIONS
-- Phase 1: Priority 1 - Critical Implementation
-- =============================================

-- Function to trace BACKWARD from a lot code (find all sources)
CREATE OR REPLACE FUNCTION trace_backward(
  p_lot_code TEXT,
  p_organization_id UUID
)
RETURNS TABLE (
  level INTEGER,
  lot_id UUID,
  lot_code TEXT,
  product_description TEXT,
  quantity DECIMAL,
  unit_of_measure TEXT,
  status TEXT,
  production_date DATE,
  parent_lot_id UUID,
  parent_lot_code TEXT,
  event_type TEXT,
  event_datetime TIMESTAMPTZ,
  location_name TEXT,
  organization_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE backward_trace AS (
    -- Base case: Start with the target lot
    SELECT
      0 as level,
      tl.id as lot_id,
      tl.lot_code,
      tl.product_description,
      tl.quantity,
      tl.unit_of_measure,
      tl.status,
      tl.production_date,
      tl.parent_lot_id,
      parent_lot.lot_code as parent_lot_code,
      cte.event_type,
      cte.event_datetime,
      loc.location_name,
      org.name as organization_name
    FROM public.traceability_lots tl
    LEFT JOIN public.traceability_lots parent_lot ON tl.parent_lot_id = parent_lot.id
    LEFT JOIN public.cte_lot_links cll ON cll.lot_id = tl.id
    LEFT JOIN public.cte_events cte ON cte.id = cll.cte_event_id
    LEFT JOIN public.locations loc ON cte.location_id = loc.id
    LEFT JOIN public.organizations org ON tl.organization_id = org.id
    WHERE tl.lot_code = p_lot_code 
      AND tl.organization_id = p_organization_id

    UNION ALL

    -- Recursive case: Find parent lots
    SELECT
      bt.level + 1,
      tl.id,
      tl.lot_code,
      tl.product_description,
      tl.quantity,
      tl.unit_of_measure,
      tl.status,
      tl.production_date,
      tl.parent_lot_id,
      parent_lot.lot_code as parent_lot_code,
      cte.event_type,
      cte.event_datetime,
      loc.location_name,
      org.name as organization_name
    FROM public.traceability_lots tl
    INNER JOIN backward_trace bt ON tl.id = bt.parent_lot_id
    LEFT JOIN public.traceability_lots parent_lot ON tl.parent_lot_id = parent_lot.id
    LEFT JOIN public.cte_lot_links cll ON cll.lot_id = tl.id
    LEFT JOIN public.cte_events cte ON cte.id = cll.cte_event_id
    LEFT JOIN public.locations loc ON cte.location_id = loc.id
    LEFT JOIN public.organizations org ON tl.organization_id = org.id
    WHERE tl.organization_id = p_organization_id
  )
  SELECT * FROM backward_trace
  ORDER BY level DESC, event_datetime;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trace FORWARD from a lot code (find all derivatives)
CREATE OR REPLACE FUNCTION trace_forward(
  p_lot_code TEXT,
  p_organization_id UUID
)
RETURNS TABLE (
  level INTEGER,
  lot_id UUID,
  lot_code TEXT,
  product_description TEXT,
  quantity DECIMAL,
  unit_of_measure TEXT,
  status TEXT,
  production_date DATE,
  parent_lot_id UUID,
  parent_lot_code TEXT,
  event_type TEXT,
  event_datetime TIMESTAMPTZ,
  location_name TEXT,
  organization_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE forward_trace AS (
    -- Base case: Start with the source lot
    SELECT
      0 as level,
      tl.id as lot_id,
      tl.lot_code,
      tl.product_description,
      tl.quantity,
      tl.unit_of_measure,
      tl.status,
      tl.production_date,
      tl.parent_lot_id,
      parent_lot.lot_code as parent_lot_code,
      cte.event_type,
      cte.event_datetime,
      loc.location_name,
      org.name as organization_name
    FROM public.traceability_lots tl
    LEFT JOIN public.traceability_lots parent_lot ON tl.parent_lot_id = parent_lot.id
    LEFT JOIN public.cte_lot_links cll ON cll.lot_id = tl.id
    LEFT JOIN public.cte_events cte ON cte.id = cll.cte_event_id
    LEFT JOIN public.locations loc ON cte.location_id = loc.id
    LEFT JOIN public.organizations org ON tl.organization_id = org.id
    WHERE tl.lot_code = p_lot_code 
      AND tl.organization_id = p_organization_id

    UNION ALL

    -- Recursive case: Find child lots
    SELECT
      ft.level + 1,
      tl.id,
      tl.lot_code,
      tl.product_description,
      tl.quantity,
      tl.unit_of_measure,
      tl.status,
      tl.production_date,
      tl.parent_lot_id,
      parent_lot.lot_code as parent_lot_code,
      cte.event_type,
      cte.event_datetime,
      loc.location_name,
      org.name as organization_name
    FROM public.traceability_lots tl
    INNER JOIN forward_trace ft ON tl.parent_lot_id = ft.lot_id
    LEFT JOIN public.traceability_lots parent_lot ON tl.parent_lot_id = parent_lot.id
    LEFT JOIN public.cte_lot_links cll ON cll.lot_id = tl.id
    LEFT JOIN public.cte_events cte ON cte.id = cll.cte_event_id
    LEFT JOIN public.locations loc ON cte.location_id = loc.id
    LEFT JOIN public.organizations org ON tl.organization_id = org.id
    WHERE tl.organization_id = p_organization_id
  )
  SELECT * FROM forward_trace
  ORDER BY level, event_datetime;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get complete traceability chain (bidirectional)
CREATE OR REPLACE FUNCTION trace_full_chain(
  p_lot_code TEXT,
  p_organization_id UUID
)
RETURNS TABLE (
  direction TEXT,
  level INTEGER,
  lot_id UUID,
  lot_code TEXT,
  product_description TEXT,
  quantity DECIMAL,
  unit_of_measure TEXT,
  status TEXT,
  production_date DATE,
  parent_lot_id UUID,
  parent_lot_code TEXT,
  event_type TEXT,
  event_datetime TIMESTAMPTZ,
  location_name TEXT,
  organization_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Backward trace (sources)
  SELECT 
    'backward' as direction,
    *
  FROM trace_backward(p_lot_code, p_organization_id)
  WHERE level > 0
  
  UNION ALL
  
  -- Current lot
  SELECT 
    'current' as direction,
    *
  FROM trace_backward(p_lot_code, p_organization_id)
  WHERE level = 0
  
  UNION ALL
  
  -- Forward trace (derivatives)
  SELECT 
    'forward' as direction,
    *
  FROM trace_forward(p_lot_code, p_organization_id)
  WHERE level > 0
  
  ORDER BY 
    CASE direction 
      WHEN 'backward' THEN 1 
      WHEN 'current' THEN 2 
      WHEN 'forward' THEN 3 
    END,
    level,
    event_datetime;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trace_backward IS 'Traces backward from a lot to find all source lots (ingredients/inputs)';
COMMENT ON FUNCTION trace_forward IS 'Traces forward from a lot to find all derivative lots (outputs)';
COMMENT ON FUNCTION trace_full_chain IS 'Gets complete bidirectional traceability chain for a lot';
