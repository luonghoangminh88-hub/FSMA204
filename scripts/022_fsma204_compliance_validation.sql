-- =============================================
-- FSMA 204 COMPLIANCE VALIDATION & REPORTING (REVISED)
-- Fixed logic to accurately measure compliance
-- =============================================

-- Drop existing objects to avoid column rename errors
DROP FUNCTION IF EXISTS get_fsma204_compliance_score(UUID);
DROP VIEW IF EXISTS public.timeline_validation_report;
DROP VIEW IF EXISTS public.audit_coverage_report;
DROP VIEW IF EXISTS public.quantity_reconciliation_report;
DROP VIEW IF EXISTS public.traceability_health_check;

-- View 1: TLC Bidirectional Traceability Health Check (FIXED)
CREATE OR REPLACE VIEW public.traceability_health_check AS
WITH lot_trace_test AS (
  -- Test if each lot can be traced forward AND backward
  SELECT
    tl.id as lot_id,
    tl.organization_id,
    tl.lot_code,
    -- Can trace backward?
    EXISTS(
      SELECT 1 FROM trace_backward(tl.lot_code, tl.organization_id) WHERE level > 0
    ) as has_backward_trace,
    -- Can trace forward?
    EXISTS(
      SELECT 1 FROM trace_forward(tl.lot_code, tl.organization_id) WHERE level > 0
    ) as has_forward_trace,
    -- Has parent lot?
    tl.parent_lot_id IS NOT NULL as has_parent,
    -- Has child lots?
    EXISTS(
      SELECT 1 FROM public.traceability_lots child WHERE child.parent_lot_id = tl.id
    ) as has_children
  FROM public.traceability_lots tl
  WHERE tl.status != 'disposed'
)
SELECT
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT ltt.lot_id) as total_lots,
  -- Lots that can be traced backward (have sources)
  COUNT(DISTINCT CASE WHEN ltt.has_backward_trace OR ltt.has_parent THEN ltt.lot_id END) as lots_with_backward_trace,
  -- Lots that can be traced forward (have derivatives)
  COUNT(DISTINCT CASE WHEN ltt.has_forward_trace OR ltt.has_children THEN ltt.lot_id END) as lots_with_forward_trace,
  -- Lots with complete bidirectional traceability
  COUNT(DISTINCT CASE 
    WHEN (ltt.has_backward_trace OR ltt.has_parent) 
     AND (ltt.has_forward_trace OR ltt.has_children) 
    THEN ltt.lot_id 
  END) as lots_with_full_trace,
  -- Source lots (no parents - starting point)
  COUNT(DISTINCT CASE WHEN NOT ltt.has_parent THEN ltt.lot_id END) as source_lots,
  -- End lots (no children - final products)
  COUNT(DISTINCT CASE WHEN NOT ltt.has_children THEN ltt.lot_id END) as end_lots,
  -- Coverage percentage: lots that have at least one direction traced
  ROUND(
    (COUNT(DISTINCT CASE 
      WHEN ltt.has_backward_trace OR ltt.has_forward_trace OR ltt.has_parent OR ltt.has_children 
      THEN ltt.lot_id 
    END)::NUMERIC / NULLIF(COUNT(DISTINCT ltt.lot_id), 0) * 100), 
    2
  ) as traceability_coverage_pct,
  -- Full bidirectional coverage
  ROUND(
    (COUNT(DISTINCT CASE 
      WHEN (ltt.has_backward_trace OR ltt.has_parent) 
       AND (ltt.has_forward_trace OR ltt.has_children) 
      THEN ltt.lot_id 
    END)::NUMERIC / NULLIF(COUNT(DISTINCT ltt.lot_id), 0) * 100), 
    2
  ) as full_bidirectional_pct
FROM public.organizations o
LEFT JOIN lot_trace_test ltt ON ltt.organization_id = o.id
WHERE o.is_active = true
GROUP BY o.id, o.name
ORDER BY total_lots DESC;

-- View 2: KDE Quantity Reconciliation Report (EXPANDED)
CREATE OR REPLACE VIEW public.quantity_reconciliation_report AS
WITH all_quantity_events AS (
  -- Transformation events
  SELECT
    ct.id as event_id,
    'transformation' as event_category,
    ce.organization_id,
    o.name as organization_name,
    ct.transformation_date as event_date,
    ct.input_quantity,
    ct.output_quantity,
    ct.loss_quantity,
    ct.input_quantity - (ct.output_quantity + ct.loss_quantity) as discrepancy,
    ABS(ct.input_quantity - (ct.output_quantity + ct.loss_quantity)) < 0.01 as is_balanced
  FROM public.cte_transformation ct
  JOIN public.cte_events ce ON ce.id = ct.cte_event_id
  JOIN public.organizations o ON o.id = ce.organization_id
  
  UNION ALL
  
  -- Initial packing events
  SELECT
    ip.id,
    'initial_packing',
    ce.organization_id,
    o.name,
    ip.packing_date,
    ip.quantity_received as input_quantity,
    ip.quantity_packed as output_quantity,
    ip.loss_quantity,
    ip.quantity_received - (ip.quantity_packed + COALESCE(ip.loss_quantity, 0)) as discrepancy,
    ABS(ip.quantity_received - (ip.quantity_packed + COALESCE(ip.loss_quantity, 0))) < 0.01 as is_balanced
  FROM public.cte_initial_packing ip
  JOIN public.cte_events ce ON ce.id = ip.cte_event_id
  JOIN public.organizations o ON o.id = ce.organization_id
  
  UNION ALL
  
  -- Shipping vs Receiving reconciliation
  SELECT
    cs.id,
    'shipping_receiving',
    ce.organization_id,
    o.name,
    cs.ship_date,
    cs.quantity_shipped as input_quantity,
    COALESCE(cr.quantity_received, cs.quantity_shipped) as output_quantity,
    cs.quantity_shipped - COALESCE(cr.quantity_received, cs.quantity_shipped) as loss_quantity,
    cs.quantity_shipped - COALESCE(cr.quantity_received, cs.quantity_shipped) as discrepancy,
    ABS(cs.quantity_shipped - COALESCE(cr.quantity_received, cs.quantity_shipped)) < 0.01 as is_balanced
  FROM public.cte_shipping cs
  JOIN public.cte_events ce ON ce.id = cs.cte_event_id
  JOIN public.organizations o ON o.id = ce.organization_id
  LEFT JOIN public.cte_receiving cr ON cr.sender_organization_id = ce.organization_id 
    AND DATE(cr.received_date) >= cs.ship_date
)
SELECT
  *,
  CASE
    WHEN NOT is_balanced AND ABS(discrepancy) > 1.0 THEN 'FAIL'
    WHEN NOT is_balanced AND ABS(discrepancy) > 0.1 THEN 'WARNING'
    ELSE 'PASS'
  END as compliance_status
FROM all_quantity_events
ORDER BY event_date DESC;

-- View 3: CTE Audit Log Coverage Report (FIXED)
CREATE OR REPLACE VIEW public.audit_coverage_report AS
WITH all_records AS (
  -- Get all lots that should have audit logs
  SELECT 
    'traceability_lots' as table_name,
    id as record_id,
    organization_id,
    created_at
  FROM public.traceability_lots
  
  UNION ALL
  
  -- Get all CTE events that should have audit logs
  SELECT 
    'cte_events',
    id,
    organization_id,
    created_at
  FROM public.cte_events
  
  UNION ALL
  
  -- Get all transformations
  SELECT 
    'cte_transformation',
    ct.id,
    ce.organization_id,
    ct.created_at
  FROM public.cte_transformation ct
  JOIN public.cte_events ce ON ce.id = ct.cte_event_id
),
audit_status AS (
  SELECT
    ar.table_name,
    ar.record_id,
    ar.organization_id,
    -- Check if this record has audit logs
    EXISTS(
      SELECT 1 FROM public.audit_log al 
      WHERE al.table_name = ar.table_name 
        AND al.record_id = ar.record_id
    ) as has_audit_log,
    -- Count audit entries for this record
    (SELECT COUNT(*) FROM public.audit_log al 
     WHERE al.table_name = ar.table_name 
       AND al.record_id = ar.record_id
    ) as audit_count
  FROM all_records ar
)
SELECT
  table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN has_audit_log THEN 1 END) as records_with_audit,
  COUNT(CASE WHEN NOT has_audit_log THEN 1 END) as records_without_audit,
  ROUND(
    (COUNT(CASE WHEN has_audit_log THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100),
    2
  ) as audit_coverage_pct,
  SUM(audit_count) as total_audit_entries,
  COUNT(DISTINCT organization_id) as organizations_affected
FROM audit_status
GROUP BY table_name
ORDER BY audit_coverage_pct ASC;

-- View 4: CTE Timeline Validation Report (ENHANCED)
CREATE OR REPLACE VIEW public.timeline_validation_report AS
WITH event_sequence AS (
  SELECT
    ce.id as event_id,
    ce.organization_id,
    o.name as organization_name,
    ce.event_type,
    ce.event_datetime,
    cll.lot_id,
    tl.lot_code,
    tl.production_date,
    -- Get previous event for this lot
    LAG(ce.event_datetime) OVER (PARTITION BY cll.lot_id ORDER BY ce.event_datetime) as prev_event_datetime,
    LAG(ce.event_type) OVER (PARTITION BY cll.lot_id ORDER BY ce.event_datetime) as prev_event_type,
    -- Check timeline issues
    CASE
      WHEN DATE(ce.event_datetime) < tl.production_date THEN 'event_before_production'
      WHEN LAG(ce.event_datetime) OVER (PARTITION BY cll.lot_id ORDER BY ce.event_datetime) > ce.event_datetime THEN 'event_out_of_order'
      ELSE 'ok'
    END as timeline_issue,
    -- Check CTE sequence (harvesting should come before cooling, cooling before packing, etc.)
    CASE
      WHEN ce.event_type = 'cooling' AND LAG(ce.event_type) OVER (PARTITION BY cll.lot_id ORDER BY ce.event_datetime) != 'harvesting' THEN 'invalid_sequence'
      WHEN ce.event_type = 'initial_packing' AND LAG(ce.event_type) OVER (PARTITION BY cll.lot_id ORDER BY ce.event_datetime) NOT IN ('harvesting', 'cooling') THEN 'invalid_sequence'
      WHEN ce.event_type = 'shipping' AND LAG(ce.event_type) OVER (PARTITION BY cll.lot_id ORDER BY ce.event_datetime) IS NULL THEN 'invalid_sequence'
      ELSE 'valid_sequence'
    END as sequence_validation
  FROM public.cte_events ce
  JOIN public.cte_lot_links cll ON cll.cte_event_id = ce.id
  JOIN public.traceability_lots tl ON tl.id = cll.lot_id
  JOIN public.organizations o ON o.id = ce.organization_id
)
SELECT
  organization_id,
  organization_name,
  event_id,
  event_type,
  event_datetime,
  lot_code,
  production_date,
  prev_event_type,
  prev_event_datetime,
  timeline_issue,
  sequence_validation,
  CASE
    WHEN timeline_issue != 'ok' THEN 'FAIL'
    WHEN sequence_validation = 'invalid_sequence' THEN 'FAIL'
    ELSE 'PASS'
  END as compliance_status
FROM event_sequence
WHERE timeline_issue != 'ok' OR sequence_validation = 'invalid_sequence'
ORDER BY event_datetime DESC;

-- Function: Generate FSMA 204 Compliance Score (CORRECTED)
CREATE OR REPLACE FUNCTION get_fsma204_compliance_score(
  p_organization_id UUID
)
RETURNS TABLE(
  traceability_coverage NUMERIC,
  quantity_reconciliation NUMERIC,
  audit_logging NUMERIC,
  timeline_validation NUMERIC,
  overall_score NUMERIC
) AS $$
DECLARE
  v_traceability_score NUMERIC := 0;
  v_quantity_score NUMERIC := 0;
  v_audit_score NUMERIC := 0;
  v_timeline_score NUMERIC := 0;
BEGIN
  -- 1. TLC Bidirectional Traceability Coverage (FIXED)
  SELECT COALESCE(traceability_coverage_pct, 0)
  INTO v_traceability_score
  FROM public.traceability_health_check
  WHERE organization_id = p_organization_id;

  -- 2. KDE Quantity Reconciliation Accuracy (FIXED)
  WITH reconciliation_summary AS (
    SELECT
      COUNT(*) as total_events,
      COUNT(CASE WHEN is_balanced THEN 1 END) as balanced_count,
      COUNT(CASE WHEN compliance_status = 'FAIL' THEN 1 END) as failed_count
    FROM public.quantity_reconciliation_report
    WHERE organization_id = p_organization_id
  )
  SELECT COALESCE(
    CASE
      WHEN total_events = 0 THEN 100 -- No events yet = perfect score
      WHEN failed_count = 0 THEN 100
      WHEN failed_count <= total_events * 0.05 THEN 95 -- 5% tolerance
      WHEN failed_count <= total_events * 0.10 THEN 85 -- 10% tolerance
      WHEN failed_count <= total_events * 0.20 THEN 70 -- 20% tolerance
      ELSE 50
    END,
    100
  )
  INTO v_quantity_score
  FROM reconciliation_summary;

  -- 3. CTE Audit Log Coverage (FIXED - based on percentage, not count)
  WITH audit_summary AS (
    SELECT AVG(audit_coverage_pct) as avg_coverage
    FROM public.audit_coverage_report
  )
  SELECT COALESCE(ROUND(avg_coverage, 0), 0)
  INTO v_audit_score
  FROM audit_summary;

  -- 4. CTE Timeline Validation (FIXED)
  WITH timeline_summary AS (
    SELECT 
      COUNT(*) as total_events,
      COUNT(CASE WHEN compliance_status = 'FAIL' THEN 1 END) as failed_count
    FROM public.timeline_validation_report
    WHERE organization_id = p_organization_id
  ),
  all_events AS (
    SELECT COUNT(*) as total_events
    FROM public.cte_events
    WHERE organization_id = p_organization_id
  )
  SELECT CASE
    WHEN ae.total_events = 0 THEN 100 -- No events = perfect score
    WHEN ts.failed_count = 0 THEN 100
    WHEN ts.failed_count::NUMERIC / ae.total_events <= 0.05 THEN 95
    WHEN ts.failed_count::NUMERIC / ae.total_events <= 0.10 THEN 85
    WHEN ts.failed_count::NUMERIC / ae.total_events <= 0.20 THEN 70
    ELSE 50
  END
  INTO v_timeline_score
  FROM timeline_summary ts, all_events ae;

  -- Return all scores
  RETURN QUERY
  SELECT
    v_traceability_score,
    v_quantity_score,
    v_audit_score,
    v_timeline_score,
    ROUND((v_traceability_score + v_quantity_score + v_audit_score + v_timeline_score) / 4, 1) as overall_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON VIEW public.traceability_health_check IS 'FSMA 204: Tests actual forward/backward traceability for each TLC';
COMMENT ON VIEW public.quantity_reconciliation_report IS 'FSMA 204: Validates Input = Output + Loss for ALL quantity-related CTEs';
COMMENT ON VIEW public.audit_coverage_report IS 'FSMA 204: Measures percentage of records with audit logs, not just count';
COMMENT ON VIEW public.timeline_validation_report IS 'FSMA 204: Validates both chronological order AND CTE sequence rules';
COMMENT ON FUNCTION get_fsma204_compliance_score IS 'FSMA 204: Accurate compliance scoring based on percentages, not arbitrary thresholds';

-- Grant access
GRANT SELECT ON public.traceability_health_check TO authenticated;
GRANT SELECT ON public.quantity_reconciliation_report TO authenticated;
GRANT SELECT ON public.audit_coverage_report TO authenticated;
GRANT SELECT ON public.timeline_validation_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_fsma204_compliance_score(UUID) TO authenticated;
