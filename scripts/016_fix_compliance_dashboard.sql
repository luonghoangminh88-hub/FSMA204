-- Fix compliance_dashboard view to include lot_completeness_score and cte_completeness_score

DROP VIEW IF EXISTS compliance_dashboard;

CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  
  -- Lot completeness: percentage of lots with TLC
  ROUND(
    (COUNT(tl.id) FILTER (WHERE tl.lot_code IS NOT NULL)::NUMERIC / NULLIF(COUNT(tl.id), 0) * 100), 
    2
  ) as lot_completeness_score,
  
  -- CTE completeness: percentage of CTEs with all required KDEs
  ROUND(
    (COUNT(ce.id) FILTER (WHERE ce.location_id IS NOT NULL AND ce.lot_id IS NOT NULL)::NUMERIC / NULLIF(COUNT(ce.id), 0) * 100), 
    2
  ) as cte_completeness_score,
  
  -- Overall compliance: weighted average (40% lot, 60% CTE)
  ROUND(
    (
      (COUNT(tl.id) FILTER (WHERE tl.lot_code IS NOT NULL)::NUMERIC / NULLIF(COUNT(tl.id), 0) * 100) * 0.4 +
      (COUNT(ce.id) FILTER (WHERE ce.location_id IS NOT NULL AND ce.lot_id IS NOT NULL)::NUMERIC / NULLIF(COUNT(ce.id), 0) * 100) * 0.6
    ), 
    2
  ) as overall_compliance_score,
  
  NOW() as calculated_at
FROM organizations o
LEFT JOIN traceability_lots tl ON tl.organization_id = o.id
LEFT JOIN cte_events ce ON ce.organization_id = o.id
WHERE o.is_active = true
GROUP BY o.id, o.name;

-- Add comment to explain the view
COMMENT ON VIEW compliance_dashboard IS 
'Real-time compliance dashboard showing lot and CTE completeness scores per organization. 
Updated automatically when lots or CTE events are created/modified.';
