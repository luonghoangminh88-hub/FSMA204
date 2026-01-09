# VEXIM FDA Export Compliance - User Guide

**Version:** 2.2 (Flexible SaaS Model)  
**Last Updated:** January 2025  
**System:** FSMA 204 Compliance Platform

---

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding the VEXIM Model](#understanding-the-vexim-model)
3. [Getting Started](#getting-started)
4. [Dual Compliance Scoring](#dual-compliance-scoring)
5. [Export Types](#export-types)
6. [FDA Registration Setup](#fda-registration-setup)
7. [Exporting Lot Reports](#exporting-lot-reports)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Introduction

The VEXIM (Vercel Export Import Management) FDA Compliance system implements a **flexible, tiered compliance model** designed for SaaS businesses. Unlike rigid gatekeeper systems, VEXIM allows you to:

- ✅ **Start immediately** with internal traceability (no FDA registration required)
- ✅ **Upgrade when needed** to FDA-compliant exports for U.S. market
- ✅ **Flexible pricing tiers** based on your actual export needs

### Who Needs This?

**You DON'T need FDA registration if:**
- You only sell domestically (non-U.S. markets)
- You use FSMA 204 principles for internal traceability
- You already have FDA registration through another provider

**You DO need FDA registration if:**
- You export food products to the United States
- FDA specifically requests traceability reports from you
- You want FDA-compliant sortable spreadsheets

---

## Understanding the VEXIM Model

### 3-Tier Philosophy

\`\`\`
┌─────────────────────────────────────────────────┐
│  Tier 1: Basic (Free/Starter)                   │
│  - Internal exports only                        │
│  - No FDA requirements                          │
│  - Perfect for domestic operations              │
└─────────────────────────────────────────────────┘
                    ↓ Upgrade when exporting to U.S.
┌─────────────────────────────────────────────────┐
│  Tier 2: FDA-Ready (Professional)               │
│  - Internal + FDA exports                       │
│  - FDA registration required                    │
│  - Validation warnings only                     │
└─────────────────────────────────────────────────┘
                    ↓ Need automation?
┌─────────────────────────────────────────────────┐
│  Tier 3: Enterprise                             │
│  - All features + FDA wizard                    │
│  - Pre-filled forms                             │
│  - Dedicated support                            │
└─────────────────────────────────────────────────┘
\`\`\`

### Non-Blocking Design

**Key Principle:** VEXIM never blocks you at data entry. Validation happens at export time only.

- ✅ Create lots freely (no FDA check)
- ✅ Log CTE events without restrictions
- ✅ Build complete traceability chains
- ⚠️ Validation triggers ONLY when clicking "FDA Export"

---

## Getting Started

### Step 1: Create Your First Lot

No FDA registration needed! Just create a lot:

1. Go to **Dashboard → Lots → Create Lot**
2. Fill in basic information:
   - Lot Code
   - Product Description
   - Quantity & Unit
   - Production Date
3. Click **Create Lot**

Your lot is now in the system with 100% data readiness.

### Step 2: Check Your Compliance Score

Navigate to **Dashboard** and view the **Export Readiness Score** widget:

- **Data Readiness:** Based on lot completeness (should be 100%)
- **Legal Readiness:** Based on FDA registration (0% if not registered)
- **Overall Readiness:** Average of both scores

---

## Dual Compliance Scoring

VEXIM uses a **dual scoring system** to differentiate between data quality and legal requirements:

### Data Readiness Score (0-100%)

Measures the completeness of your traceability data:

- ✅ All lots have TLC codes
- ✅ All CTEs have complete KDEs
- ✅ Transformation events have yield calculations
- ✅ Supply chain partners documented

**Formula:**
\`\`\`
Data Readiness = (Complete Lots / Total Lots) × 100%
\`\`\`

### Legal Readiness Score (0-100%)

Measures FDA registration compliance:

- ✅ FDA Registration Number
- ✅ FDA Registration Status (active/pending)
- ✅ U.S. Agent Information (name, email, phone, address)
- ✅ Power of Attorney signed
- ✅ Optional: Parent Company info, DUNS number

**Formula:**
\`\`\`
Legal Readiness = (Filled Fields / Required Fields) × 100%
\`\`\`

### Overall Readiness

Simple average of both scores:

\`\`\`
Overall = (Data Readiness + Legal Readiness) / 2
\`\`\`

**Export Permissions:**
- **Internal Export:** Always available (no minimum score)
- **FDA Export:** Requires Legal Readiness ≥ 90%

---

## Export Types

### 1. Internal Export (Always Available)

**When to use:**
- Domestic traceability
- Internal audits
- Non-U.S. markets
- Supply chain partners

**What you get:**
- Standard Excel file (.xlsx)
- All lot and CTE data
- Formatted for readability
- No FDA compliance headers

**How to export:**
1. Go to **Lots → Select Lot → Export Options**
2. Click **Internal Export** button (green)
3. File downloads immediately

### 2. FDA Export (Requires Registration)

**When to use:**
- FDA requests your traceability data
- Exporting to U.S. market
- Compliance audits for U.S. regulators

**What you get:**
- FDA-compliant sortable spreadsheet
- All required KDE columns
- Proper date formatting (MM/DD/YYYY)
- FDA reference numbers
- Meets FSMA 204 Rule specifications

**How to export:**
1. Go to **Lots → Select Lot → Export Options**
2. Click **FDA Export (U.S.)** button (blue)
3. **If locked:** Complete FDA setup first
4. **If unlocked:** File downloads immediately

---

## FDA Registration Setup

### When Do You Need This?

You need to complete FDA registration if:

1. You plan to export food products to the United States
2. FDA has requested traceability reports from your organization
3. Your customers require FDA-compliant documentation

### Step-by-Step Setup

#### 1. Navigate to FDA Settings

**Path:** `Dashboard → Settings → FDA Settings`

#### 2. Complete FDA Registration Section

**Required Fields:**
- **FDA Registration Number:** 11-digit number from FDA (format: 12345678901)
- **Registration Status:** 
  - `pending` - Application submitted, awaiting approval
  - `active` - Approved and current
  - `expired` - Needs renewal
- **Registration Date:** When you registered with FDA

**Example:**
\`\`\`
FDA Registration Number: 12345678901
Registration Status: active
Registration Date: 2024-01-15
\`\`\`

#### 3. Complete U.S. Agent Information

**Required Fields:**
- **Agent Name:** Full name of designated U.S. agent
- **Agent Email:** Valid email address
- **Agent Phone:** U.S. phone number (format: +1-555-0100)
- **Agent Address:** Complete U.S. address

**Example:**
\`\`\`
Agent Name: John Smith
Agent Email: john.smith@usagent.com
Agent Phone: +1-555-0100
Agent Address: 123 Main Street, New York, NY 10001, USA
\`\`\`

#### 4. Power of Attorney (PoA)

**Required:**
- ✅ Check the box: "I confirm the Power of Attorney has been signed and executed"
- **Optional:** Upload PoA document URL

**What is PoA?**
A legal document authorizing your U.S. agent to represent your organization to the FDA.

#### 5. Optional Fields (Recommended)

- **Parent Company Name:** If part of larger organization
- **Parent Company Country:** Country of parent company
- **DUNS Number:** Dun & Bradstreet Universal Numbering System
- **Facility FDA Number:** If different from main registration

#### 6. Save Settings

Click **Save Changes** button at bottom.

**Validation Check:**
- System immediately recalculates Legal Readiness Score
- If all required fields complete → Score = 100%
- FDA Export button unlocks automatically

---

## Exporting Lot Reports

### Scenario 1: Internal Report (No FDA)

**Use Case:** You need a report for internal audit or domestic partner.

**Steps:**
1. Navigate to **Lots** page
2. Click on the lot code you want to export
3. Scroll to **Export Options** card
4. Click **Internal Export** button (always green/enabled)
5. Excel file downloads immediately

**What's included:**
- Lot details (code, product, quantity, dates)
- All CTE events linked to this lot
- Supply chain partners
- Transformation data with yield calculations
- Loss analysis

### Scenario 2: FDA Export (First Time)

**Use Case:** FDA requested traceability report for outbreak investigation.

**Steps:**
1. Navigate to **Lots** page
2. Click on the lot code requested by FDA
3. Scroll to **Export Options** card
4. Click **FDA Export (U.S.)** button (blue with lock icon)
5. **Blocked Dialog appears:**
   - Shows "FDA Registration Required"
   - Lists missing required fields
   - Provides link to FDA Setup
6. Click **Complete FDA Setup**
7. Fill in all required FDA registration fields
8. Save settings
9. Return to lot details page
10. Click **FDA Export (U.S.)** button (now unlocked)
11. FDA-compliant Excel file downloads

**What's included (additional to internal):**
- FDA-specific formatting
- Reference numbers for FDA case
- Compliance statement
- Sortable columns per FDA requirements
- All mandatory KDE fields

### Scenario 3: FDA Export (Already Registered)

**Use Case:** You've already completed FDA registration, need another report.

**Steps:**
1. Navigate to **Lots** page
2. Click on the lot code
3. Click **FDA Export (U.S.)** button (blue, unlocked)
4. File downloads immediately

---

## Troubleshooting

### Problem: "FDA Export button is locked"

**Cause:** Legal Readiness Score < 90%

**Solution:**
1. Click on the export button to see blocked dialog
2. Review "Missing Required Fields" list
3. Click "Go to FDA Setup"
4. Complete all missing fields
5. Save changes
6. Return to lot page - button should now be unlocked

**Check Your Score:**
Go to Dashboard → View "Export Readiness Score" widget

---

### Problem: "Data Readiness Score is low"

**Cause:** Incomplete lots or missing CTE data

**Solution:**
1. Go to **Dashboard → Compliance Alerts**
2. Review incomplete items
3. Common issues:
   - Lots missing TLC codes
   - CTE events with incomplete KDEs
   - Transformation events without yield data
4. Fix each issue individually
5. Score updates in real-time

---

### Problem: "I have FDA registration but system doesn't recognize it"

**Cause:** Registration data not entered in system

**Solution:**
Even if you're registered with FDA through another provider, you must enter your registration details into the system:

1. Go to **Settings → FDA Settings**
2. Enter your existing FDA Registration Number
3. Fill in your U.S. Agent information (same as registered with FDA)
4. Check PoA confirmation box
5. Save changes

**Note:** System validates format only, not actual FDA registration status.

---

### Problem: "Export file doesn't open in Excel"

**Cause:** Browser download issues or file corruption

**Solution:**
1. Try different browser (Chrome, Firefox, Safari)
2. Clear browser cache
3. Check download folder for .xlsx extension
4. If file is .tmp or no extension, rename to `.xlsx`
5. Try export again

---

### Problem: "FDA says my report format is wrong"

**Cause:** Possible version mismatch or specific FDA office requirements

**Solution:**
1. Verify you used **FDA Export** (not Internal Export)
2. Check file has all required columns:
   - Traceability Lot Code
   - Product Description
   - Quantity & Unit
   - All dates in MM/DD/YYYY format
3. Contact support with:
   - FDA request reference number
   - Specific feedback from FDA officer
   - Copy of report file

---

## FAQ

### General Questions

**Q: Do I need FDA registration to use this system?**

A: No! You can use the entire system for internal traceability without FDA registration. FDA registration is only required if you want to export FDA-compliant reports for U.S. market.

---

**Q: I already have FDA registration through a consultant. Do I need to register again?**

A: No, you don't need to register again with FDA. Just enter your existing FDA registration details into our system settings. We don't handle actual FDA registration - we only validate that you have the required information to generate compliant reports.

---

**Q: What's the difference between Internal Export and FDA Export?**

A: 
- **Internal Export:** Standard Excel format for your own use, domestic partners, or non-U.S. markets. Always available.
- **FDA Export:** FDA-compliant sortable spreadsheet meeting FSMA 204 Rule specifications. Requires FDA registration to unlock.

---

**Q: Can I export lots that don't have complete CTE data?**

A: Yes for Internal Export. For FDA Export, you'll get validation warnings if data is incomplete, but the export will still proceed. However, FDA may reject incomplete reports, so we recommend achieving 90%+ Data Readiness Score before submitting to FDA.

---

### FDA Registration Questions

**Q: How long does FDA registration take?**

A: This system doesn't handle actual FDA registration - that's done directly with FDA and typically takes 2-4 weeks. Once you have your FDA registration number, entering it into our system takes 5 minutes.

---

**Q: What if my FDA registration expires?**

A: Update the "Registration Status" field to "expired" in FDA Settings. The system will lock FDA Export until you renew with FDA and update the status back to "active".

---

**Q: Do I need a U.S. Agent if I'm already in the U.S.?**

A: Yes, FDA requires ALL food facilities to designate a U.S. agent, even if you're based in the U.S. Your U.S. agent can be yourself, an employee, or a third-party service.

---

**Q: What is a Power of Attorney (PoA) and do I really need it?**

A: PoA is a legal document authorizing your U.S. agent to represent you to the FDA. It's required by FDA regulations. Most U.S. agent services provide a PoA template as part of their service.

---

### Technical Questions

**Q: How often is my Compliance Score updated?**

A: Real-time. Every time you create/update a lot, CTE event, or FDA registration field, scores recalculate immediately.

---

**Q: Can I export multiple lots at once?**

A: Not currently in the UI. For bulk exports, contact support or use the API endpoint: `POST /api/vexim/export-lot-report` with array of lot IDs.

---

**Q: What format is the export file?**

A: Excel (.xlsx) format, compatible with Microsoft Excel 2010+, Google Sheets, and LibreOffice Calc.

---

**Q: Is my data secure?**

A: Yes. All exports are generated on-demand (not cached). Data is encrypted in transit (HTTPS) and at rest (Supabase encryption). Export tracking logs who downloaded what and when for audit purposes.

---

**Q: Can I customize the export format?**

A: Internal Export format can be customized per Enterprise plan. FDA Export format cannot be customized as it must meet specific FDA regulatory requirements.

---

### Compliance Questions

**Q: Will this system guarantee FDA approval of my reports?**

A: No system can guarantee FDA approval. We generate reports that meet FSMA 204 technical specifications, but FDA reviews content for accuracy and completeness. Your data quality determines FDA acceptance.

---

**Q: What happens if FDA rejects my report?**

A: Review FDA's specific feedback, update your lot/CTE data in the system, then re-export. Common rejection reasons:
- Incomplete KDE fields
- Incorrect date formats (must be MM/DD/YYYY)
- Missing supply chain partner information
- Gaps in traceability chain

---

**Q: Do I need to keep paper copies?**

A: FDA requires electronic records to be backed up. We recommend:
- Export reports quarterly for your records
- Store in secure cloud storage
- Maintain for 2+ years per FSMA 204 requirements

---

**Q: Is this system FSMA 204 Rule compliant?**

A: Yes. The system implements all FSMA 204 Rule requirements:
- 7 Critical Tracking Events (CTEs)
- Key Data Elements (KDEs) for each CTE
- Traceability Lot Code (TLC) assignment
- 24-hour response capability
- Sortable electronic records

---

## Support & Resources

### Getting Help

**In-App Support:**
- Help icon (?) throughout the interface
- Tooltips on hover for each field
- Validation messages explain exactly what's needed

**Documentation:**
- User Guide (this document)
- API Documentation (for developers)
- Video Tutorials (coming soon)

**Contact Support:**
- Email: support@yourcompany.com
- Chat: Available in dashboard (bottom right)
- Hours: 9 AM - 5 PM EST, Monday-Friday

### Additional Resources

**FDA Official Resources:**
- [FDA FSMA 204 Rule](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-food-traceability)
- [FDA Registration Guide](https://www.fda.gov/food/food-facility-registration/how-register-your-food-facility-fda)
- [FDA Food Traceability List](https://www.fda.gov/food/food-safety-modernization-act-fsma/food-traceability-list)

**System Updates:**
- Changelog: Check Settings → About for version history
- Feature Requests: Submit via support email
- Bug Reports: Use in-app feedback form

---

## Appendix: Field Reference

### Organizations Table - FDA Fields

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `fda_registration_number` | String (11) | Yes | 11-digit FDA registration number | 12345678901 |
| `fda_registration_status` | Enum | Yes | pending, active, expired | active |
| `fda_registration_date` | Date | Yes | Date registered with FDA | 2024-01-15 |
| `us_agent_name` | String | Yes | Full name of U.S. agent | John Smith |
| `us_agent_email` | Email | Yes | Agent email address | john@agent.com |
| `us_agent_phone` | String | Yes | Agent phone (U.S. format) | +1-555-0100 |
| `us_agent_address` | String | Yes | Complete U.S. address | 123 Main St, NY |
| `poa_signed` | Boolean | Yes | Power of Attorney confirmation | true |
| `poa_signed_date` | Date | Optional | Date PoA was signed | 2024-01-10 |
| `poa_document_url` | URL | Optional | Link to PoA document | https://... |
| `parent_company_name` | String | Optional | Parent company if applicable | ABC Corp |
| `parent_company_country` | String | Optional | Parent company country | USA |
| `duns_number` | String (9) | Optional | Dun & Bradstreet number | 123456789 |
| `facility_fda_number` | String | Optional | Facility-specific number | FEI3000012345 |

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Next Review:** March 2025
