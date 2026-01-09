-- Phase 3 Priority 3: Batch Operations
-- Bulk lot creation, mass transformation, batch status updates

-- Function for bulk lot creation from harvesting event
CREATE OR REPLACE FUNCTION create_lots_from_harvest_batch(
  p_harvest_event_id UUID,
  p_lot_prefix TEXT,
  p_lots_to_create INTEGER,
  p_organization_id UUID
)
RETURNS TABLE(lot_id UUID, lot_code TEXT, quantity NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_harvest_data RECORD;
  v_quantity_per_lot NUMERIC;
  v_lot_code TEXT;
  v_lot_id UUID;
  v_counter INTEGER := 1;
BEGIN
  -- Get harvest event details
  SELECT 
    h.commodity,
    h.variety,
    h.quantity_harvested,
    h.unit_of_measure,
    h.harvest_date,
    ce.location_id
  INTO v_harvest_data
  FROM cte_harvesting h
  JOIN cte_events ce ON ce.id = h.cte_event_id
  WHERE h.cte_event_id = p_harvest_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Harvest event not found';
  END IF;

  -- Calculate quantity per lot
  v_quantity_per_lot := v_harvest_data.quantity_harvested / p_lots_to_create;

  -- Create lots
  WHILE v_counter <= p_lots_to_create LOOP
    -- Generate TLC
    v_lot_code := generate_tlc(
      p_organization_id,
      v_harvest_data.commodity,
      v_harvest_data.location_id
    );

    -- Insert lot
    INSERT INTO traceability_lots (
      organization_id,
      lot_code,
      product_description,
      quantity,
      unit_of_measure,
      production_date,
      status,
      created_by
    ) VALUES (
      p_organization_id,
      v_lot_code,
      v_harvest_data.commodity || ' - ' || COALESCE(v_harvest_data.variety, ''),
      v_quantity_per_lot,
      v_harvest_data.unit_of_measure,
      v_harvest_data.harvest_date,
      'active',
      auth.uid()
    )
    RETURNING id INTO v_lot_id;

    -- Link lot to harvest event
    INSERT INTO cte_lot_links (
      cte_event_id,
      lot_id,
      quantity,
      unit_of_measure
    ) VALUES (
      p_harvest_event_id,
      v_lot_id,
      v_quantity_per_lot,
      v_harvest_data.unit_of_measure
    );

    -- Create initial inventory record
    INSERT INTO lot_inventory (
      organization_id,
      lot_id,
      location_id,
      initial_quantity,
      current_quantity,
      available_quantity,
      unit_of_measure,
      status
    ) VALUES (
      p_organization_id,
      v_lot_id,
      v_harvest_data.location_id,
      v_quantity_per_lot,
      v_quantity_per_lot,
      v_quantity_per_lot,
      v_harvest_data.unit_of_measure,
      'in_stock'
    );

    -- Return created lot info
    lot_id := v_lot_id;
    lot_code := v_lot_code;
    quantity := v_quantity_per_lot;
    RETURN NEXT;

    v_counter := v_counter + 1;
  END LOOP;
END;
$$;

-- Function for mass transformation (multiple inputs → multiple outputs)
CREATE OR REPLACE FUNCTION create_mass_transformation(
  p_organization_id UUID,
  p_input_lots JSONB, -- Array of {lot_id, quantity_used}
  p_transformation_type TEXT,
  p_transformation_description TEXT,
  p_output_product_description TEXT,
  p_outputs_to_create INTEGER,
  p_total_output_quantity NUMERIC,
  p_output_unit TEXT,
  p_location_id UUID,
  p_transformation_date DATE
)
RETURNS TABLE(output_lot_id UUID, output_lot_code TEXT, output_quantity NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_input_lot JSONB;
  v_total_input NUMERIC := 0;
  v_total_loss NUMERIC;
  v_yield_percentage NUMERIC;
  v_output_quantity_per_lot NUMERIC;
  v_transformation_event_id UUID;
  v_transformation_id UUID;
  v_output_lot_id UUID;
  v_output_lot_code TEXT;
  v_counter INTEGER := 1;
BEGIN
  -- Calculate total input
  FOR v_input_lot IN SELECT * FROM jsonb_array_elements(p_input_lots)
  LOOP
    v_total_input := v_total_input + (v_input_lot->>'quantity_used')::NUMERIC;
  END LOOP;

  -- Calculate loss and yield
  v_total_loss := v_total_input - p_total_output_quantity;
  v_yield_percentage := (p_total_output_quantity / NULLIF(v_total_input, 0)) * 100;

  -- Create CTE transformation event
  INSERT INTO cte_events (
    organization_id,
    event_type,
    event_datetime,
    location_id,
    created_by
  ) VALUES (
    p_organization_id,
    'transformation',
    p_transformation_date,
    p_location_id,
    auth.uid()
  )
  RETURNING id INTO v_transformation_event_id;

  -- Create transformation record
  INSERT INTO cte_transformation (
    cte_event_id,
    transformation_type,
    transformation_description,
    transformation_date,
    transformation_location_id,
    input_quantity,
    output_quantity,
    loss_quantity,
    yield_percentage,
    output_product_description,
    output_unit_of_measure
  ) VALUES (
    v_transformation_event_id,
    p_transformation_type,
    p_transformation_description,
    p_transformation_date,
    p_location_id,
    v_total_input,
    p_total_output_quantity,
    v_total_loss,
    v_yield_percentage,
    p_output_product_description,
    p_output_unit
  )
  RETURNING id INTO v_transformation_id;

  -- Link input lots and update their inventory
  FOR v_input_lot IN SELECT * FROM jsonb_array_elements(p_input_lots)
  LOOP
    -- Link to transformation
    INSERT INTO transformation_inputs (
      transformation_id,
      input_lot_id,
      quantity_used,
      unit_of_measure
    ) VALUES (
      v_transformation_id,
      (v_input_lot->>'lot_id')::UUID,
      (v_input_lot->>'quantity_used')::NUMERIC,
      (v_input_lot->>'unit_of_measure')::TEXT
    );

    -- Update input lot inventory (will trigger automatic inventory transaction)
    UPDATE lot_inventory
    SET current_quantity = current_quantity - (v_input_lot->>'quantity_used')::NUMERIC,
        available_quantity = available_quantity - (v_input_lot->>'quantity_used')::NUMERIC
    WHERE lot_id = (v_input_lot->>'lot_id')::UUID
      AND organization_id = p_organization_id;
  END LOOP;

  -- Create output lots
  v_output_quantity_per_lot := p_total_output_quantity / p_outputs_to_create;

  WHILE v_counter <= p_outputs_to_create LOOP
    -- Generate TLC for output lot
    v_output_lot_code := generate_tlc(
      p_organization_id,
      p_output_product_description,
      p_location_id
    );

    -- Create output lot
    INSERT INTO traceability_lots (
      organization_id,
      lot_code,
      product_description,
      quantity,
      unit_of_measure,
      production_date,
      parent_lot_id,
      status,
      created_by
    ) VALUES (
      p_organization_id,
      v_output_lot_code,
      p_output_product_description,
      v_output_quantity_per_lot,
      p_output_unit,
      p_transformation_date,
      (p_input_lots->0->>'lot_id')::UUID, -- Use first input as parent
      'active',
      auth.uid()
    )
    RETURNING id INTO v_output_lot_id;

    -- Link output lot to transformation event
    INSERT INTO cte_lot_links (
      cte_event_id,
      lot_id,
      quantity,
      unit_of_measure
    ) VALUES (
      v_transformation_event_id,
      v_output_lot_id,
      v_output_quantity_per_lot,
      p_output_unit
    );

    -- Create inventory record for output lot
    INSERT INTO lot_inventory (
      organization_id,
      lot_id,
      location_id,
      initial_quantity,
      current_quantity,
      available_quantity,
      unit_of_measure,
      status
    ) VALUES (
      p_organization_id,
      v_output_lot_id,
      p_location_id,
      v_output_quantity_per_lot,
      v_output_quantity_per_lot,
      v_output_quantity_per_lot,
      p_output_unit,
      'in_stock'
    );

    -- Return output lot info
    output_lot_id := v_output_lot_id;
    output_lot_code := v_output_lot_code;
    output_quantity := v_output_quantity_per_lot;
    RETURN NEXT;

    v_counter := v_counter + 1;
  END LOOP;
END;
$$;

-- Function for batch status updates
CREATE OR REPLACE FUNCTION batch_update_lot_status(
  p_lot_ids UUID[],
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(lot_id UUID, old_status TEXT, new_status TEXT, updated BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lot_id UUID;
  v_old_status TEXT;
  v_updated BOOLEAN;
BEGIN
  FOREACH v_lot_id IN ARRAY p_lot_ids
  LOOP
    -- Get current status
    SELECT status INTO v_old_status
    FROM traceability_lots
    WHERE id = v_lot_id;

    IF FOUND THEN
      -- Update status
      UPDATE traceability_lots
      SET status = p_new_status,
          updated_at = NOW()
      WHERE id = v_lot_id;

      -- Log in audit
      INSERT INTO audit_log (
        organization_id,
        user_id,
        table_name,
        action,
        record_id,
        old_data,
        new_data
      )
      SELECT 
        organization_id,
        auth.uid(),
        'traceability_lots',
        'UPDATE',
        id,
        jsonb_build_object('status', v_old_status, 'reason', p_reason),
        jsonb_build_object('status', p_new_status, 'reason', p_reason)
      FROM traceability_lots
      WHERE id = v_lot_id;

      v_updated := TRUE;
    ELSE
      v_updated := FALSE;
    END IF;

    -- Return result
    lot_id := v_lot_id;
    old_status := v_old_status;
    new_status := p_new_status;
    updated := v_updated;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION create_lots_from_harvest_batch IS 'Bulk creates multiple lots from a single harvesting event, automatically generating TLCs and inventory records';
COMMENT ON FUNCTION create_mass_transformation IS 'Creates a transformation with multiple input lots producing multiple output lots, with automatic inventory tracking';
COMMENT ON FUNCTION batch_update_lot_status IS 'Updates status for multiple lots at once with automatic audit logging';
