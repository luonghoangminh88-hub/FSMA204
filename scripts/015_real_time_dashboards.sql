-- 1. Dashboard tồn kho
CREATE MATERIALIZED VIEW inventory_dashboard AS
SELECT 
  li.organization_id,
  o.name as organization_name,
  li.location_id,
  l.location_name,
  l.location_type,
  tl.lot_code,
  tl.product_description,
  tl.status as lot_status,
  li.current_quantity,
  li.reserved_quantity,
  li.available_quantity,
  li.unit_of_measure,
  li.initial_quantity,
  li.total_loss,
  li.loss_percentage,
  tl.production_date,
  tl.expiration_date,
  CASE 
    WHEN tl.expiration_date < CURRENT_DATE THEN 'expired'
    WHEN tl.expiration_date < CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_soon'
    WHEN tl.expiration_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_this_month'
    ELSE 'fresh'
  END as expiration_status,
  li.updated_at
FROM lot_inventory li
JOIN traceability_lots tl ON tl.id = li.lot_id
JOIN locations l ON l.id = li.location_id
JOIN organizations o ON o.id = li.organization_id
WHERE li.current_quantity > 0;

-- 2. View hàng chờ duyệt (Đã Fix lỗi UNION)
CREATE OR REPLACE VIEW pending_approvals_queue AS
WITH transformation_approvals AS (
  SELECT 
    ct.id as record_id,
    'transformation' as approval_type,
    ce.organization_id,
    ce.event_datetime,
    l.location_name,
    jsonb_build_object(
      'type', ct.transformation_type,
      'input', ct.input_quantity,
      'output', ct.output_quantity,
      'loss_pct', (ct.loss_quantity / NULLIF(ct.input_quantity, 0) * 100)
    ) as details,
    CASE 
      WHEN ct.loss_quantity / NULLIF(ct.input_quantity, 0) > 0.15 THEN 'high_loss'
      ELSE 'normal'
    END as risk_level,
    ce.created_at
  FROM cte_transformation ct
  JOIN cte_events ce ON ce.id = ct.cte_event_id
  LEFT JOIN locations l ON l.id = ce.location_id
  WHERE ct.loss_quantity / NULLIF(ct.input_quantity, 0) > 0.10
),
high_value_shipments AS (
  SELECT 
    cs.id as record_id,
    'high_value_shipment' as approval_type,
    ce.organization_id,
    ce.event_datetime,
    l.location_name,
    jsonb_build_object(
      'recipient', cs.recipient_name,
      'quantity', cs.quantity_shipped,
      'unit', cs.unit_of_measure
    ) as details,
    'requires_approval' as risk_level,
    ce.created_at
  FROM cte_shipping cs
  JOIN cte_events ce ON ce.id = cs.cte_event_id
  LEFT JOIN locations l ON l.id = ce.location_id
  WHERE cs.quantity_shipped > 1000
)
SELECT * FROM transformation_approvals
UNION ALL
SELECT * FROM high_value_shipments
ORDER BY created_at DESC;

-- 3. View điểm số tuân thủ
CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  ROUND(
    (
      (COUNT(tl.id) FILTER (WHERE tl.lot_code IS NOT NULL)::NUMERIC / NULLIF(COUNT(tl.id), 0) * 100) * 0.4 +
      (COUNT(ce.id) FILTER (WHERE ce.location_id IS NOT NULL)::NUMERIC / NULLIF(COUNT(ce.id), 0) * 100) * 0.6
    ), 2
  ) as overall_compliance_score,
  NOW() as calculated_at
FROM organizations o
LEFT JOIN traceability_lots tl ON tl.organization_id = o.id
LEFT JOIN cte_events ce ON ce.organization_id = o.id
WHERE o.is_active = true
GROUP BY o.id, o.name;
