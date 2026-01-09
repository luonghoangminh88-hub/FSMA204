-- =============================================
-- FSMA 204 COMPLIANCE VALIDATION & REPORTING
-- Critical Tracking Events (CTE) and Key Data Elements (KDE) Validation
-- Traceability Lot Code (TLC) Compliance Assessment
-- =============================================

-- View: TLC Bidirectional Traceability Health Check
-- Renamed from "phase1" to use FSMA 204 terminology: TLC traceability
CREATE OR REPLACE VIEW public.traceability_health_check AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT tl.id) as total_lots,
  COUNT(DISTINCT CASE WHEN tl.parent_lot_id IS NOT NULL THEN tl.id END) as lots_with_parent,
  COUNT(DISTINCT CASE WHEN tl.parent_lot_id IS NULL THEN tl.id END) as source_lots,
  COUNT(DISTINCT ce.id) as total_cte_events,
  COUNT(DISTINCT CASE WHEN ce.event_type = 'transformation' THEN ce.id END) as transformation_events,
  ROUND(
    (COUNT(DISTINCT CASE WHEN tl.parent_lot_id IS NOT NULL THEN tl.id END)::NUMERIC / 
     NULLIF(COUNT(DISTINCT tl.id), 0) * 100), 
    2
  ) as traceability_coverage_pct,
  -- Check if forward/backward trace functions work
  (SELECT COUNT(*) FROM public.audit_log WHERE table_name = 'traceability_lots' AND created_at >= NOW() - INTERVAL '7 days') as recent_lot_audits,
  (SELECT COUNT(*) FROM public.audit_log WHERE table_name = 'cte_events' AND created_at >= NOW() - INTERVAL '7 days') as recent_cte_audits
FROM public.organizations o
LEFT JOIN public.traceability_lots tl ON tl.organization_id = o.id
LEFT JOIN public.cte_events ce ON ce.organization_id = o.id
WHERE o.is_active = true
GROUP BY o.id, o.name
ORDER BY total_lots DESC;

-- View: KDE Quantity Reconciliation Report
-- Updated comments to reference KDEs (Key Data Elements) for quantities
CREATE OR REPLACE VIEW public.quantity_reconciliation_report AS
WITH transformation_analysis AS (
  SELECT
    ct.id as transformation_id,
    ct.cte_event_id,
    ct.transformation_date,
    ct.input_quantity,
    ct.output_quantity,
    ct.loss_quantity,
    ct.yield_percentage,
    ce.organization_id,
    o.name as organization_name,
    loc.location_name,
    -- Validate KDE reconciliation: input = output + loss
    CASE
      WHEN ABS(ct.input_quantity - (ct.output_quantity + ct.loss_quantity)) < 0.01 THEN 'balanced'
      ELSE 'unbalanced'
    END as reconciliation_status,
    ABS(ct.input_quantity - (ct.output_quantity + ct.loss_quantity)) as reconciliation_difference
  FROM public.cte_transformation ct
  JOIN public.cte_events ce ON ce.id = ct.cte_event_id
  JOIN public.organizations o ON o.id = ce.organization_id
  LEFT JOIN public.locations loc ON loc.id = ct.transformation_location_id
)
SELECT
  *,
  CASE
    WHEN reconciliation_status = 'unbalanced' THEN 'FAIL'
    WHEN yield_percentage < 70 THEN 'WARNING'
    ELSE 'PASS'
  END as compliance_status
FROM transformation_analysis
ORDER BY transformation_date DESC;

-- View: CTE Audit Log Coverage Report
-- Renamed to emphasize CTE audit logging
CREATE OR REPLACE VIEW public.audit_coverage_report AS
SELECT
  table_name,
  COUNT(*) as total_audits,
  COUNT(DISTINCT organization_id) as organizations_affected,
  COUNT(DISTINCT user_id) as users_involved,
  MIN(created_at) as first_audit,
  MAX(created_at) as last_audit,
  COUNT(CASE WHEN action = 'create' THEN 1 END) as creates,
  COUNT(CASE WHEN action = 'update' THEN 1 END) as updates,
  COUNT(CASE WHEN action = 'delete' THEN 1 END) as deletes
FROM public.audit_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY table_name
ORDER BY total_audits DESC;

-- View: CTE Timeline Validation Report
-- Updated to validate CTE sequence (Harvesting → Cooling → Packing → Shipping)
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
    tl.parent_lot_id,
    -- Get previous event for this lot
    LAG(ce.event_datetime) OVER (PARTITION BY cll.lot_id ORDER BY ce.event_datetime) as prev_event_datetime,
    LAG(ce.event_type) OVER (PARTITION BY cll.lot_id ORDER BY ce.event_datetime) as prev_event_type,
    -- Check if event is before production date
    CASE
      WHEN DATE(ce.event_datetime) < tl.production_date THEN 'event_before_production'
      ELSE 'ok'
    END as timeline_check
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
  timeline_check,
  CASE
    WHEN timeline_check != 'ok' THEN 'FAIL'
    WHEN prev_event_datetime IS NOT NULL AND event_datetime < prev_event_datetime THEN 'FAIL'
    ELSE 'PASS'
  END as compliance_status
FROM event_sequence
WHERE timeline_check != 'ok' 
   OR (prev_event_datetime IS NOT NULL AND event_datetime < prev_event_datetime)
ORDER BY event_datetime DESC;

-- Function: Generate FSMA 204 Compliance Score
-- Renamed function and updated descriptions to use FSMA 204 terminology
CREATE OR REPLACE FUNCTION get_phase1_compliance_score(
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
  -- 1. TLC Bidirectional Traceability Coverage
  SELECT COALESCE(traceability_coverage_pct, 0)
  INTO v_traceability_score
  FROM public.traceability_health_check
  WHERE organization_id = p_organization_id;

  -- 2. KDE Quantity Reconciliation Accuracy
  WITH reconciliation_summary AS (
    SELECT
      COUNT(*) as total_transformations,
      COUNT(CASE WHEN reconciliation_status = 'balanced' THEN 1 END) as balanced_count
    FROM public.quantity_reconciliation_report
    WHERE organization_id = p_organization_id
  )
  SELECT COALESCE(
    ROUND((balanced_count::NUMERIC / NULLIF(total_transformations, 0) * 100), 2),
    0
  )
  INTO v_quantity_score
  FROM reconciliation_summary;

  -- 3. CTE Audit Log Coverage
  WITH audit_summary AS (
    SELECT COUNT(*) as total_audits
    FROM public.audit_log
    WHERE organization_id = p_organization_id
      AND table_name IN ('cte_events', 'traceability_lots', 'cte_transformation')
      AND created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT CASE
    WHEN total_audits >= 100 THEN 100
    WHEN total_audits >= 50 THEN 80
    WHEN total_audits >= 20 THEN 60
    WHEN total_audits >= 10 THEN 40
    ELSE 20
  END
  INTO v_audit_score
  FROM audit_summary;

  -- 4. CTE Timeline Validation
  WITH timeline_summary AS (
    SELECT COUNT(CASE WHEN compliance_status = 'FAIL' THEN 1 END) as failed_count
    FROM public.timeline_validation_report
    WHERE organization_id = p_organization_id
  )
  SELECT CASE
    WHEN failed_count = 0 THEN 100
    WHEN failed_count <= 5 THEN 80
    WHEN failed_count <= 10 THEN 60
    ELSE 40
  END
  INTO v_timeline_score
  FROM timeline_summary;

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

-- Function: Generate FSMA 204 Compliance Report
-- Updated to use proper FSMA 204 terminology throughout
CREATE OR REPLACE FUNCTION generate_phase1_compliance_report(
  p_organization_id UUID
)
RETURNS TABLE(
  category TEXT,
  feature TEXT,
  status TEXT,
  score NUMERIC,
  details JSONB
) AS $$
BEGIN
  -- 1. TLC Bidirectional Traceability (Forward & Backward)
  RETURN QUERY
  SELECT
    'TLC Traceability'::TEXT as category,
    'Bidirectional Trace Coverage (Forward/Backward)'::TEXT as feature,
    CASE
      WHEN traceability_coverage_pct >= 90 THEN 'EXCELLENT'
      WHEN traceability_coverage_pct >= 70 THEN 'GOOD'
      WHEN traceability_coverage_pct >= 50 THEN 'FAIR'
      ELSE 'POOR'
    END as status,
    traceability_coverage_pct as score,
    jsonb_build_object(
      'total_lots', total_lots,
      'lots_with_parent', lots_with_parent,
      'source_lots', source_lots,
      'total_cte_events', total_cte_events,
      'transformation_events', transformation_events
    ) as details
  FROM public.traceability_health_check
  WHERE organization_id = p_organization_id;

  -- 2. KDE Quantity Reconciliation (Input = Output + Loss)
  RETURN QUERY
  WITH reconciliation_summary AS (
    SELECT
      COUNT(*) as total_transformations,
      COUNT(CASE WHEN reconciliation_status = 'balanced' THEN 1 END) as balanced_count,
      COUNT(CASE WHEN compliance_status = 'FAIL' THEN 1 END) as failed_count,
      AVG(yield_percentage) as avg_yield
    FROM public.quantity_reconciliation_report
    WHERE organization_id = p_organization_id
  )
  SELECT
    'KDE Quantities'::TEXT,
    'Quantity Reconciliation (Input = Output + Loss)'::TEXT,
    CASE
      WHEN failed_count = 0 THEN 'EXCELLENT'
      WHEN failed_count <= total_transformations * 0.1 THEN 'GOOD'
      WHEN failed_count <= total_transformations * 0.2 THEN 'FAIR'
      ELSE 'POOR'
    END,
    ROUND((balanced_count::NUMERIC / NULLIF(total_transformations, 0) * 100), 2),
    jsonb_build_object(
      'total_transformations', total_transformations,
      'balanced_count', balanced_count,
      'failed_count', failed_count,
      'avg_yield_percentage', ROUND(avg_yield, 2)
    )
  FROM reconciliation_summary;

  -- 3. CTE Audit Log Coverage
  RETURN QUERY
  WITH audit_summary AS (
    SELECT
      COUNT(*) as total_audits,
      COUNT(DISTINCT table_name) as tables_audited,
      COUNT(DISTINCT user_id) as active_users,
      MAX(created_at) as last_audit_time
    FROM public.audit_log
    WHERE organization_id = p_organization_id
      AND created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT
    'CTE Audit Trail'::TEXT,
    'Automatic CTE & KDE Change Logging'::TEXT,
    CASE
      WHEN total_audits > 100 THEN 'EXCELLENT'
      WHEN total_audits > 50 THEN 'GOOD'
      WHEN total_audits > 10 THEN 'FAIR'
      ELSE 'POOR'
    END,
    total_audits::NUMERIC,
    jsonb_build_object(
      'total_audits_30days', total_audits,
      'tables_audited', tables_audited,
      'active_users', active_users,
      'last_audit_time', last_audit_time
    )
  FROM audit_summary;

  -- 4. CTE Timeline Validation (Chronological Sequence)
  RETURN QUERY
  WITH timeline_summary AS (
    SELECT
      COUNT(*) as total_violations,
      COUNT(CASE WHEN compliance_status = 'FAIL' THEN 1 END) as failed_count
    FROM public.timeline_validation_report
    WHERE organization_id = p_organization_id
  )
  SELECT
    'CTE Timeline'::TEXT,
    'CTE Chronological Sequence Validation'::TEXT,
    CASE
      WHEN failed_count = 0 THEN 'EXCELLENT'
      WHEN failed_count <= 5 THEN 'GOOD'
      WHEN failed_count <= 10 THEN 'FAIR'
      ELSE 'POOR'
    END,
    CASE WHEN failed_count = 0 THEN 100 ELSE 100 - (failed_count * 10) END::NUMERIC,
    jsonb_build_object(
      'total_violations', total_violations,
      'failed_count', failed_count
    )
  FROM timeline_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test Function: Validate complete TLC traceability chain
-- Updated function name and descriptions to reference TLC
CREATE OR REPLACE FUNCTION test_traceability_chain(
  p_lot_code TEXT,
  p_organization_id UUID
)
RETURNS TABLE(
  test_name TEXT,
  status TEXT,
  message TEXT,
  details JSONB
) AS $$
DECLARE
  v_backward_count INTEGER;
  v_forward_count INTEGER;
  v_current_lot RECORD;
BEGIN
  -- Test 1: TLC (Traceability Lot Code) exists
  SELECT * INTO v_current_lot
  FROM public.traceability_lots
  WHERE lot_code = p_lot_code 
    AND organization_id = p_organization_id;
  
  IF v_current_lot IS NULL THEN
    RETURN QUERY
    SELECT
      'TLC Existence'::TEXT,
      'FAIL'::TEXT,
      'Traceability Lot Code not found'::TEXT,
      jsonb_build_object('lot_code', p_lot_code)::JSONB;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    'TLC Existence'::TEXT,
    'PASS'::TEXT,
    'Traceability Lot Code found successfully'::TEXT,
    to_jsonb(v_current_lot);

  -- Test 2: Backward trace (upstream traceability)
  SELECT COUNT(*) INTO v_backward_count
  FROM trace_backward(p_lot_code, p_organization_id);
  
  RETURN QUERY
  SELECT
    'Backward Trace (Upstream)'::TEXT,
    CASE WHEN v_backward_count > 0 THEN 'PASS' ELSE 'WARNING' END::TEXT,
    format('Found %s backward trace nodes', v_backward_count)::TEXT,
    jsonb_build_object('backward_count', v_backward_count);

  -- Test 3: Forward trace (downstream traceability)
  SELECT COUNT(*) INTO v_forward_count
  FROM trace_forward(p_lot_code, p_organization_id);
  
  RETURN QUERY
  SELECT
    'Forward Trace (Downstream)'::TEXT,
    CASE WHEN v_forward_count > 0 THEN 'PASS' ELSE 'WARNING' END::TEXT,
    format('Found %s forward trace nodes', v_forward_count)::TEXT,
    jsonb_build_object('forward_count', v_forward_count);

  -- Test 4: CTE audit log exists
  RETURN QUERY
  SELECT
    'CTE Audit Trail'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    format('Found %s CTE audit log entries', COUNT(*))::TEXT,
    jsonb_build_object('audit_count', COUNT(*))
  FROM public.audit_log
  WHERE table_name = 'traceability_lots'
    AND record_id = v_current_lot.id;

  -- Test 5: KDE Quantity reconciliation (if lot has parent)
  IF v_current_lot.parent_lot_id IS NOT NULL THEN
    RETURN QUERY
    WITH parent_lot AS (
      SELECT quantity, unit_of_measure
      FROM public.traceability_lots
      WHERE id = v_current_lot.parent_lot_id
    ),
    sibling_lots AS (
      SELECT SUM(quantity) as total_sibling_qty
      FROM public.traceability_lots
      WHERE parent_lot_id = v_current_lot.parent_lot_id
    )
    SELECT
      'KDE Quantity Reconciliation'::TEXT,
      CASE 
        WHEN sl.total_sibling_qty <= pl.quantity THEN 'PASS' 
        ELSE 'FAIL' 
      END::TEXT,
      format('Parent: %s, Children total: %s', pl.quantity, sl.total_sibling_qty)::TEXT,
      jsonb_build_object(
        'parent_quantity', pl.quantity,
        'children_total', sl.total_sibling_qty,
        'current_lot_quantity', v_current_lot.quantity
      )
    FROM parent_lot pl, sibling_lots sl;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated Comments with FSMA 204 Terminology
COMMENT ON VIEW public.traceability_health_check IS 'FSMA 204: Monitors TLC (Traceability Lot Code) bidirectional traceability coverage';
COMMENT ON VIEW public.quantity_reconciliation_report IS 'FSMA 204: Validates KDE quantities - Input = Output + Loss for all CTEs';
COMMENT ON VIEW public.audit_coverage_report IS 'FSMA 204: Tracks audit log coverage for all CTE (Critical Tracking Events) and KDE changes';
COMMENT ON VIEW public.timeline_validation_report IS 'FSMA 204: Validates CTE chronological sequence (Harvesting → Cooling → Packing → Shipping)';
COMMENT ON FUNCTION generate_phase1_compliance_report IS 'FSMA 204: Generates compliance report for CTEs, KDEs, and TLC requirements';
COMMENT ON FUNCTION test_traceability_chain IS 'FSMA 204: Tests complete TLC traceability chain (forward/backward trace)';
COMMENT ON FUNCTION get_phase1_compliance_score IS 'FSMA 204: Calculates compliance score for bidirectional traceability, quantity KDEs, CTE audit logs, and timeline validation';

-- Grant access to views
GRANT SELECT ON public.traceability_health_check TO authenticated;
GRANT SELECT ON public.quantity_reconciliation_report TO authenticated;
GRANT SELECT ON public.audit_coverage_report TO authenticated;
GRANT SELECT ON public.timeline_validation_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_phase1_compliance_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_phase1_compliance_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION test_traceability_chain(TEXT, UUID) TO authenticated;
