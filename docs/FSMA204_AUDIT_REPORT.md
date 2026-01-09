# FSMA 204 Traceability System Audit Report
**Date:** December 31, 2025  
**Auditor:** v0 AI Assistant  
**System:** fsma204saas

---

## Executive Summary

This comprehensive audit evaluates the FSMA 204 compliance implementation across database schema, application logic, user workflows, and data integrity. The system demonstrates a solid foundation with proper schema design and role-based access control, but requires improvements in traceability queries, quantity reconciliation, and audit logging automation.

---

## 1. FORWARD & BACKWARD TRACEABILITY

### Current Implementation

#### ✅ Strengths:
- **Lot Hierarchy**: `parent_lot_id` in `traceability_lots` table enables parent-child tracking
- **Event Linkage**: `cte_lot_links` table connects lots to CTE events
- **Transformation Inputs**: `transformation_inputs` table supports multi-input transformations
- **Reference Documentation**: CTE events include document type and number fields

#### ⚠️ Critical Gaps:
1. **No Bidirectional Query Functions**: System lacks functions to traverse forward (downstream) and backward (upstream) from a lot code
2. **Mock Data in UI**: `TraceabilityChainViewer` component uses hardcoded mock data instead of real database queries
3. **Limited Transformation Tracking**: `transformation_inputs` table exists but isn't populated by UI forms
4. **No Supply Chain Integration**: Supplier/customer tracking not connected to traceability chain

### Traceability Flow (Per FSMA 204):

\`\`\`
BACKWARD (Upstream)              FORWARD (Downstream)
←←←←←←←←←←←←←←←←←←←←←←←←←←←←→→→→→→→→→→→→→→→→→→→→→→→→→→→

Supplier → Receiving → Harvesting → Cooling → Initial Packing → Shipping → Customer
                                                    ↓
                                              Transformation
                                                    ↓
                                              New Lot Created
\`\`\`

### Required Implementation:

\`\`\`sql
-- Example: Backward Traceability Query
WITH RECURSIVE lot_chain AS (
  -- Base: Start from target lot
  SELECT id, lot_code, parent_lot_id, 1 as depth
  FROM traceability_lots
  WHERE lot_code = 'TARGET_LOT_CODE'
  
  UNION ALL
  
  -- Recursive: Get parent lots
  SELECT t.id, t.lot_code, t.parent_lot_id, lc.depth + 1
  FROM traceability_lots t
  INNER JOIN lot_chain lc ON t.id = lc.parent_lot_id
)
SELECT * FROM lot_chain ORDER BY depth DESC;

-- Example: Forward Traceability Query
WITH RECURSIVE lot_children AS (
  -- Base: Start from source lot
  SELECT id, lot_code, parent_lot_id, 1 as depth
  FROM traceability_lots
  WHERE lot_code = 'SOURCE_LOT_CODE'
  
  UNION ALL
  
  -- Recursive: Get child lots
  SELECT t.id, t.lot_code, t.parent_lot_id, lc.depth + 1
  FROM traceability_lots t
  INNER JOIN lot_children lc ON t.parent_lot_id = lc.id
)
SELECT * FROM lot_children ORDER BY depth;
\`\`\`

---

## 2. QUANTITY & INVENTORY CALCULATIONS

### Current Implementation

#### ✅ Auto-Calculated Fields:

**Initial Packing Loss** (`kde-form.tsx` lines 314-319):
\`\`\`typescript
loss_quantity = quantity_received - quantity_packed
loss_percentage = (loss_quantity / quantity_received) * 100
\`\`\`

**Transformation Yield** (`kde-form.tsx` lines 328-333):
\`\`\`typescript
yield_percentage = (output_quantity / input_quantity) * 100
loss_quantity = input_quantity - output_quantity
\`\`\`

**Analytics Aggregations** (`analytics/page.tsx`):
- Average loss rate across all transformations
- Compliance score based on lot data completeness

#### ⚠️ Critical Gaps:

1. **No Inventory Balance Tracking**
   - System has NO current inventory table
   - Can't answer: "How much of LOT-2025-001 is currently available?"
   
2. **No Quantity Reconciliation**
   - Input quantities ≠ Output quantities + losses (not verified)
   - Example Issue: Harvesting 1000 kg → Cooling shows 1200 kg (no validation)

3. **No Parent Lot Depletion Validation**
   - Child lot can be created from parent lot without checking available quantity
   - Parent lot with 100 kg can spawn child lots totaling 500 kg (no error)

4. **No Real-Time Loss Rate Alerts**
   - Loss calculations stored but not monitored
   - No alerts when loss exceeds acceptable threshold

### Recommended Implementation:

\`\`\`sql
-- Create inventory tracking table
CREATE TABLE lot_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID REFERENCES traceability_lots(id) NOT NULL,
  location_id UUID REFERENCES locations(id),
  available_quantity NUMERIC NOT NULL CHECK (available_quantity >= 0),
  reserved_quantity NUMERIC DEFAULT 0,
  unit_of_measure TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Create quantity reconciliation function
CREATE OR REPLACE FUNCTION validate_transformation_quantities()
RETURNS TRIGGER AS $$
DECLARE
  total_inputs NUMERIC;
  expected_output NUMERIC;
  variance_pct NUMERIC;
BEGIN
  -- Sum all input quantities
  SELECT COALESCE(SUM(quantity_used), 0) 
  INTO total_inputs
  FROM transformation_inputs
  WHERE transformation_id = NEW.id;
  
  -- Check if output + loss = input (within 5% tolerance)
  expected_output := NEW.output_quantity + COALESCE(NEW.loss_quantity, 0);
  variance_pct := ABS((total_inputs - expected_output) / NULLIF(total_inputs, 0)) * 100;
  
  IF variance_pct > 5 THEN
    RAISE EXCEPTION 'Quantity reconciliation failed: Input (%) ≠ Output + Loss (%). Variance: %%',
      total_inputs, expected_output, variance_pct;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_transformation_quantities
  BEFORE INSERT OR UPDATE ON cte_transformation
  FOR EACH ROW
  EXECUTE FUNCTION validate_transformation_quantities();
\`\`\`

---

## 3. TIMELINE LOGIC & VALIDATION

### Current Implementation

#### ✅ Strengths:
- `event_datetime` field in `cte_events` table (TIMESTAMPTZ)
- Events sorted chronologically in UI
- `flattenChainToTimeline()` function converts tree to timeline

#### ⚠️ Critical Gaps:

1. **No Temporal Sequence Validation**
   \`\`\`
   Current System Allows:
   - Cooling event BEFORE harvesting event ❌
   - Shipping event with date < receiving date ❌
   - Transformation output date < input harvest date ❌
   \`\`\`

2. **No Shelf Life Monitoring**
   - `ftl_foods.shelf_life_days` exists but unused
   - No expiration date calculation or warnings

3. **No Event Dependency Validation**
   - Can create "Initial Packing" event without prior "Harvesting" event
   - Can ship product before it's received

### Recommended Implementation:

\`\`\`sql
-- Validate event sequence
CREATE OR REPLACE FUNCTION validate_cte_sequence()
RETURNS TRIGGER AS $$
DECLARE
  previous_event_date TIMESTAMPTZ;
  lot_production_date DATE;
BEGIN
  -- Get lot production date
  SELECT tl.production_date INTO lot_production_date
  FROM cte_lot_links cll
  JOIN traceability_lots tl ON cll.lot_id = tl.id
  WHERE cll.cte_event_id = NEW.id
  LIMIT 1;
  
  -- Event cannot occur before lot production
  IF NEW.event_datetime::DATE < lot_production_date THEN
    RAISE EXCEPTION 'Event datetime (%) cannot be before lot production date (%)',
      NEW.event_datetime, lot_production_date;
  END IF;
  
  -- For transformation events, check all input lot dates
  IF NEW.event_type = 'transformation' THEN
    SELECT MAX(tl.production_date) INTO previous_event_date
    FROM transformation_inputs ti
    JOIN traceability_lots tl ON ti.input_lot_id = tl.id
    WHERE ti.transformation_id IN (
      SELECT id FROM cte_transformation WHERE cte_event_id = NEW.id
    );
    
    IF NEW.event_datetime::DATE < previous_event_date THEN
      RAISE EXCEPTION 'Transformation date cannot be before input lot dates';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_event_sequence
  BEFORE INSERT OR UPDATE ON cte_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_cte_sequence();
\`\`\`

---

## 4. AUDIT LOGGING

### Current Implementation

#### ✅ Strengths:
- **Audit Log Table** exists with comprehensive fields:
  - `action`, `table_name`, `record_id`
  - `old_data`, `new_data` (JSONB for full change tracking)
  - `user_id`, `organization_id`, `ip_address`, `user_agent`
- **Immutable by design**: RLS policies prevent updates/deletes
- **Sensitive access logging**: Function to log profile queries

#### ⚠️ Critical Gaps:

1. **No Automatic Triggers**
   - Audit log entries must be manually inserted by application code
   - Database changes not automatically logged
   - Risk: Developer forgets to add audit logging to new features

2. **No CTE-Specific Audit Trail**
   - Transformation yield changes not tracked with approver
   - Loss reason edits not logged
   - Critical KDE field modifications invisible in audit

3. **No FDA Request Audit**
   - FDA requests can be updated without change history
   - Response generation process not logged

4. **No Approval Workflows**
   - High-risk events (transformations, large losses) not require approval
   - No "approved_by" field or approval timestamp

### Recommended Implementation:

\`\`\`sql
-- Auto-audit trigger function
CREATE OR REPLACE FUNCTION auto_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    action,
    record_id,
    old_data,
    new_data,
    user_id,
    organization_id,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    COALESCE(NEW.organization_id, OLD.organization_id),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to all critical tables
CREATE TRIGGER audit_cte_events
  AFTER INSERT OR UPDATE OR DELETE ON cte_events
  FOR EACH ROW EXECUTE FUNCTION auto_audit_changes();

CREATE TRIGGER audit_traceability_lots
  AFTER INSERT OR UPDATE OR DELETE ON traceability_lots
  FOR EACH ROW EXECUTE FUNCTION auto_audit_changes();

CREATE TRIGGER audit_transformations
  AFTER INSERT OR UPDATE OR DELETE ON cte_transformation
  FOR EACH ROW EXECUTE FUNCTION auto_audit_changes();

-- Add approval workflow
ALTER TABLE cte_transformation ADD COLUMN approved_by UUID REFERENCES profiles(id);
ALTER TABLE cte_transformation ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE cte_transformation ADD COLUMN approval_notes TEXT;

CREATE OR REPLACE FUNCTION require_transformation_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Transformations with >10% loss require manager approval
  IF NEW.loss_percentage > 10 AND NEW.approved_by IS NULL THEN
    RAISE EXCEPTION 'Transformations with >10%% loss require manager approval';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_transformation_approval
  BEFORE INSERT OR UPDATE ON cte_transformation
  FOR EACH ROW EXECUTE FUNCTION require_transformation_approval();
\`\`\`

---

## 5. TLC (TRACEABILITY LOT CODE) GENERATION

### FSMA 204 Requirement Analysis

According to FSMA 204, a Traceability Lot Code (TLC) must be assigned at:
1. **Initial Packing** (for domestic products)
2. **First Receiver** (for seafood and imported products)
3. **Transformation** (when creating new product)

### Current Implementation

#### TLC Assignment Points:
- `cte_initial_packing.assigned_lot_code` ✅
- `cte_first_receiver.assigned_lot_code` ✅
- `cte_transformation.assigned_lot_code` ✅

#### ⚠️ Issues:
1. **Manual Entry**: TLC entered manually by user (prone to errors/duplicates)
2. **No Format Validation**: No regex check for TLC format
3. **No Auto-Generation**: System doesn't suggest/generate TLCs
4. **No Duplicate Prevention**: Can assign same TLC to multiple lots

### Recommended TLC Format:

\`\`\`
Format: ORG-YYYY-FOOD-NNNN-LOC
Example: ABC-2025-LETT-0001-F01

Where:
- ORG: Organization code (3 chars)
- YYYY: Year
- FOOD: Food code (4 chars, from ftl_foods)
- NNNN: Sequential number (4 digits)
- LOC: Location code (3 chars)
\`\`\`

### Implementation:

\`\`\`sql
-- TLC auto-generation function
CREATE OR REPLACE FUNCTION generate_tlc(
  p_organization_id UUID,
  p_food_id UUID,
  p_location_id UUID
) RETURNS TEXT AS $$
DECLARE
  org_code TEXT;
  food_code TEXT;
  loc_code TEXT;
  current_year TEXT;
  next_sequence INT;
  new_tlc TEXT;
BEGIN
  -- Get codes
  SELECT LEFT(UPPER(REPLACE(name, ' ', '')), 3) INTO org_code
  FROM organizations WHERE id = p_organization_id;
  
  SELECT LEFT(food_code, 4) INTO food_code
  FROM ftl_foods WHERE id = p_food_id;
  
  SELECT LEFT(location_code, 3) INTO loc_code
  FROM locations WHERE id = p_location_id;
  
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(lot_code FROM '\d{4}(?=-[A-Z0-9]{3}$)') AS INT)
  ), 0) + 1
  INTO next_sequence
  FROM traceability_lots
  WHERE organization_id = p_organization_id
    AND lot_code LIKE org_code || '-' || current_year || '-%';
  
  -- Format TLC
  new_tlc := FORMAT('%s-%s-%s-%s-%s',
    org_code,
    current_year,
    food_code,
    LPAD(next_sequence::TEXT, 4, '0'),
    loc_code
  );
  
  RETURN new_tlc;
END;
$$ LANGUAGE plpgsql;

-- Prevent duplicate TLCs
CREATE UNIQUE INDEX idx_unique_lot_code ON traceability_lots(lot_code);

-- Auto-assign TLC on lot creation if not provided
CREATE OR REPLACE FUNCTION auto_assign_tlc()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lot_code IS NULL OR NEW.lot_code = '' THEN
    -- Try to determine location from most recent CTE event
    NEW.lot_code := generate_tlc(
      NEW.organization_id,
      NEW.food_id,
      (SELECT location_id FROM cte_events 
       WHERE organization_id = NEW.organization_id 
       ORDER BY created_at DESC LIMIT 1)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_tlc_on_insert
  BEFORE INSERT ON traceability_lots
  FOR EACH ROW EXECUTE FUNCTION auto_assign_tlc();
\`\`\`

---

## 6. KEY RECOMMENDATIONS

### Priority 1 (Critical - Implement Immediately)

1. **Implement Bidirectional Traceability Queries**
   - Create recursive SQL functions for forward/backward trace
   - Replace mock data in `TraceabilityChainViewer` with real queries
   - Add API endpoints: `/api/trace/forward/:lotCode` and `/api/trace/backward/:lotCode`

2. **Add Quantity Reconciliation Validation**
   - Create database triggers to validate input = output + loss
   - Add inventory tracking table for real-time balance
   - Prevent child lot creation exceeding parent quantity

3. **Implement Automatic Audit Logging**
   - Add triggers to all CTE tables for automatic audit trail
   - Log all changes to `old_data` and `new_data` JSONB fields
   - Add approval workflow for high-risk transformations

### Priority 2 (Important - Implement Within 30 Days)

4. **Add Timeline Validation**
   - Create triggers to prevent events out of chronological order
   - Validate transformation dates > all input lot dates
   - Add shelf-life expiration warnings

5. **Implement TLC Auto-Generation**
   - Create TLC generation function with standard format
   - Add unique constraint to prevent duplicate TLCs
   - Provide UI suggestion feature for manual override

6. **Connect Supply Chain Partners to Traceability**
   - Link `supply_chain_partners` to CTE shipping/receiving events
   - Track which partner handled each lot
   - Enable partner-based traceability queries

### Priority 3 (Enhancement - Implement Within 90 Days)

7. **Build FDA Response Integration**
   - Auto-generate traceability report from lot code
   - Export forward + backward trace with all CTE details
   - Track 24-hour response deadline with alerts

8. **Add Real-Time Dashboards**
   - Inventory levels by location
   - Loss rate trends over time
   - Compliance score by organization/user
   - Pending approvals queue

9. **Implement Batch Operations**
   - Bulk lot creation from harvesting event
   - Mass transformation (multiple inputs → multiple outputs)
   - Batch status updates

---

## 7. COMPLIANCE SCORE

| Category | Score | Status |
|---|---|---|
| Database Schema Design | 95% | ✅ Excellent |
| Forward Traceability | 40% | ⚠️ Needs Work |
| Backward Traceability | 40% | ⚠️ Needs Work |
| Quantity Reconciliation | 30% | ❌ Critical Gap |
| Timeline Validation | 25% | ❌ Critical Gap |
| Audit Logging | 60% | ⚠️ Needs Automation |
| TLC Management | 70% | ⚠️ Needs Auto-Generation |
| RLS Security | 90% | ✅ Excellent |
| **OVERALL COMPLIANCE** | **56%** | **⚠️ MAJOR IMPROVEMENTS NEEDED** |

---

## 8. CONCLUSION

Your FSMA 204 system has a strong foundation with excellent database schema design and proper role-based security. However, critical gaps in traceability queries, quantity reconciliation, and audit automation prevent it from meeting full compliance requirements.

**Immediate Action Required:**
- Implement bidirectional traceability queries (replaces mock data)
- Add quantity validation triggers (prevents data integrity issues)
- Enable automatic audit logging (meets FDA record-keeping requirements)

**Timeline to Full Compliance:**
- Priority 1 items: 2-3 weeks
- Priority 2 items: 4-6 weeks
- Priority 3 items: 8-12 weeks
- **Total: 3 months to achieve 90%+ compliance**

The system is functional for basic tracking but requires these enhancements before relying on it for FDA audits or recall responses.
