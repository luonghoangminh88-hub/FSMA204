-- =============================================
-- APPROVAL WORKFLOWS FOR FSMA 204
-- Script: 023_approval_workflows.sql
-- Purpose: Add approval workflow capabilities for high-risk operations
-- =============================================

-- Drop existing objects if they exist
DROP VIEW IF EXISTS pending_approvals_dashboard CASCADE;
DROP FUNCTION IF EXISTS approve_item(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS reject_item(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_pending_approvals_count(UUID) CASCADE;

-- Add approval fields to existing tables if not present
ALTER TABLE public.cte_transformation
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.cte_shipping
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.cte_receiving
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create unified approval dashboard view
CREATE OR REPLACE VIEW pending_approvals_dashboard AS
WITH transformation_approvals AS (
  SELECT 
    t.id,
    'transformation' as approval_type,
    e.organization_id,
    t.transformation_date::timestamptz as event_date,
    t.output_product_description as item_description,
    t.output_quantity::text || ' ' || t.output_unit_of_measure as quantity,
    t.transformation_type as details,
    l.location_name,
    p.full_name as created_by_name,
    e.created_at,
    EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600 as hours_pending,
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600 > 24 THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600 > 12 THEN 'warning'
      ELSE 'normal'
    END as urgency
  FROM public.cte_transformation t
  JOIN public.cte_events e ON t.cte_event_id = e.id
  LEFT JOIN public.locations l ON t.transformation_location_id = l.id
  LEFT JOIN public.profiles p ON e.created_by = p.id
  WHERE t.approval_status = 'pending'
    AND t.requires_approval = true
),
shipping_approvals AS (
  SELECT 
    s.id,
    'shipping' as approval_type,
    e.organization_id,
    s.ship_date::timestamptz as event_date,
    s.recipient_name || ' - ' || COALESCE(s.recipient_city, '') as item_description,
    s.quantity_shipped::text || ' ' || s.unit_of_measure as quantity,
    COALESCE(s.carrier_name, 'N/A') as details,
    l.location_name,
    p.full_name as created_by_name,
    e.created_at,
    EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600 as hours_pending,
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600 > 24 THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600 > 12 THEN 'warning'
      ELSE 'normal'
    END as urgency
  FROM public.cte_shipping s
  JOIN public.cte_events e ON s.cte_event_id = e.id
  LEFT JOIN public.locations l ON s.shipping_location_id = l.id
  LEFT JOIN public.profiles p ON e.created_by = p.id
  WHERE s.approval_status = 'pending'
    AND s.requires_approval = true
),
receiving_approvals AS (
  SELECT 
    r.id,
    'receiving' as approval_type,
    e.organization_id,
    r.received_date::timestamptz as event_date,
    r.sender_name || ' - ' || r.product_description as item_description,
    r.quantity_received::text || ' ' || r.unit_of_measure as quantity,
    COALESCE(r.product_condition, 'N/A') as details,
    l.location_name,
    p.full_name as created_by_name,
    e.created_at,
    EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600 as hours_pending,
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600 > 24 THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600 > 12 THEN 'warning'
      ELSE 'normal'
    END as urgency
  FROM public.cte_receiving r
  JOIN public.cte_events e ON r.cte_event_id = e.id
  LEFT JOIN public.locations l ON r.receiving_location_id = l.id
  LEFT JOIN public.profiles p ON e.created_by = p.id
  WHERE r.approval_status = 'pending'
    AND r.requires_approval = true
)
SELECT * FROM transformation_approvals
UNION ALL
SELECT * FROM shipping_approvals
UNION ALL
SELECT * FROM receiving_approvals
ORDER BY urgency DESC, hours_pending DESC;

-- Function to approve an item
CREATE OR REPLACE FUNCTION approve_item(
  p_item_id UUID,
  p_approver_id UUID,
  p_approval_type TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_rows_affected INTEGER;
BEGIN
  -- Approve based on type
  IF p_approval_type = 'transformation' THEN
    UPDATE public.cte_transformation
    SET approval_status = 'approved',
        approved_by = p_approver_id,
        approved_at = NOW()
    WHERE id = p_item_id
      AND approval_status = 'pending';
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
  ELSIF p_approval_type = 'shipping' THEN
    UPDATE public.cte_shipping
    SET approval_status = 'approved',
        approved_by = p_approver_id,
        approved_at = NOW()
    WHERE id = p_item_id
      AND approval_status = 'pending';
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
  ELSIF p_approval_type = 'receiving' THEN
    UPDATE public.cte_receiving
    SET approval_status = 'approved',
        approved_by = p_approver_id,
        approved_at = NOW()
    WHERE id = p_item_id
      AND approval_status = 'pending';
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
  ELSE
    RAISE EXCEPTION 'Invalid approval type: %', p_approval_type;
  END IF;

  IF v_rows_affected = 0 THEN
    v_result := jsonb_build_object(
      'success', false,
      'message', 'Item not found or already processed'
    );
  ELSE
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Item approved successfully'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject an item
CREATE OR REPLACE FUNCTION reject_item(
  p_item_id UUID,
  p_approver_id UUID,
  p_approval_type TEXT,
  p_rejection_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_rows_affected INTEGER;
BEGIN
  -- Reject based on type
  IF p_approval_type = 'transformation' THEN
    UPDATE public.cte_transformation
    SET approval_status = 'rejected',
        approved_by = p_approver_id,
        approved_at = NOW(),
        rejection_reason = p_rejection_reason
    WHERE id = p_item_id
      AND approval_status = 'pending';
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
  ELSIF p_approval_type = 'shipping' THEN
    UPDATE public.cte_shipping
    SET approval_status = 'rejected',
        approved_by = p_approver_id,
        approved_at = NOW(),
        rejection_reason = p_rejection_reason
    WHERE id = p_item_id
      AND approval_status = 'pending';
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
  ELSIF p_approval_type = 'receiving' THEN
    UPDATE public.cte_receiving
    SET approval_status = 'rejected',
        approved_by = p_approver_id,
        approved_at = NOW(),
        rejection_reason = p_rejection_reason
    WHERE id = p_item_id
      AND approval_status = 'pending';
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
  ELSE
    RAISE EXCEPTION 'Invalid approval type: %', p_approval_type;
  END IF;

  IF v_rows_affected = 0 THEN
    v_result := jsonb_build_object(
      'success', false,
      'message', 'Item not found or already processed'
    );
  ELSE
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Item rejected successfully'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending approvals count
CREATE OR REPLACE FUNCTION get_pending_approvals_count(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM pending_approvals_dashboard
  WHERE organization_id = p_organization_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transformation_approval ON public.cte_transformation(approval_status, requires_approval) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_shipping_approval ON public.cte_shipping(approval_status, requires_approval) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_receiving_approval ON public.cte_receiving(approval_status, requires_approval) WHERE approval_status = 'pending';

-- Grant permissions
GRANT SELECT ON pending_approvals_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION approve_item TO authenticated;
GRANT EXECUTE ON FUNCTION reject_item TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_approvals_count TO authenticated;

COMMENT ON VIEW pending_approvals_dashboard IS 'Unified view of all pending approvals across transformation, shipping, and receiving operations';
COMMENT ON FUNCTION approve_item IS 'Approves a pending item (transformation, shipping, or receiving)';
COMMENT ON FUNCTION reject_item IS 'Rejects a pending item with reason';
COMMENT ON FUNCTION get_pending_approvals_count IS 'Gets count of pending approvals for an organization';
