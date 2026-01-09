// Type definitions for FSMA 204 System

export type Role = "system_admin" | "org_admin" | "manager" | "operator" | "viewer"
export type Locale = "en" | "vi"
export type OrganizationType =
  | "farm_grower"
  | "packer_packhouse"
  | "processor_manufacturer"
  | "distributor_warehouse"
  | "first_receiver"
  | "importer"
  | "retailer"
export type CTEType =
  | "harvesting"
  | "cooling"
  | "initial_packing"
  | "first_receiver"
  | "shipping"
  | "receiving"
  | "transformation"
export type LotStatus =
  | "active"
  | "in_transit"
  | "received"
  | "transformed"
  | "shipped"
  | "consumed"
  | "disposed"
  | "recalled"

export interface Profile {
  id: string
  organization_id: string
  email: string
  full_name: string | null
  phone: string | null
  role: Role
  language_preference: Locale
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  organization_type: OrganizationType // Using typed organization type
  address: string | null
  city: string | null
  state: string | null
  country: string
  postal_code: string | null
  phone: string | null
  email: string | null
  license_number: string | null
  tax_id: string | null
  fda_registration_number?: string | null
  duns_number?: string | null
  fda_status?: "Pending" | "Active" | "Expired" | "Suspended"
  power_of_attorney_signed?: boolean
  use_vexim_as_us_agent?: boolean
  contract_start_date?: string | null
  agent_contract_end_date?: string | null
  poa_signed?: boolean
  fda_renewal_deadline?: string | null
  fda_registration_status?: string
  use_vexim_agent?: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TraceabilityLot {
  id: string
  organization_id: string
  lot_code: string
  food_id: string
  product_description: string
  quantity: number
  unit_of_measure: string
  production_date: string | null
  expiration_date: string | null
  status: LotStatus
  parent_lot_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CTEEvent {
  id: string
  organization_id: string
  event_type: CTEType
  event_datetime: string
  location_id: string
  reference_document_type: string | null
  reference_document_number: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  organization_id: string
  location_type: string
  location_name: string
  location_code: string
  address: string | null
  city: string | null
  state: string | null
  country: string
  postal_code: string | null
  gps_latitude: number | null
  gps_longitude: number | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FTLFood {
  id: string
  category_id: string
  food_name: string
  food_code: string
  variety: string | null
  scientific_name: string | null
  description: string | null
  requires_temperature_control: boolean
  shelf_life_days: number | null
  is_active: boolean
  created_at: string
}

export interface OrganizationCTEMapping {
  id: string
  organization_type: OrganizationType
  cte_event_type: CTEType
  is_primary: boolean
  description: string | null
  created_at: string
}

export const ORGANIZATION_CTE_MAPPINGS: Record<OrganizationType, CTEType[]> = {
  farm_grower: ["harvesting", "cooling", "shipping"],
  packer_packhouse: ["initial_packing", "receiving", "shipping", "transformation"],
  processor_manufacturer: ["receiving", "transformation", "shipping"],
  distributor_warehouse: ["receiving", "shipping"],
  first_receiver: ["first_receiver", "receiving", "shipping"],
  importer: ["receiving", "shipping", "transformation"],
  retailer: ["receiving"],
}
