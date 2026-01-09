import { z } from "zod"

// ============================================
// SHARED / COMMON SCHEMAS
// ============================================

export const emailSchema = z.string().email("Invalid email address")

export const urlSchema = z.string().url("Invalid URL")

export const uuidSchema = z.string().uuid("Invalid UUID format")

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")

export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
})

// ============================================
// PACKAGE SCHEMAS
// ============================================

export const createPackageSchema = z
  .object({
    package_name: z.string().min(1, "Package name is required").max(200, "Package name too long"),
    package_code: z
      .string()
      .min(1, "Package code is required")
      .max(50, "Package code too long")
      .regex(/^[A-Z0-9_-]+$/, "Package code must be uppercase letters, numbers, dashes, or underscores"),
    package_tier: z.number().int().min(1).max(10),
    price_monthly: z.number().min(0, "Price must be non-negative"),
    price_yearly: z.number().min(0, "Price must be non-negative"),
    display_order: z.number().int().min(0).optional().default(0),
    is_active: z.boolean().optional().default(true),
    is_public: z.boolean().optional().default(true),
    description: z.string().max(1000, "Description too long").optional().nullable(),
    base_user_limit: z.number().int().min(1).optional().default(1),
    base_location_limit: z.number().int().min(1).optional().default(1),
    base_lot_limit: z.number().int().min(1).optional().default(100),
    extra_user_price: z.number().min(0).optional().default(0),
    extra_location_price: z.number().min(0).optional().default(0),
    extra_lot_price: z.number().min(0).optional().default(0),
  })
  .strict()

export const updatePackageSchema = createPackageSchema.partial().strict()

// ============================================
// VEXIM US AGENT SCHEMAS
// ============================================

export const veximAgentSchema = z
  .object({
    agent_name: z.string().min(1, "Agent name is required").max(200, "Agent name too long"),
    agent_address_line_1: z.string().min(1, "Address line 1 is required").max(200),
    agent_address_line_2: z.string().max(200).optional().nullable(),
    agent_city: z.string().min(1, "City is required").max(100),
    agent_state: z.string().min(2, "State is required").max(50),
    agent_postal_code: z.string().min(1, "Postal code is required").max(20),
    agent_country: z.string().min(2, "Country code is required").max(3).default("USA"),
    agent_phone: z
      .string()
      .min(1, "Phone is required")
      .max(30)
      .regex(/^[\d\s\-+$$$$]+$/, "Invalid phone format"),
    agent_email: emailSchema,
    agent_duns: z.string().max(20).optional().nullable(),
    emergency_contact_name: z.string().max(200).optional().nullable(),
    emergency_contact_phone: z
      .string()
      .max(30)
      .optional()
      .nullable()
      .refine((val) => !val || /^[\d\s\-+$$$$]+$/.test(val), "Invalid phone format"),
    emergency_contact_email: z.string().email().optional().nullable(),
    is_active: z.boolean().optional().default(true),
  })
  .strict()

// ============================================
// INVOICE SCHEMAS
// ============================================

export const createInvoiceSchema = z
  .object({
    package_code: z.string().min(1, "Package code is required").max(50),
    billing_cycle: z
      .enum(["monthly", "yearly"], {
        errorMap: () => ({ message: "Billing cycle must be 'monthly' or 'yearly'" }),
      })
      .optional()
      .default("monthly"),
  })
  .strict()

export const uploadProofSchema = z
  .object({
    file: z.any().refine((file) => file instanceof File, "File is required"),
  })
  .strict()

// ============================================
// TRACEABILITY LOT SCHEMAS
// ============================================

export const createLotSchema = z
  .object({
    lot_code: z.string().min(1, "Lot code is required").max(100),
    product_description: z.string().min(1, "Product description is required").max(500),
    quantity: z.number().min(0, "Quantity must be non-negative"),
    unit: z.string().min(1, "Unit is required").max(50),
    location_id: uuidSchema,
    harvest_date: dateStringSchema.optional().nullable(),
    production_date: dateStringSchema.optional().nullable(),
    expiration_date: dateStringSchema.optional().nullable(),
    supplier_name: z.string().max(200).optional().nullable(),
    supplier_license: z.string().max(100).optional().nullable(),
    origin_country: z.string().max(100).optional().nullable(),
    origin_location: z.string().max(200).optional().nullable(),
    packaging_date: dateStringSchema.optional().nullable(),
    cool_temperature: z.number().optional().nullable(),
    certifications: z.array(z.string()).optional().default([]),
    custom_attributes: z.record(z.any()).optional().default({}),
  })
  .strict()

export const updateLotSchema = createLotSchema.partial().strict()

export const disposeLotSchema = z
  .object({
    disposal_reason: z.string().min(1, "Disposal reason is required").max(500),
    disposal_date: dateStringSchema.optional(),
  })
  .strict()

export const extendShelfLifeSchema = z
  .object({
    new_expiration_date: dateStringSchema,
    reason: z.string().min(1, "Reason is required").max(500),
  })
  .strict()

// ============================================
// CTE EVENT SCHEMAS
// ============================================

export const createCTEEventSchema = z
  .object({
    event_type: z.enum(
      ["growing", "harvesting", "cooling", "initial_packing", "shipping", "receiving", "transformation"],
      {
        errorMap: () => ({ message: "Invalid event type" }),
      },
    ),
    event_date: dateStringSchema,
    location_id: uuidSchema,
    lot_code: z.string().min(1, "Lot code is required").max(100),
    quantity: z.number().min(0, "Quantity must be non-negative").optional().nullable(),
    unit: z.string().max(50).optional().nullable(),
    traceability_lot_code: z.string().max(100).optional().nullable(),
    reference_document_type: z.string().max(100).optional().nullable(),
    reference_document_number: z.string().max(100).optional().nullable(),
    kde_data: z.record(z.any()).optional().default({}),
    custom_data: z.record(z.any()).optional().default({}),
  })
  .strict()

export const updateCTEEventSchema = createCTEEventSchema.partial().strict()

// ============================================
// FDA REGISTRATION SCHEMAS
// ============================================

export const registerFDASchema = z
  .object({
    lot_codes: z.array(z.string().min(1)).min(1, "At least one lot code is required"),
    fda_facility_id: z.string().min(1, "FDA facility ID is required").max(100),
    fda_registration_number: z.string().max(100).optional().nullable(),
    intended_recipient_name: z.string().min(1, "Recipient name is required").max(200),
    intended_recipient_address: z.string().min(1, "Recipient address is required").max(500),
    expected_arrival_date: dateStringSchema,
    ship_date: dateStringSchema.optional().nullable(),
    additional_info: z.record(z.any()).optional().default({}),
  })
  .strict()

export const updateFDARegistrationSchema = z
  .object({
    organization_id: uuidSchema,
    fda_registration_number: z.string().max(100).optional().nullable(),
    duns_number: z.string().max(20).optional().nullable(),
    fda_registration_status: z.enum(["active", "expired", "pending", "suspended"]).optional(),
    fda_registration_date: dateStringSchema.optional().nullable(),
    poa_signed: z.boolean().optional(),
    poa_signed_date: dateStringSchema.optional().nullable(),
    us_agent_name: z.string().max(200).optional().nullable(),
    us_agent_company: z.string().max(200).optional().nullable(),
    us_agent_email: emailSchema.optional().nullable(),
    us_agent_phone: z
      .string()
      .max(30)
      .optional()
      .nullable()
      .refine((val) => !val || /^[\d\s\-+()]+$/.test(val), "Invalid phone format"),
    us_agent_address: z.string().max(500).optional().nullable(),
    us_agent_city: z.string().max(100).optional().nullable(),
    us_agent_state: z.string().max(50).optional().nullable(),
    us_agent_postal_code: z.string().max(20).optional().nullable(),
    contract_duration: z.enum(["1", "2", "5"]).optional().nullable(),
  })
  .strict()

export const updateFDARegistrationPatchSchema = z
  .object({
    organizationId: uuidSchema,
    fda_registration_number: z.string().max(100).optional(),
    duns_number: z.string().max(20).optional(),
    fda_registration_status: z.enum(["active", "expired", "pending", "suspended"]).optional(),
    us_agent_name: z.string().max(200).optional(),
    us_agent_email: emailSchema.optional(),
    us_agent_phone: z
      .string()
      .max(30)
      .optional()
      .refine((val) => !val || /^[\d\s\-+()]+$/.test(val), "Invalid phone format"),
    poa_signed: z.boolean().optional(),
  })
  .strict()

export const exportFDAPackageQuerySchema = z
  .object({
    format: z.enum(["json", "pdf"]).optional().default("json"),
    includeAttachments: z.boolean().optional().default(false),
  })
  .strict()

// ============================================
// ORGANIZATION SCHEMAS
// ============================================

export const createOrganizationSchema = z
  .object({
    organization_name: z.string().min(1, "Organization name is required").max(200),
    organization_type: z.enum(["exporter", "grower", "processor", "supplier"], {
      errorMap: () => ({ message: "Invalid organization type" }),
    }),
    business_license: z.string().max(100).optional().nullable(),
    tax_id: z.string().max(50).optional().nullable(),
    address_line_1: z.string().max(200).optional().nullable(),
    address_line_2: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state_province: z.string().max(100).optional().nullable(),
    postal_code: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    phone: z
      .string()
      .max(30)
      .optional()
      .nullable()
      .refine((val) => !val || /^[\d\s\-+$$$$]+$/.test(val), "Invalid phone format"),
    email: z.string().email().optional().nullable(),
    website: z.string().url().optional().nullable(),
    primary_contact_name: z.string().max(200).optional().nullable(),
    primary_contact_email: emailSchema.optional().nullable(),
    primary_contact_phone: z
      .string()
      .max(30)
      .optional()
      .nullable()
      .refine((val) => !val || /^[\d\s\-+$$$$]+$/.test(val), "Invalid phone format"),
  })
  .strict()

export const updateOrganizationSchema = createOrganizationSchema.partial().strict()

// ============================================
// SUBSCRIPTION SCHEMAS
// ============================================

export const customizeQuotaSchema = z
  .object({
    extra_users_count: z.number().int().min(0).optional(),
    extra_locations_count: z.number().int().min(0).optional(),
    extra_lots_count: z.number().int().min(0).optional(),
  })
  .strict()

// ============================================
// BATCH OPERATION SCHEMAS
// ============================================

export const createLotsFromHarvestSchema = z
  .object({
    harvest_location_id: uuidSchema,
    harvest_date: dateStringSchema,
    product_description: z.string().min(1, "Product description is required").max(500),
    total_quantity: z.number().min(0, "Total quantity must be non-negative"),
    unit: z.string().min(1, "Unit is required").max(50),
    lot_size: z.number().min(0.001, "Lot size must be positive"),
    cool_temperature: z.number().optional().nullable(),
    origin_country: z.string().max(100).optional().nullable(),
    origin_location: z.string().max(200).optional().nullable(),
  })
  .strict()

export const massTransformationSchema = z
  .object({
    source_lot_codes: z.array(z.string().min(1)).min(1, "At least one source lot is required"),
    output_product_description: z.string().min(1, "Output product description is required").max(500),
    transformation_type: z.enum(["processing", "packaging", "mixing", "portioning"], {
      errorMap: () => ({ message: "Invalid transformation type" }),
    }),
    output_quantity: z.number().min(0, "Output quantity must be non-negative"),
    output_unit: z.string().min(1, "Output unit is required").max(50),
    transformation_date: dateStringSchema,
    transformation_location_id: uuidSchema,
    expiration_date: dateStringSchema.optional().nullable(),
  })
  .strict()

// ============================================
// APPROVAL SCHEMAS
// ============================================

export const approvalActionSchema = z
  .object({
    request_id: uuidSchema,
    comment: z.string().max(1000).optional().nullable(),
  })
  .strict()

// ============================================
// RECALL SCHEMAS
// ============================================

export const initiateRecallSchema = z
  .object({
    lot_codes: z.array(z.string().min(1)).min(1, "At least one lot code is required"),
    recall_reason: z.string().min(1, "Recall reason is required").max(1000),
    severity_level: z.enum(["low", "medium", "high", "critical"], {
      errorMap: () => ({ message: "Invalid severity level" }),
    }),
    recall_date: dateStringSchema.optional(),
    contact_email: emailSchema.optional().nullable(),
    contact_phone: z
      .string()
      .max(30)
      .optional()
      .nullable()
      .refine((val) => !val || /^[\d\s\-+$$$$]+$/.test(val), "Invalid phone format"),
  })
  .strict()

// ============================================
// EXPORT HELPERS
// ============================================

export type CreatePackageInput = z.infer<typeof createPackageSchema>
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>
export type VeximAgentInput = z.infer<typeof veximAgentSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type CreateLotInput = z.infer<typeof createLotSchema>
export type UpdateLotInput = z.infer<typeof updateLotSchema>
export type DisposeLotInput = z.infer<typeof disposeLotSchema>
export type CreateCTEEventInput = z.infer<typeof createCTEEventSchema>
export type RegisterFDAInput = z.infer<typeof registerFDASchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type CustomizeQuotaInput = z.infer<typeof customizeQuotaSchema>
export type ApprovalActionInput = z.infer<typeof approvalActionSchema>
export type InitiateRecallInput = z.infer<typeof initiateRecallSchema>
export type UpdateFDARegistrationInput = z.infer<typeof updateFDARegistrationSchema>
export type UpdateFDARegistrationPatchInput = z.infer<typeof updateFDARegistrationPatchSchema>
export type ExportFDAPackageQuery = z.infer<typeof exportFDAPackageQuerySchema>
