-- FSMA 204 Compliance System Database Schema
-- This schema implements the complete FSMA 204 Food Traceability Rule

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ORGANIZATIONS & USER MANAGEMENT
-- =============================================

-- Organizations table (multi-tenant support)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('farm', 'packer', 'processor', 'distributor', 'retailer', 'restaurant', 'other')),
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  tax_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles with role-based access control
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('system_admin', 'org_admin', 'manager', 'operator', 'viewer')),
  language_preference TEXT DEFAULT 'en' CHECK (language_preference IN ('en', 'vi')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FOOD TRACEABILITY LIST (FTL)
-- =============================================

-- Food categories from FDA FTL
CREATE TABLE IF NOT EXISTS public.food_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_name TEXT NOT NULL, -- e.g., 'Leafy Greens', 'Soft Cheese', 'Shell Eggs'
  category_code TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specific foods on the FTL
CREATE TABLE IF NOT EXISTS public.ftl_foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.food_categories(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  food_code TEXT UNIQUE NOT NULL,
  variety TEXT,
  scientific_name TEXT,
  description TEXT,
  requires_temperature_control BOOLEAN DEFAULT false,
  shelf_life_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LOCATIONS & FACILITIES
-- =============================================

-- Locations (farms, facilities, warehouses, etc.)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL CHECK (location_type IN ('farm', 'field', 'growing_area', 'aquaculture', 'cooling_facility', 'packing_facility', 'processing_facility', 'warehouse', 'distribution_center', 'retail_location', 'transport', 'other')),
  location_name TEXT NOT NULL,
  location_code TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  postal_code TEXT,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, location_code)
);

-- =============================================
-- TRACEABILITY LOT CODES
-- =============================================

-- Traceability lot codes (core of FSMA 204)
CREATE TABLE IF NOT EXISTS public.traceability_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  food_id UUID REFERENCES public.ftl_foods(id),
  product_description TEXT NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL CHECK (unit_of_measure IN ('kg', 'lb', 'oz', 'g', 'case', 'box', 'pallet', 'unit', 'gallon', 'liter', 'each')),
  production_date DATE,
  expiration_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_transit', 'received', 'transformed', 'shipped', 'consumed', 'disposed', 'recalled')),
  parent_lot_id UUID REFERENCES public.traceability_lots(id), -- for transformation events
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, lot_code)
);

-- =============================================
-- CRITICAL TRACKING EVENTS (CTEs)
-- =============================================

-- Main CTE events table
CREATE TABLE IF NOT EXISTS public.cte_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('harvesting', 'cooling', 'initial_packing', 'first_receiver', 'shipping', 'receiving', 'transformation')),
  event_datetime TIMESTAMPTZ NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  reference_document_type TEXT,
  reference_document_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link lots to CTE events (many-to-many)
CREATE TABLE IF NOT EXISTS public.cte_lot_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cte_event_id UUID REFERENCES public.cte_events(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.traceability_lots(id) ON DELETE CASCADE,
  quantity DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cte_event_id, lot_id)
);

-- =============================================
-- CTE 1: HARVESTING
-- =============================================

CREATE TABLE IF NOT EXISTS public.cte_harvesting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cte_event_id UUID UNIQUE REFERENCES public.cte_events(id) ON DELETE CASCADE,
  harvest_location_id UUID REFERENCES public.locations(id),
  field_name TEXT, -- or growing area name
  container_name TEXT, -- for aquaculture
  harvest_date DATE NOT NULL,
  harvester_name TEXT NOT NULL,
  harvester_phone TEXT,
  commodity TEXT NOT NULL,
  variety TEXT,
  quantity_harvested DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  weather_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CTE 2: COOLING
-- =============================================

CREATE TABLE IF NOT EXISTS public.cte_cooling (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cte_event_id UUID UNIQUE REFERENCES public.cte_events(id) ON DELETE CASCADE,
  cooling_location_id UUID REFERENCES public.locations(id),
  cooling_start_datetime TIMESTAMPTZ NOT NULL,
  cooling_end_datetime TIMESTAMPTZ,
  initial_temperature DECIMAL(5, 2),
  final_temperature DECIMAL(5, 2),
  target_temperature DECIMAL(5, 2),
  cooling_method TEXT CHECK (cooling_method IN ('forced_air', 'hydro_cooling', 'ice', 'vacuum_cooling', 'room_cooling', 'other')),
  quantity_cooled DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CTE 3: INITIAL PACKING (RAC)
-- =============================================

CREATE TABLE IF NOT EXISTS public.cte_initial_packing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cte_event_id UUID UNIQUE REFERENCES public.cte_events(id) ON DELETE CASCADE,
  packing_location_id UUID REFERENCES public.locations(id),
  packing_date DATE NOT NULL,
  harvest_location_id UUID REFERENCES public.locations(id),
  field_name TEXT,
  harvester_name TEXT NOT NULL,
  harvester_phone TEXT,
  harvest_date DATE NOT NULL,
  commodity_received TEXT NOT NULL,
  variety_received TEXT,
  quantity_received DECIMAL(15, 3) NOT NULL,
  quantity_packed DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  -- Loss calculation
  loss_quantity DECIMAL(15, 3) DEFAULT 0,
  loss_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN quantity_received > 0 
    THEN ((quantity_received - quantity_packed) / quantity_received * 100)
    ELSE 0 END
  ) STORED,
  loss_reason TEXT,
  assigned_lot_code TEXT NOT NULL,
  product_description TEXT NOT NULL,
  package_type TEXT,
  packages_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CTE 4: FIRST LAND-BASED RECEIVER
-- =============================================

CREATE TABLE IF NOT EXISTS public.cte_first_receiver (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cte_event_id UUID UNIQUE REFERENCES public.cte_events(id) ON DELETE CASCADE,
  receiver_location_id UUID REFERENCES public.locations(id),
  received_date DATE NOT NULL,
  vessel_name TEXT,
  vessel_registration TEXT,
  captain_name TEXT,
  harvest_location_description TEXT NOT NULL,
  harvest_date DATE NOT NULL,
  species TEXT NOT NULL,
  quantity_received DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  product_form TEXT CHECK (product_form IN ('whole', 'filleted', 'shucked', 'other')),
  assigned_lot_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CTE 5: SHIPPING
-- =============================================

CREATE TABLE IF NOT EXISTS public.cte_shipping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cte_event_id UUID UNIQUE REFERENCES public.cte_events(id) ON DELETE CASCADE,
  shipping_location_id UUID REFERENCES public.locations(id),
  recipient_organization_id UUID REFERENCES public.organizations(id),
  recipient_location_id UUID REFERENCES public.locations(id),
  recipient_name TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  recipient_city TEXT,
  recipient_state TEXT,
  recipient_postal_code TEXT,
  recipient_phone TEXT,
  ship_date DATE NOT NULL,
  expected_delivery_date DATE,
  carrier_name TEXT,
  tracking_number TEXT,
  transport_method TEXT CHECK (transport_method IN ('truck', 'rail', 'air', 'ship', 'other')),
  transport_temperature DECIMAL(5, 2),
  quantity_shipped DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CTE 6: RECEIVING
-- =============================================

CREATE TABLE IF NOT EXISTS public.cte_receiving (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cte_event_id UUID UNIQUE REFERENCES public.cte_events(id) ON DELETE CASCADE,
  receiving_location_id UUID REFERENCES public.locations(id),
  sender_organization_id UUID REFERENCES public.organizations(id),
  sender_location_id UUID REFERENCES public.locations(id),
  sender_name TEXT NOT NULL,
  sender_address TEXT,
  sender_phone TEXT,
  received_date DATE NOT NULL,
  quantity_received DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  product_description TEXT NOT NULL,
  product_condition TEXT CHECK (product_condition IN ('excellent', 'good', 'acceptable', 'damaged', 'rejected')),
  temperature_at_receipt DECIMAL(5, 2),
  quality_notes TEXT,
  po_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CTE 7: TRANSFORMATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.cte_transformation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cte_event_id UUID UNIQUE REFERENCES public.cte_events(id) ON DELETE CASCADE,
  transformation_location_id UUID REFERENCES public.locations(id),
  transformation_date DATE NOT NULL,
  transformation_type TEXT NOT NULL CHECK (transformation_type IN ('cutting', 'cooking', 'mixing', 'packaging', 'processing', 'manufacturing', 'other')),
  transformation_description TEXT NOT NULL,
  output_product_description TEXT NOT NULL,
  output_quantity DECIMAL(15, 3) NOT NULL,
  output_unit_of_measure TEXT NOT NULL,
  assigned_lot_code TEXT NOT NULL,
  -- Yield calculation
  input_quantity DECIMAL(15, 3) NOT NULL,
  yield_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN input_quantity > 0 
    THEN (output_quantity / input_quantity * 100)
    ELSE 0 END
  ) STORED,
  loss_quantity DECIMAL(15, 3) GENERATED ALWAYS AS (input_quantity - output_quantity) STORED,
  loss_reason TEXT,
  batch_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transformation input lots (many inputs can create one output)
CREATE TABLE IF NOT EXISTS public.transformation_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transformation_id UUID REFERENCES public.cte_transformation(id) ON DELETE CASCADE,
  input_lot_id UUID REFERENCES public.traceability_lots(id),
  input_product_description TEXT NOT NULL,
  quantity_used DECIMAL(15, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUPPLY CHAIN PARTNERS
-- =============================================

CREATE TABLE IF NOT EXISTS public.supply_chain_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_organization_id UUID REFERENCES public.organizations(id),
  partner_name TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('supplier', 'customer', 'carrier', 'other')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMPLIANCE & AUDIT
-- =============================================

-- Audit log for all changes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view', 'export')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FDA requests tracking
CREATE TABLE IF NOT EXISTS public.fda_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_lot_codes TEXT[],
  request_type TEXT NOT NULL CHECK (request_type IN ('traceability_inquiry', 'outbreak_investigation', 'inspection', 'other')),
  fda_contact_name TEXT,
  fda_contact_email TEXT,
  fda_contact_phone TEXT,
  response_due_date TIMESTAMPTZ NOT NULL, -- 24 hours from request
  response_date TIMESTAMPTZ,
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending', 'in_progress', 'completed', 'overdue')),
  response_file_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance reports
CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc')),
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  total_lots_tracked INTEGER,
  total_cte_events INTEGER,
  compliance_score DECIMAL(5, 2),
  issues_found INTEGER,
  issues_resolved INTEGER,
  report_file_url TEXT,
  generated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

CREATE INDEX idx_locations_org ON public.locations(organization_id);
CREATE INDEX idx_locations_type ON public.locations(location_type);

CREATE INDEX idx_lots_org ON public.traceability_lots(organization_id);
CREATE INDEX idx_lots_code ON public.traceability_lots(lot_code);
CREATE INDEX idx_lots_food ON public.traceability_lots(food_id);
CREATE INDEX idx_lots_status ON public.traceability_lots(status);
CREATE INDEX idx_lots_parent ON public.traceability_lots(parent_lot_id);

CREATE INDEX idx_cte_org ON public.cte_events(organization_id);
CREATE INDEX idx_cte_type ON public.cte_events(event_type);
CREATE INDEX idx_cte_datetime ON public.cte_events(event_datetime);
CREATE INDEX idx_cte_location ON public.cte_events(location_id);

CREATE INDEX idx_audit_org ON public.audit_log(organization_id);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_created ON public.audit_log(created_at);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ftl_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traceability_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_lot_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_harvesting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_cooling ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_initial_packing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_first_receiver ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_shipping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_transformation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transformation_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_chain_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fda_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;
