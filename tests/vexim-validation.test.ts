/**
 * VEXIM Validation Logic Tests
 * Tests the core validation logic for FDA export compliance
 */

import { describe, it, expect, beforeEach } from "@jest/globals"
import { validateExportAction, getComplianceReadiness } from "@/lib/vexim-validation"
import type { OrganizationData } from "@/lib/vexim-types"

describe("VEXIM Validation Logic", () => {
  describe("validateExportAction", () => {
    let baseOrg: OrganizationData

    beforeEach(() => {
      baseOrg = {
        id: "test-org-id",
        name: "Test Organization",
        organization_type: "processor_manufacturer",
        fda_registration_number: null,
        fda_registration_status: null,
        fda_registration_date: null,
        us_agent_name: null,
        us_agent_email: null,
        us_agent_phone: null,
        us_agent_address: null,
        poa_signed: false,
        poa_signed_date: null,
        poa_document_url: null,
        parent_company_name: null,
        parent_company_country: null,
        duns_number: null,
        facility_fda_number: null,
      }
    })

    it("should allow INTERNAL export without FDA registration", async () => {
      const result = await validateExportAction(baseOrg.id, "INTERNAL")

      expect(result.canExport).toBe(true)
      expect(result.format).toBeDefined()
    })

    it("should block FDA export when no registration number", async () => {
      const result = await validateExportAction(baseOrg.id, "USA_TRACEABILITY")

      expect(result.canExport).toBe(false)
      expect(result.blockedFields).toContain("FDA Registration Number")
      expect(result.reason).toContain("Missing valid FDA registration number")
    })

    it("should block FDA export when registration status is invalid", async () => {
      const orgWithNumber = {
        ...baseOrg,
        fda_registration_number: "12345678901",
        fda_registration_status: "expired" as const,
      }

      const result = await validateExportAction(orgWithNumber.id, "USA_TRACEABILITY")

      expect(result.canExport).toBe(false)
      expect(result.blockedFields).toContain("FDA Registration Number")
    })

    it("should block FDA export when U.S. agent information is missing", async () => {
      const orgWithRegistration = {
        ...baseOrg,
        fda_registration_number: "12345678901",
        fda_registration_status: "active" as const,
        fda_registration_date: "2024-01-15",
      }

      const result = await validateExportAction(orgWithRegistration.id, "USA_TRACEABILITY")

      expect(result.canExport).toBe(false)
      expect(result.blockedFields).toContain("U.S. Agent Information")
    })

    it("should block FDA export when PoA is not signed", async () => {
      const orgWithAgent = {
        ...baseOrg,
        fda_registration_number: "12345678901",
        fda_registration_status: "active" as const,
        fda_registration_date: "2024-01-15",
        us_agent_name: "John Doe",
        us_agent_email: "john@agent.com",
        us_agent_phone: "+1-555-0100",
        us_agent_address: "123 Main St, NY",
      }

      const result = await validateExportAction(orgWithAgent.id, "USA_TRACEABILITY")

      expect(result.canExport).toBe(false)
      expect(result.blockedFields).toContain("Power of Attorney")
    })

    it("should allow FDA export when all required fields are present", async () => {
      const completeOrg = {
        ...baseOrg,
        fda_registration_number: "12345678901",
        fda_registration_status: "active" as const,
        fda_registration_date: "2024-01-15",
        us_agent_name: "John Doe",
        us_agent_email: "john@agent.com",
        us_agent_phone: "+1-555-0100",
        us_agent_address: "123 Main St, NY",
        poa_signed: true,
      }

      const result = await validateExportAction(completeOrg.id, "USA_TRACEABILITY")

      expect(result.canExport).toBe(true)
      expect(result.format).toBeDefined()
    })

    it("should allow PARTNER export without FDA validation", async () => {
      const result = await validateExportAction(baseOrg.id, "INTERNAL")

      expect(result.canExport).toBe(true)
    })
  })

  describe("getComplianceReadiness", () => {
    let baseOrg: OrganizationData

    beforeEach(() => {
      baseOrg = {
        id: "test-org-id",
        name: "Test Organization",
        organization_type: "processor_manufacturer",
        fda_registration_number: null,
        fda_registration_status: null,
        fda_registration_date: null,
        us_agent_name: null,
        us_agent_email: null,
        us_agent_phone: null,
        us_agent_address: null,
        poa_signed: false,
        poa_signed_date: null,
        poa_document_url: null,
        parent_company_name: null,
        parent_company_country: null,
        duns_number: null,
        facility_fda_number: null,
      }
    })

    it("should return 0% legal readiness when no FDA data", async () => {
      const readiness = await getComplianceReadiness(baseOrg.id)

      expect(readiness).not.toBeNull()
      expect(readiness!.legalReadinessScore).toBe(0)
      expect(readiness!.canExportFDA).toBe(false)
      expect(readiness!.missingFields.length).toBeGreaterThan(0)
    })

    it("should return partial legal readiness when some fields present", async () => {
      const partialOrg = {
        ...baseOrg,
        fda_registration_number: "12345678901",
        fda_registration_status: "active" as const,
        fda_registration_date: "2024-01-15",
      }

      const readiness = await getComplianceReadiness(partialOrg.id)

      expect(readiness).not.toBeNull()
      expect(readiness!.legalReadinessScore).toBeGreaterThan(0)
      expect(readiness!.legalReadinessScore).toBeLessThan(100)
      expect(readiness!.canExportFDA).toBe(false)
      expect(readiness!.missingFields).toContain("U.S. Agent Information")
    })

    it("should return 100% legal readiness when all required fields present", async () => {
      const completeOrg = {
        ...baseOrg,
        fda_registration_number: "12345678901",
        fda_registration_status: "active" as const,
        fda_registration_date: "2024-01-15",
        us_agent_name: "John Doe",
        us_agent_email: "john@agent.com",
        us_agent_phone: "+1-555-0100",
        us_agent_address: "123 Main St, NY",
        poa_signed: true,
      }

      const readiness = await getComplianceReadiness(completeOrg.id)

      expect(readiness).not.toBeNull()
      expect(readiness!.legalReadinessScore).toBe(100)
      expect(readiness!.canExportFDA).toBe(true)
      expect(readiness!.missingFields).toHaveLength(0)
    })

    it("should calculate overall readiness as average of data and legal", async () => {
      const completeOrg = {
        ...baseOrg,
        fda_registration_number: "12345678901",
        fda_registration_status: "active" as const,
        fda_registration_date: "2024-01-15",
        us_agent_name: "John Doe",
        us_agent_email: "john@agent.com",
        us_agent_phone: "+1-555-0100",
        us_agent_address: "123 Main St, NY",
        poa_signed: true,
      }

      const readiness = await getComplianceReadiness(completeOrg.id)

      expect(readiness).not.toBeNull()
      const expectedOverall = (readiness!.dataReadinessScore + readiness!.legalReadinessScore) / 2
      expect(readiness!.overallReadiness).toBe(expectedOverall)
    })

    it("should handle pending registration status", async () => {
      const pendingOrg = {
        ...baseOrg,
        fda_registration_number: "12345678901",
        fda_registration_status: "pending" as const,
        fda_registration_date: "2024-01-15",
        us_agent_name: "John Doe",
        us_agent_email: "john@agent.com",
        us_agent_phone: "+1-555-0100",
        us_agent_address: "123 Main St, NY",
        poa_signed: true,
      }

      const readiness = await getComplianceReadiness(pendingOrg.id)

      expect(readiness).not.toBeNull()
      expect(readiness!.canExportFDA).toBe(true)
      expect(readiness!.legalReadinessScore).toBe(100)
    })
  })

  describe("Edge Cases", () => {
    it("should handle null organization gracefully", () => {
      expect(() => {
        // @ts-expect-error Testing null case
        validateExportAction(null, "FDA_COMPLIANCE")
      }).toThrow()
    })

    it("should handle invalid export type", async () => {
      const org: OrganizationData = {
        id: "test-org",
        name: "Test",
        organization_type: "farm_grower",
        fda_registration_number: null,
        fda_registration_status: null,
        fda_registration_date: null,
        us_agent_name: null,
        us_agent_email: null,
        us_agent_phone: null,
        us_agent_address: null,
        poa_signed: false,
        poa_signed_date: null,
        poa_document_url: null,
        parent_company_name: null,
        parent_company_country: null,
        duns_number: null,
        facility_fda_number: null,
      }

      const result = await validateExportAction(org.id, "USA_TRACEABILITY")
      expect(result.canExport).toBe(false)
    })

    it("should handle whitespace in registration number", async () => {
      const org: OrganizationData = {
        id: "test-org",
        name: "Test",
        organization_type: "farm_grower",
        fda_registration_number: "  12345678901  ",
        fda_registration_status: "active",
        fda_registration_date: "2024-01-15",
        us_agent_name: "John",
        us_agent_email: "john@test.com",
        us_agent_phone: "+1-555-0100",
        us_agent_address: "123 Main",
        poa_signed: true,
        poa_signed_date: null,
        poa_document_url: null,
        parent_company_name: null,
        parent_company_country: null,
        duns_number: null,
        facility_fda_number: null,
      }

      const result = await validateExportAction(org.id, "USA_TRACEABILITY")
      expect(result.canExport).toBe(true)
    })
  })
})
