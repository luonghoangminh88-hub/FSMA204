-- =============================================
-- INVENTORY TRACKING & QUANTITY VALIDATION
-- Phase 1: Priority 1 - Critical Implementation
-- =============================================

-- Real-time inventory tracking table
CREATE TABLE IF NOT EXISTS public.lot_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.traceability_lots(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  
  -- Quantity tracking
  initial_quantity DECIMAL(15, 3) NOT NULL,
  current_quantity DECIMAL(15, 3) NOT NULL,
  reserved_quantity DECIMAL(15, 3) DEFAULT 0, -- For pending shipments
  available_quantity DECIMAL(15, 3) GENERATED ALWAYS AS (current_quantity - reserved_quantity) STORED,
  unit_of_measure TEXT NOT NULL,
  
  -- Loss/waste tracking
  total_loss DECIMAL(15, 3) DEFAULT 0,
  loss_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN initial_quantity > 0 
    THEN ((total_loss / initial_quantity) * 100)
    ELSE 0 END
  ) STORED,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'quarantine', 'disposed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(lot_id, location_id)
);

CREATE INDEX idx_lot_inventory_org ON public.lot_inventory(organization_id);
CREATE INDEX idx_lot_inventory_lot ON public.lot_inventory(lot_id);
CREATE INDEX idx_lot_inventory_location ON public.lot_inventory(location_id);
CREATE INDEX idx_lot_inventory_status ON public.lot_inventory(status);

ALTER TABLE public.lot_inventory ENABLE ROW LEVEL SECURITY;

-- Inventory transaction log
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  lot_inventory_id UUID REFERENCES public.lot_inventory(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receipt', 'shipment', 'transformation_input', 'transformation_output', 'adjustment', 'loss', 'disposal')),
  quantity_change DECIMAL(15, 3) NOT NULL, -- Positive for additions, negative for reductions
  quantity_before DECIMAL(15, 3) NOT NULL,
  quantity_after DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  
  -- References
  cte_event_id UUID REFERENCES public.cte_events(id),
  reference_lot_id UUID REFERENCES public.traceability_lots(id), -- For transformations
  
  -- Reason and notes
  reason TEXT,
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_txn_org ON public.inventory_transactions(organization_id);
CREATE INDEX idx_inventory_txn_inventory ON public.inventory_transactions(lot_inventory_id);
CREATE INDEX idx_inventory_txn_type ON public.inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_txn_date ON public.inventory_transactions(created_at);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- VALIDATION FUNCTIONS
-- =============================================

-- Function to validate transformation quantity balance
CREATE OR REPLACE FUNCTION validate_transformation_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_input DECIMAL(15, 3);
  total_output DECIMAL(15, 3);
  calculated_loss DECIMAL(15, 3);
  max_acceptable_loss DECIMAL(15, 3);
BEGIN
  -- Get total input quantity
  SELECT COALESCE(SUM(quantity_used), 0)
  INTO total_input
  FROM public.transformation_inputs
  WHERE transformation_id = NEW.id;
  
  -- Get output quantity
  total_output := NEW.output_quantity;
  
  -- Calculate loss
  calculated_loss := NEW.input_quantity - total_output;
  
  -- Max acceptable loss is 30% (configurable per organization)
  max_acceptable_loss := NEW.input_quantity * 0.30;
  
  -- Validate: Input must equal output + loss
  IF ABS(NEW.input_quantity - (total_output + calculated_loss)) > 0.01 THEN
    RAISE EXCEPTION 'Quantity reconciliation failed: Input (%) ≠ Output (%) + Loss (%)',
      NEW.input_quantity, total_output, calculated_loss;
  END IF;
  
  -- Validate: Loss should not exceed acceptable threshold
  IF calculated_loss > max_acceptable_loss THEN
    RAISE WARNING 'Loss percentage (%) exceeds acceptable threshold (30%%)', 
      (calculated_loss / NEW.input_quantity * 100);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transformation validation
DROP TRIGGER IF EXISTS validate_transformation_trigger ON public.cte_transformation;
CREATE TRIGGER validate_transformation_trigger
  BEFORE INSERT OR UPDATE ON public.cte_transformation
  FOR EACH ROW
  EXECUTE FUNCTION validate_transformation_balance();

-- Function to prevent child lot exceeding parent quantity
CREATE OR REPLACE FUNCTION validate_child_lot_quantity()
RETURNS TRIGGER AS $$
DECLARE
  parent_available_qty DECIMAL(15, 3);
  parent_uom TEXT;
  total_children_qty DECIMAL(15, 3);
BEGIN
  -- Only validate if lot has a parent
  IF NEW.parent_lot_id IS NOT NULL THEN
    -- Get parent lot details
    SELECT quantity, unit_of_measure
    INTO parent_available_qty, parent_uom
    FROM public.traceability_lots
    WHERE id = NEW.parent_lot_id;
    
    -- Get total quantity already allocated to other children
    SELECT COALESCE(SUM(quantity), 0)
    INTO total_children_qty
    FROM public.traceability_lots
    WHERE parent_lot_id = NEW.parent_lot_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Validate: Child quantities cannot exceed parent
    IF (total_children_qty + NEW.quantity) > parent_available_qty THEN
      RAISE EXCEPTION 'Child lot quantity (% %) exceeds available parent quantity (% %)',
        NEW.quantity, NEW.unit_of_measure, 
        (parent_available_qty - total_children_qty), parent_uom;
    END IF;
    
    -- Validate: Units must match
    IF NEW.unit_of_measure != parent_uom THEN
      RAISE EXCEPTION 'Child lot unit (%) must match parent unit (%)',
        NEW.unit_of_measure, parent_uom;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for child lot validation
DROP TRIGGER IF EXISTS validate_child_lot_trigger ON public.traceability_lots;
CREATE TRIGGER validate_child_lot_trigger
  BEFORE INSERT OR UPDATE ON public.traceability_lots
  FOR EACH ROW
  EXECUTE FUNCTION validate_child_lot_quantity();

-- Function to auto-update inventory on lot creation
CREATE OR REPLACE FUNCTION auto_create_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Create inventory record for new lot
  INSERT INTO public.lot_inventory (
    organization_id,
    lot_id,
    initial_quantity,
    current_quantity,
    unit_of_measure
  ) VALUES (
    NEW.organization_id,
    NEW.id,
    NEW.quantity,
    NEW.quantity,
    NEW.unit_of_measure
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create inventory
DROP TRIGGER IF EXISTS auto_create_inventory_trigger ON public.traceability_lots;
CREATE TRIGGER auto_create_inventory_trigger
  AFTER INSERT ON public.traceability_lots
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_inventory();

COMMENT ON TABLE public.lot_inventory IS 'Real-time inventory tracking for each lot at each location';
COMMENT ON TABLE public.inventory_transactions IS 'Complete audit trail of all inventory movements';
