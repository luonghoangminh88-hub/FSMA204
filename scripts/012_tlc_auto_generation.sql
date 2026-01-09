-- =============================================
-- PHASE 2: TLC (TRACEABILITY LOT CODE) AUTO-GENERATION
-- Implements FSMA 204 compliant TLC generation with format validation
-- =============================================

-- TLC Sequence counter per organization
CREATE SEQUENCE IF NOT EXISTS public.tlc_sequence_counter START 1000;

-- Function to generate TLC with standard format
-- Format: {ORG_CODE}-{FOOD_CODE}-{LOCATION}-{DATE}-{SEQUENCE}
-- Example: HAC-LG01-F001-20250131-1234
CREATE OR REPLACE FUNCTION generate_tlc(
  p_organization_id UUID,
  p_food_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_production_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT AS $$
DECLARE
  org_code TEXT;
  food_code TEXT;
  location_code TEXT;
  date_part TEXT;
  sequence_num INTEGER;
  new_tlc TEXT;
  attempt INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- Get organization code (first 3 letters or create from name)
  SELECT COALESCE(
    UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'), 1, 3)),
    'ORG'
  )
  INTO org_code
  FROM public.organizations
  WHERE id = p_organization_id;

  IF org_code IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_organization_id;
  END IF;

  -- Get food code (from FTL food definition)
  IF p_food_id IS NOT NULL THEN
    SELECT COALESCE(food_code, 'UNKN')
    INTO food_code
    FROM public.ftl_foods
    WHERE id = p_food_id;
  ELSE
    food_code := 'PROD';
  END IF;

  -- Get location code
  IF p_location_id IS NOT NULL THEN
    SELECT COALESCE(location_code, 'LOC')
    INTO location_code
    FROM public.locations
    WHERE id = p_location_id;
  ELSE
    location_code := 'LOC';
  END IF;

  -- Format date as YYYYMMDD
  date_part := TO_CHAR(p_production_date, 'YYYYMMDD');

  -- Generate TLC with retry logic for uniqueness
  LOOP
    -- Get next sequence number
    sequence_num := nextval('public.tlc_sequence_counter');
    
    -- Format TLC
    new_tlc := FORMAT('%s-%s-%s-%s-%s',
      org_code,
      food_code,
      location_code,
      date_part,
      LPAD(sequence_num::TEXT, 4, '0')
    );

    -- Check if TLC already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.traceability_lots
      WHERE lot_code = new_tlc
    ) THEN
      EXIT; -- TLC is unique, exit loop
    END IF;

    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique TLC after % attempts', max_attempts;
    END IF;
  END LOOP;

  RETURN new_tlc;
END;
$$ LANGUAGE plpgsql;

-- Function to validate TLC format
CREATE OR REPLACE FUNCTION validate_tlc_format(tlc TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- TLC should match pattern: XXX-XXXX-XXXX-YYYYMMDD-####
  -- Or allow custom format with minimum requirements
  IF tlc IS NULL OR LENGTH(tlc) < 10 THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain at least one dash and alphanumeric characters
  IF tlc !~ '^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[0-9]{8}-[0-9]{4,}$' THEN
    -- Allow more flexible format but warn
    IF tlc !~ '^[A-Z0-9-_]+$' THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Auto-assign TLC on lot creation if not provided
CREATE OR REPLACE FUNCTION auto_assign_tlc()
RETURNS TRIGGER AS $$
BEGIN
  -- If lot_code is not provided, auto-generate it
  IF NEW.lot_code IS NULL OR TRIM(NEW.lot_code) = '' THEN
    NEW.lot_code := generate_tlc(
      NEW.organization_id,
      NEW.food_id,
      NULL, -- location can be added if available in context
      COALESCE(NEW.production_date, CURRENT_DATE)
    );
    RAISE NOTICE 'Auto-generated TLC: %', NEW.lot_code;
  ELSE
    -- Validate provided TLC format
    IF NOT validate_tlc_format(UPPER(NEW.lot_code)) THEN
      RAISE WARNING 'TLC "%" does not follow recommended format. Consider format: ORG-FOOD-LOC-YYYYMMDD-####', NEW.lot_code;
    END IF;
    
    -- Normalize to uppercase
    NEW.lot_code := UPPER(TRIM(NEW.lot_code));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for TLC auto-generation
DROP TRIGGER IF EXISTS assign_tlc_on_insert ON public.traceability_lots;
CREATE TRIGGER assign_tlc_on_insert
  BEFORE INSERT ON public.traceability_lots
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_tlc();

-- Add unique constraint to prevent duplicate TLCs across organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tlc_per_org 
  ON public.traceability_lots(organization_id, lot_code);

-- Function to suggest TLC for UI
CREATE OR REPLACE FUNCTION suggest_tlc(
  p_organization_id UUID,
  p_food_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_production_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT AS $$
BEGIN
  RETURN generate_tlc(p_organization_id, p_food_id, p_location_id, p_production_date);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION suggest_tlc IS 'Generate TLC suggestion for UI without inserting into database';
COMMENT ON FUNCTION generate_tlc IS 'Generate unique FSMA 204 compliant Traceability Lot Code';
COMMENT ON FUNCTION validate_tlc_format IS 'Validate TLC follows recommended format pattern';
