-- Phase 3 Priority 3: FDA Response Integration
-- Auto-generate traceability reports and track 24-hour deadline

-- Create function to auto-generate complete traceability report for FDA
CREATE OR REPLACE FUNCTION generate_fda_traceability_report(
  p_lot_codes TEXT[],
  p_fda_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report JSONB;
  v_lot_code TEXT;
  v_backward_trace JSONB;
  v_forward_trace JSONB;
  v_lot_details JSONB;
  v_cte_events JSONB;
BEGIN
  v_report := jsonb_build_object(
    'report_id', gen_random_uuid(),
    'generated_at', NOW(),
    'fda_request_id', p_fda_request_id,
    'lot_reports', '[]'::jsonb
  );

  -- For each lot code, generate complete trace
  FOREACH v_lot_code IN ARRAY p_lot_codes
  LOOP
    -- Get backward trace
    v_backward_trace := trace_backward(v_lot_code);
    
    -- Get forward trace
    v_forward_trace := trace_forward(v_lot_code);
    
    -- Get lot details
    SELECT jsonb_build_object(
      'lot_code', tl.lot_code,
      'product_description', tl.product_description,
      'quantity', tl.quantity,
      'unit_of_measure', tl.unit_of_measure,
      'production_date', tl.production_date,
      'expiration_date', tl.expiration_date,
      'current_status', tl.status,
      'organization', jsonb_build_object(
        'name', o.name,
        'address', o.address,
        'city', o.city,
        'state', o.state,
        'license_number', o.license_number
      )
    )
    INTO v_lot_details
    FROM traceability_lots tl
    JOIN organizations o ON o.id = tl.organization_id
    WHERE tl.lot_code = v_lot_code;
    
    -- Get all CTE events for this lot
    SELECT jsonb_agg(
      jsonb_build_object(
        'event_type', ce.event_type,
        'event_datetime', ce.event_datetime,
        'location', jsonb_build_object(
          'name', l.location_name,
          'address', l.address,
          'city', l.city,
          'state', l.state
        ),
        'details', CASE ce.event_type
          WHEN 'harvesting' THEN (
            SELECT row_to_json(h.*)::jsonb 
            FROM cte_harvesting h 
            WHERE h.cte_event_id = ce.id
          )
          WHEN 'cooling' THEN (
            SELECT row_to_json(c.*)::jsonb 
            FROM cte_cooling c 
            WHERE c.cte_event_id = ce.id
          )
          WHEN 'initial_packing' THEN (
            SELECT row_to_json(ip.*)::jsonb 
            FROM cte_initial_packing ip 
            WHERE ip.cte_event_id = ce.id
          )
          WHEN 'shipping' THEN (
            SELECT row_to_json(s.*)::jsonb 
            FROM cte_shipping s 
            WHERE s.cte_event_id = ce.id
          )
          WHEN 'receiving' THEN (
            SELECT row_to_json(r.*)::jsonb 
            FROM cte_receiving r 
            WHERE r.cte_event_id = ce.id
          )
          WHEN 'transformation' THEN (
            SELECT row_to_json(t.*)::jsonb 
            FROM cte_transformation t 
            WHERE t.cte_event_id = ce.id
          )
          ELSE '{}'::jsonb
        END
      )
    )
    INTO v_cte_events
    FROM cte_events ce
    LEFT JOIN locations l ON l.id = ce.location_id
    LEFT JOIN cte_lot_links cll ON cll.cte_event_id = ce.id
    LEFT JOIN traceability_lots tl ON tl.id = cll.lot_id
    WHERE tl.lot_code = v_lot_code;
    
    -- Add lot report to main report
    v_report := jsonb_set(
      v_report,
      '{lot_reports}',
      (v_report->'lot_reports') || jsonb_build_array(
        jsonb_build_object(
          'lot_code', v_lot_code,
          'lot_details', v_lot_details,
          'backward_trace', v_backward_trace,
          'forward_trace', v_forward_trace,
          'cte_events', COALESCE(v_cte_events, '[]'::jsonb)
        )
      )
    );
  END LOOP;

  RETURN v_report;
END;
$$;

-- Create trigger to alert when FDA request is approaching deadline
CREATE OR REPLACE FUNCTION check_fda_request_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_hours_remaining NUMERIC;
BEGIN
  -- Calculate hours remaining
  v_hours_remaining := EXTRACT(EPOCH FROM (NEW.response_due_date - NOW())) / 3600;
  
  -- If less than 12 hours and still pending, update status
  IF v_hours_remaining < 12 AND NEW.response_status = 'pending' THEN
    NEW.response_status := 'urgent';
  END IF;
  
  -- If overdue, mark as overdue
  IF v_hours_remaining < 0 AND NEW.response_status != 'completed' THEN
    NEW.response_status := 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER fda_request_deadline_check
  BEFORE INSERT OR UPDATE ON fda_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_fda_request_deadline();

-- Create view for FDA response dashboard
CREATE OR REPLACE VIEW fda_response_dashboard AS
SELECT 
  fr.id,
  fr.organization_id,
  o.name as organization_name,
  fr.request_date,
  fr.response_due_date,
  fr.response_date,
  fr.response_status,
  fr.requested_lot_codes,
  fr.request_type,
  fr.fda_contact_name,
  EXTRACT(EPOCH FROM (fr.response_due_date - NOW())) / 3600 AS hours_remaining,
  CASE 
    WHEN fr.response_date IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (fr.response_date - fr.request_date)) / 3600
    ELSE NULL
  END AS response_time_hours,
  CASE
    WHEN fr.response_date IS NOT NULL THEN 'completed'
    WHEN EXTRACT(EPOCH FROM (fr.response_due_date - NOW())) / 3600 < 0 THEN 'overdue'
    WHEN EXTRACT(EPOCH FROM (fr.response_due_date - NOW())) / 3600 < 12 THEN 'urgent'
    ELSE 'on_track'
  END AS urgency_status
FROM fda_requests fr
JOIN organizations o ON o.id = fr.organization_id
ORDER BY fr.request_date DESC;

COMMENT ON FUNCTION generate_fda_traceability_report IS 'Auto-generates complete FSMA 204 traceability report for FDA requests with forward/backward trace and all CTE details';
COMMENT ON VIEW fda_response_dashboard IS 'Real-time dashboard for tracking FDA request deadlines and urgency';
