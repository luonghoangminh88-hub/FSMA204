# VEXIM API Documentation

## Export Lot Report API

### Endpoint

\`\`\`
POST /api/vexim/export-lot-report
\`\`\`

### Description

Generates and returns an Excel export file for a traceability lot with automatic FDA validation.

### Request Headers

\`\`\`
Content-Type: application/json
Authorization: Bearer <supabase_jwt_token>
\`\`\`

### Request Body

\`\`\`typescript
{
  lotId: string;          // UUID of the lot to export
  exportType: 'INTERNAL' | 'FDA_COMPLIANCE' | 'PARTNER';
  organizationId: string;  // UUID of the organization
}
\`\`\`

### Response

**Success (200 OK):**

\`\`\`
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="LOT-2025-001_export.xlsx"

<binary Excel file>
\`\`\`

**Validation Error (403 Forbidden):**

\`\`\`json
{
  "error": "FDA_VALIDATION_FAILED",
  "message": "Missing required FDA registration information",
  "missingFields": [
    "FDA Registration Number",
    "U.S. Agent Name",
    "Power of Attorney Signed"
  ],
  "canExport": false
}
\`\`\`

**Not Found (404):**

\`\`\`json
{
  "error": "LOT_NOT_FOUND",
  "message": "Lot not found or access denied"
}
\`\`\`

### Example Usage

\`\`\`typescript
const response = await fetch('/api/vexim/export-lot-report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    lotId: 'uuid-here',
    exportType: 'FDA_COMPLIANCE',
    organizationId: 'org-uuid-here'
  })
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lot-export.xlsx';
  a.click();
} else {
  const error = await response.json();
  console.error('Export failed:', error);
}
\`\`\`

---

## Compliance Readiness API

### Endpoint

\`\`\`
GET /api/vexim/compliance-readiness?organizationId=<uuid>
\`\`\`

### Description

Returns dual compliance scoring for an organization (Data Readiness + Legal Readiness).

### Response

\`\`\`json
{
  "dataReadinessScore": 85.5,
  "legalReadinessScore": 100,
  "overallReadiness": 92.75,
  "canExportFDA": true,
  "missingFields": [],
  "lastCalculated": "2025-01-15T10:30:00Z"
}
\`\`\`

---

## Validation Logic

### Core Function

\`\`\`typescript
import { validateExportAction } from '@/lib/vexim-validation';

const result = validateExportAction(organizationData, 'FDA_COMPLIANCE');

if (result.canExport) {
  // Proceed with export
} else {
  // Show error: result.errorMessage
  // Display missing fields: result.missingFields
}
\`\`\`

---

## Database Schema

### FDA Fields in `organizations` Table

All fields are **NULLABLE** (VEXIM flexible model):

\`\`\`sql
-- Core FDA Registration
fda_registration_number VARCHAR(11)
fda_registration_status VARCHAR(20) CHECK (status IN ('pending', 'active', 'expired'))
fda_registration_date DATE

-- U.S. Agent Information  
us_agent_name VARCHAR(255)
us_agent_email VARCHAR(255)
us_agent_phone VARCHAR(50)
us_agent_address TEXT

-- Power of Attorney
poa_signed BOOLEAN DEFAULT FALSE
poa_signed_date DATE
poa_document_url TEXT

-- Optional Fields
parent_company_name VARCHAR(255)
parent_company_country VARCHAR(100)
duns_number VARCHAR(9)
facility_fda_number VARCHAR(50)
\`\`\`

### Export Tracking in `traceability_lots` Table

\`\`\`sql
-- Export Audit Fields
last_exported_at TIMESTAMP WITH TIME ZONE
last_exported_by UUID REFERENCES profiles(id)
export_count INTEGER DEFAULT 0
fda_export_count INTEGER DEFAULT 0
\`\`\`

### Export History Table

\`\`\`sql
CREATE TABLE export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID REFERENCES traceability_lots(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  exported_by UUID REFERENCES profiles(id),
  export_type VARCHAR(50), -- 'INTERNAL', 'FDA_COMPLIANCE', 'PARTNER'
  validation_passed BOOLEAN,
  file_size_bytes INTEGER,
  export_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Audit fields
  ip_address INET,
  user_agent TEXT,
  compliance_score_at_export NUMERIC(5,2)
);
\`\`\`

---

**Last Updated:** January 2025  
**API Version:** 1.0
