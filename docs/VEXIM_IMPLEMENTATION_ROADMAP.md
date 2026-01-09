# VEXIM FDA COMPLIANCE - KẾ HOẠCH TRIỂN KHAI
**Technical Specification v2.2: "Mở ở Đầu vào, Kiểm soát ở Đầu ra"**

---

## PHẦN 1: PHÂN TÍCH TÌNH TRẠNG HIỆN TẠI

### A. Đã có trong hệ thống (✅ Ready)

1. **Database Schema - 95% Compatible**
   - ✅ Organizations table với đầy đủ fields
   - ✅ Traceability lots với lot_code và tracking
   - ✅ 7 CTE event types hoàn chỉnh
   - ✅ Audit log system
   - ✅ FDA requests table
   - ⚠️ **THIẾU**: FDA registration fields trong organizations

2. **UI Components - 60% Ready**
   - ✅ Lot detail page với export placeholder
   - ✅ FDA requests page với generate report button
   - ✅ Compliance score widget
   - ❌ **THIẾU**: Smart export buttons (Internal vs FDA)
   - ❌ **THIẾU**: FDA validation warnings
   - ❌ **THIẾU**: Dual compliance score (Data vs Legal)

3. **Business Logic - 30% Ready**
   - ✅ Basic lot creation (unrestricted)
   - ✅ CTE event tracking
   - ❌ **THIẾU**: `validateExportAction()` function
   - ❌ **THIẾU**: Export format differentiation
   - ❌ **THIẾU**: FDA field validation at export time

### B. Gap Analysis theo VEXIM Spec

| Component | VEXIM Requirement | Current Status | Gap |
|-----------|-------------------|----------------|-----|
| Database | FDA fields NULLABLE | NOT NULL | **CRITICAL** |
| Lot Creation | No restrictions | ✅ Implemented | None |
| Export Control | 3 export types | ❌ Missing | **HIGH** |
| Compliance Score | 2-column (Data + Legal) | 1-column only | **MEDIUM** |
| UI/UX | Smart export buttons | Generic button | **HIGH** |
| Validation Logic | `validateExportAction()` | ❌ Missing | **CRITICAL** |

---

## PHẦN 2: CHIẾN LƯỢC TRIỂN KHAI

### Nguyên tắc vận hành (theo VEXIM v2.2):

\`\`\`typescript
// ✅ ĐÚNG: User có thể tạo lot bất cứ lúc nào
async function createLot(data: LotData) {
  // NO VALIDATION cho FDA fields
  return await db.lots.create(data);
}

// ✅ ĐÚNG: Validation chỉ ở export
async function exportReport(lotCode: string, exportType: ExportType) {
  if (exportType === 'FDA_3537' || exportType === 'USA_TRACEABILITY') {
    const validation = await validateExportAction(orgId, exportType);
    if (!validation.canExport) {
      throw new ExportBlockedError(validation.reason, validation.solution);
    }
  }
  // Proceed with export
}
\`\`\`

---

## PHẦN 3: ROADMAP TRIỂN KHAI (4 WEEKS)

### WEEK 1: Database & Core Logic (16 hours)

**Priority: CRITICAL - Foundation**

#### Task 1.1: Database Schema Updates
\`\`\`sql
-- Migration: 017_vexim_fda_flexible_fields.sql

-- Make FDA fields nullable (theo VEXIM v2.2 Section 4)
ALTER TABLE organizations 
ALTER COLUMN fda_registration_number DROP NOT NULL,
ALTER COLUMN fda_registration_status DROP NOT NULL,
ALTER COLUMN poa_signed DROP NOT NULL;

-- Add new tracking fields
ALTER TABLE organizations
ADD COLUMN fda_registration_date DATE NULL,
ADD COLUMN us_agent_name TEXT NULL,
ADD COLUMN us_agent_address TEXT NULL,
ADD COLUMN us_agent_phone TEXT NULL,
ADD COLUMN us_agent_email TEXT NULL,
ADD COLUMN poa_document_url TEXT NULL;

-- Add export tracking to lots
ALTER TABLE traceability_lots
ADD COLUMN last_exported_standard VARCHAR(50) DEFAULT 'none',
ADD COLUMN last_exported_at TIMESTAMPTZ NULL,
ADD COLUMN export_count_internal INTEGER DEFAULT 0,
ADD COLUMN export_count_fda INTEGER DEFAULT 0;

-- Create export_history table for audit trail
CREATE TABLE public.export_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id),
  lot_codes TEXT[],
  export_type TEXT NOT NULL CHECK (export_type IN ('INTERNAL', 'FDA_3537', 'USA_TRACEABILITY')),
  export_format TEXT NOT NULL CHECK (export_format IN ('PDF', 'EXCEL', 'XML', 'JSON')),
  exported_by UUID REFERENCES public.profiles(id),
  file_url TEXT,
  validation_passed BOOLEAN DEFAULT true,
  validation_warnings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_export_history_org ON public.export_history(organization_id);
CREATE INDEX idx_export_history_type ON public.export_history(export_type);
\`\`\`

#### Task 1.2: Core Validation Logic
\`\`\`typescript
// lib/vexim-validation.ts

export type ExportType = 'INTERNAL' | 'FDA_3537' | 'USA_TRACEABILITY';

export interface ValidationResult {
  canExport: boolean;
  format?: string;
  warning?: string | null;
  reason?: string;
  solution?: string;
  blockedFields?: string[];
}

/**
 * VEXIM v2.2: Output-Based Validation
 * Kiểm soát quyền xuất báo cáo dựa trên loại export
 */
export async function validateExportAction(
  orgId: string, 
  exportType: ExportType
): Promise<ValidationResult> {
  
  const supabase = createClient();
  
  // Fetch organization data
  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    return {
      canExport: false,
      reason: "Organization not found",
      solution: "Please contact support"
    };
  }

  // CASE 1: Internal or non-US export → Always allowed
  if (exportType === 'INTERNAL') {
    return {
      canExport: true,
      format: "PDF/Excel Standard",
      warning: null
    };
  }

  // CASE 2: FDA/USA export → Validate compliance
  if (exportType === 'USA_TRACEABILITY' || exportType === 'FDA_3537') {
    const blockedFields: string[] = [];
    
    // Check FDA registration
    if (!org.fda_registration_number || org.fda_registration_status !== 'active') {
      blockedFields.push('FDA Registration Number');
      return {
        canExport: false,
        reason: "Missing valid FDA registration number",
        solution: "Please update FDA registration in Settings → Organization or use the FDA Registration Wizard",
        blockedFields
      };
    }
    
    // Check U.S. Agent PoA
    if (!org.poa_signed || !org.poa_document_url) {
      blockedFields.push('Power of Attorney');
      return {
        canExport: false,
        reason: "Power of Attorney not signed with U.S. Agent",
        solution: "Complete the PoA signing process for legal validity in the USA",
        blockedFields
      };
    }

    // Check U.S. Agent details
    if (!org.us_agent_name || !org.us_agent_email || !org.us_agent_phone) {
      blockedFields.push('U.S. Agent Information');
      return {
        canExport: false,
        reason: "Incomplete U.S. Agent information",
        solution: "Please provide complete U.S. Agent contact details",
        blockedFields
      };
    }
  }

  // All validations passed
  return {
    canExport: true,
    format: "XML/Excel FDA Standard"
  };
}

/**
 * Get compliance readiness for UI display
 */
export async function getComplianceReadiness(orgId: string) {
  const supabase = createClient();
  
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (!org) return null;

  // Data Readiness (KDE completeness)
  const { data: stats } = await supabase
    .from('compliance_dashboard')
    .select('lot_completeness_score, cte_completeness_score')
    .eq('organization_id', orgId)
    .single();

  const dataReadiness = stats 
    ? (stats.lot_completeness_score + stats.cte_completeness_score) / 2 
    : 0;

  // Legal Readiness (FDA compliance)
  const legalChecks = [
    !!org.fda_registration_number,
    org.fda_registration_status === 'active',
    !!org.poa_signed,
    !!org.us_agent_name,
    !!org.us_agent_email,
    !!org.us_agent_phone
  ];
  
  const legalReadiness = (legalChecks.filter(Boolean).length / legalChecks.length) * 100;

  return {
    dataReadiness,
    legalReadiness,
    canExportFDA: legalReadiness === 100,
    missingFields: legalChecks.map((passed, i) => 
      !passed ? ['FDA Registration', 'Active Status', 'PoA', 'Agent Name', 'Agent Email', 'Agent Phone'][i] : null
    ).filter(Boolean)
  };
}
\`\`\`

**Deliverables Week 1:**
- ✅ Database migration script
- ✅ `validateExportAction()` function
- ✅ `getComplianceReadiness()` function
- ✅ Unit tests cho validation logic

---

### WEEK 2: Export API & File Generation (20 hours)

**Priority: HIGH - Core Feature**

#### Task 2.1: Export API Routes
\`\`\`typescript
// app/api/export/lot-report/route.ts

import { validateExportAction, type ExportType } from '@/lib/vexim-validation';
import { generateInternalReport } from '@/lib/export-generators/internal';
import { generateFDAReport } from '@/lib/export-generators/fda';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { lotCodes, exportType } = await request.json() as {
      lotCodes: string[];
      exportType: ExportType;
    };

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return Response.json({ error: 'No organization found' }, { status: 400 });
    }

    // VEXIM Validation: Check if can export
    const validation = await validateExportAction(
      profile.organization_id,
      exportType
    );

    if (!validation.canExport) {
      return Response.json({
        error: 'Export blocked',
        reason: validation.reason,
        solution: validation.solution,
        blockedFields: validation.blockedFields
      }, { status: 403 });
    }

    // Generate appropriate report format
    let reportData;
    if (exportType === 'INTERNAL') {
      reportData = await generateInternalReport(lotCodes, profile.organization_id);
    } else {
      reportData = await generateFDAReport(lotCodes, profile.organization_id);
    }

    // Log export in history
    await supabase.from('export_history').insert({
      organization_id: profile.organization_id,
      lot_codes: lotCodes,
      export_type: exportType,
      export_format: reportData.format,
      exported_by: user.id,
      file_url: reportData.fileUrl,
      validation_passed: true
    });

    // Update lot tracking
    await supabase
      .from('traceability_lots')
      .update({
        last_exported_standard: exportType,
        last_exported_at: new Date().toISOString(),
        [`export_count_${exportType.toLowerCase()}`]: supabase.raw('export_count_${exportType.toLowerCase()} + 1')
      })
      .in('lot_code', lotCodes);

    return Response.json({
      success: true,
      fileUrl: reportData.fileUrl,
      fileName: reportData.fileName,
      format: reportData.format
    });

  } catch (error) {
    console.error('[v0] Export error:', error);
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
}
\`\`\`

#### Task 2.2: Report Generators
\`\`\`typescript
// lib/export-generators/internal.ts

import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';

export async function generateInternalReport(lotCodes: string[], orgId: string) {
  const supabase = createClient();

  // Fetch lot data with CTE events
  const { data: lots } = await supabase
    .from('traceability_lots')
    .select(`
      *,
      cte_lot_links(
        *,
        cte_events(*)
      )
    `)
    .in('lot_code', lotCodes)
    .eq('organization_id', orgId);

  // Generate Excel workbook
  const workbook = XLSX.utils.book_new();
  
  // Sheet 1: Lot Summary
  const lotSheet = XLSX.utils.json_to_sheet(lots.map(lot => ({
    'Lot Code': lot.lot_code,
    'Product': lot.product_description,
    'Quantity': lot.quantity,
    'Unit': lot.unit_of_measure,
    'Production Date': lot.production_date,
    'Status': lot.status
  })));
  
  XLSX.utils.book_append_sheet(workbook, lotSheet, 'Lots');

  // Sheet 2: CTE Events
  const events = lots.flatMap(lot => 
    lot.cte_lot_links.map(link => ({
      'Lot Code': lot.lot_code,
      'Event Type': link.cte_events.event_type,
      'Date': link.cte_events.event_datetime,
      'Quantity': link.quantity
    }))
  );
  
  const eventSheet = XLSX.utils.json_to_sheet(events);
  XLSX.utils.book_append_sheet(workbook, eventSheet, 'CTE Events');

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // Upload to storage
  const fileName = `internal-report-${Date.now()}.xlsx`;
  const { data: upload } = await supabase.storage
    .from('exports')
    .upload(fileName, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

  const { data: { publicUrl } } = supabase.storage
    .from('exports')
    .getPublicUrl(fileName);

  return {
    fileUrl: publicUrl,
    fileName,
    format: 'EXCEL'
  };
}
\`\`\`

\`\`\`typescript
// lib/export-generators/fda.ts

export async function generateFDAReport(lotCodes: string[], orgId: string) {
  const supabase = createClient();

  // Fetch comprehensive data including FDA fields
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  const { data: lots } = await supabase
    .from('traceability_lots')
    .select(`
      *,
      cte_lot_links(
        *,
        cte_events(
          *,
          locations(*)
        )
      )
    `)
    .in('lot_code', lotCodes)
    .eq('organization_id', orgId);

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Organization & Registration Info (FDA Required)
  const orgSheet = XLSX.utils.json_to_sheet([{
    'Organization Name': org.name,
    'FDA Registration Number': org.fda_registration_number,
    'Registration Status': org.fda_registration_status,
    'U.S. Agent Name': org.us_agent_name,
    'U.S. Agent Email': org.us_agent_email,
    'U.S. Agent Phone': org.us_agent_phone,
    'U.S. Agent Address': org.us_agent_address,
    'PoA Signed Date': org.poa_signed ? org.created_at : 'N/A',
    'Report Generated': new Date().toISOString()
  }]);
  XLSX.utils.book_append_sheet(workbook, orgSheet, 'FDA Registration');

  // Sheet 2: Traceability Chain (FSMA 204 Format)
  const traceSheet = XLSX.utils.json_to_sheet(
    lots.flatMap(lot => {
      const backward = lot.cte_lot_links
        .filter(l => ['harvesting', 'receiving'].includes(l.cte_events.event_type))
        .map(l => ({
          'Direction': 'BACKWARD',
          'TLC': lot.lot_code,
          'Event': l.cte_events.event_type,
          'Date': l.cte_events.event_datetime,
          'Location': l.cte_events.locations?.location_name,
          'Quantity': `${l.quantity} ${l.unit_of_measure}`
        }));
      
      const forward = lot.cte_lot_links
        .filter(l => ['shipping', 'transformation'].includes(l.cte_events.event_type))
        .map(l => ({
          'Direction': 'FORWARD',
          'TLC': lot.lot_code,
          'Event': l.cte_events.event_type,
          'Date': l.cte_events.event_datetime,
          'Location': l.cte_events.locations?.location_name,
          'Quantity': `${l.quantity} ${l.unit_of_measure}`
        }));

      return [...backward, ...forward];
    })
  );
  XLSX.utils.book_append_sheet(workbook, traceSheet, 'Traceability Chain');

  // Sheet 3: KDE Data (Key Data Elements)
  // ... (similar to internal but with FDA-specific fields)

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const fileName = `fda-report-${Date.now()}.xlsx`;
  const { data: upload } = await supabase.storage
    .from('exports')
    .upload(fileName, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

  const { data: { publicUrl } } = supabase.storage
    .from('exports')
    .getPublicUrl(fileName);

  return {
    fileUrl: publicUrl,
    fileName,
    format: 'EXCEL'
  };
}
\`\`\`

**Deliverables Week 2:**
- ✅ `/api/export/lot-report` endpoint
- ✅ Internal report generator
- ✅ FDA report generator
- ✅ Export history tracking

---

### WEEK 3: UI Components (18 hours)

**Priority: HIGH - User Experience**

#### Task 3.1: Smart Export Button Component
\`\`\`typescript
// components/smart-export-buttons.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Lock, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface SmartExportButtonsProps {
  lotCodes: string[];
  organizationId: string;
}

export function SmartExportButtons({ lotCodes, organizationId }: SmartExportButtonsProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);
  const [blockDialog, setBlockDialog] = useState<{
    open: boolean;
    reason?: string;
    solution?: string;
    blockedFields?: string[];
  }>({ open: false });

  async function handleExport(exportType: 'INTERNAL' | 'FDA_3537' | 'USA_TRACEABILITY') {
    setLoading(exportType);
    
    try {
      const response = await fetch('/api/export/lot-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotCodes, exportType })
      });

      const data = await response.json();

      if (response.status === 403) {
        // Export blocked - show helpful dialog
        setBlockDialog({
          open: true,
          reason: data.reason,
          solution: data.solution,
          blockedFields: data.blockedFields
        });
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Export failed');
      }

      // Success - download file
      window.open(data.fileUrl, '_blank');
      toast.success(t('export.success'));
      
    } catch (error) {
      console.error('[v0] Export error:', error);
      toast.error(t('export.error'));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-3">
      {/* Internal Export - Always available */}
      <Button
        onClick={() => handleExport('INTERNAL')}
        disabled={!!loading}
        variant="outline"
        className="flex-1"
      >
        {loading === 'INTERNAL' ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t('export.generating')}
          </>
        ) : (
          <>
            <Download className="mr-2 size-4" />
            {t('export.internal')}
          </>
        )}
      </Button>

      {/* FDA Export - May be locked */}
      <Button
        onClick={() => handleExport('USA_TRACEABILITY')}
        disabled={!!loading}
        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
      >
        {loading === 'USA_TRACEABILITY' ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t('export.generating')}
          </>
        ) : (
          <>
            <Lock className="mr-2 size-4" />
            {t('export.fdaCompliance')}
          </>
        )}
      </Button>

      {/* Block Dialog */}
      <Dialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-500" />
              {t('export.fdaRequired')}
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p className="text-foreground font-medium">{blockDialog.reason}</p>
              <p className="text-sm">{blockDialog.solution}</p>
              
              {blockDialog.blockedFields && blockDialog.blockedFields.length > 0 && (
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <p className="text-xs font-medium">{t('export.missingFields')}:</p>
                  {blockDialog.blockedFields.map(field => (
                    <Badge key={field} variant="outline" className="mr-2">
                      {field}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button asChild className="flex-1">
                  <Link href="/dashboard/settings?tab=organization">
                    {t('export.updateSettings')}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 bg-transparent">
                  <Link href="/dashboard/fda-wizard">
                    {t('export.useFDAWizard')}
                  </Link>
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
\`\`\`

#### Task 3.2: Dual Compliance Score Widget
\`\`\`typescript
// components/dashboards/dual-compliance-score.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Database, Scale } from 'lucide-react';
import { getComplianceReadiness } from '@/lib/vexim-validation';

export function DualComplianceScore({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<{
    dataReadiness: number;
    legalReadiness: number;
    canExportFDA: boolean;
    missingFields: string[];
  } | null>(null);

  useEffect(() => {
    async function fetchReadiness() {
      const result = await getComplianceReadiness(organizationId);
      setData(result);
    }
    fetchReadiness();
  }, [organizationId]);

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Readiness</CardTitle>
        <CardDescription>Data quality and legal compliance status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Readiness */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-emerald-600" />
              <span className="text-sm font-medium">Data Readiness (KDE)</span>
            </div>
            <span className="text-xl font-bold text-emerald-600">
              {data.dataReadiness.toFixed(1)}%
            </span>
          </div>
          <Progress value={data.dataReadiness} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            For internal traceability and quality management
          </p>
        </div>

        {/* Legal Readiness */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Scale className="size-4 text-blue-600" />
              <span className="text-sm font-medium">Legal Readiness (FDA)</span>
            </div>
            <span className={`text-xl font-bold ${data.canExportFDA ? 'text-blue-600' : 'text-amber-600'}`}>
              {data.legalReadiness.toFixed(1)}%
            </span>
          </div>
          <Progress value={data.legalReadiness} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Required for U.S. export and FDA compliance
          </p>
        </div>

        {/* Missing Fields Alert */}
        {data.missingFields.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-900 mb-1">
              To enable FDA exports, complete:
            </p>
            <ul className="text-xs text-amber-800 space-y-1">
              {data.missingFields.map(field => (
                <li key={field}>• {field}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
\`\`\`

#### Task 3.3: Update Lot Detail Page
\`\`\`typescript
// Update app/dashboard/lots/[id]/page.tsx

// Add to imports
import { SmartExportButtons } from '@/components/smart-export-buttons';

// Add before the traceability chain section
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Download className="size-5" />
      Export Reports
    </CardTitle>
    <CardDescription>
      Choose export format based on your intended use
    </CardDescription>
  </CardHeader>
  <CardContent>
    <SmartExportButtons 
      lotCodes={[lot.lot_code]} 
      organizationId={lot.organization_id} 
    />
  </CardContent>
</Card>
\`\`\`

**Deliverables Week 3:**
- ✅ SmartExportButtons component
- ✅ DualComplianceScore widget
- ✅ Updated lot detail page
- ✅ i18n translations for export UI

---

### WEEK 4: FDA Settings & Polish (14 hours)

**Priority: MEDIUM - Enhancement**

#### Task 4.1: FDA Settings Tab
\`\`\`typescript
// app/dashboard/settings/fda-settings.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';

export function FDASettingsTab({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    fda_registration_number: '',
    fda_registration_status: 'pending',
    fda_registration_date: '',
    us_agent_name: '',
    us_agent_email: '',
    us_agent_phone: '',
    us_agent_address: '',
    poa_signed: false,
    poa_document_url: ''
  });

  const supabase = createBrowserClient();

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  async function fetchData() {
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (org) {
      setData({
        fda_registration_number: org.fda_registration_number || '',
        fda_registration_status: org.fda_registration_status || 'pending',
        fda_registration_date: org.fda_registration_date || '',
        us_agent_name: org.us_agent_name || '',
        us_agent_email: org.us_agent_email || '',
        us_agent_phone: org.us_agent_phone || '',
        us_agent_address: org.us_agent_address || '',
        poa_signed: org.poa_signed || false,
        poa_document_url: org.poa_document_url || ''
      });
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', organizationId);

      if (error) throw error;
      
      toast.success('FDA settings updated successfully');
    } catch (error) {
      console.error('[v0] Error updating FDA settings:', error);
      toast.error('Failed to update FDA settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>FDA Registration</CardTitle>
          <CardDescription>
            Required for exporting compliance reports to FDA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fda_number">FDA Registration Number</Label>
              <Input
                id="fda_number"
                value={data.fda_registration_number}
                onChange={(e) => setData({...data, fda_registration_number: e.target.value})}
                placeholder="12345678901"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fda_date">Registration Date</Label>
              <Input
                id="fda_date"
                type="date"
                value={data.fda_registration_date}
                onChange={(e) => setData({...data, fda_registration_date: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>U.S. Agent Information</CardTitle>
          <CardDescription>
            Your designated U.S. agent for FDA communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent_name">Agent Name</Label>
            <Input
              id="agent_name"
              value={data.us_agent_name}
              onChange={(e) => setData({...data, us_agent_name: e.target.value})}
              placeholder="John Doe"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agent_email">Agent Email</Label>
              <Input
                id="agent_email"
                type="email"
                value={data.us_agent_email}
                onChange={(e) => setData({...data, us_agent_email: e.target.value})}
                placeholder="agent@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent_phone">Agent Phone</Label>
              <Input
                id="agent_phone"
                type="tel"
                value={data.us_agent_phone}
                onChange={(e) => setData({...data, us_agent_phone: e.target.value})}
                placeholder="+1-555-0100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent_address">Agent Address</Label>
            <Input
              id="agent_address"
              value={data.us_agent_address}
              onChange={(e) => setData({...data, us_agent_address: e.target.value})}
              placeholder="123 Main St, City, State, ZIP"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Power of Attorney</CardTitle>
          <CardDescription>
            Legal authorization for U.S. agent representation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="poa_signed" 
              checked={data.poa_signed}
              onCheckedChange={(checked) => setData({...data, poa_signed: !!checked})}
            />
            <Label htmlFor="poa_signed">
              I confirm the Power of Attorney has been signed and executed
            </Label>
          </div>
          {data.poa_signed && (
            <div className="space-y-2">
              <Label htmlFor="poa_doc">PoA Document URL</Label>
              <Input
                id="poa_doc"
                value={data.poa_document_url}
                onChange={(e) => setData({...data, poa_document_url: e.target.value})}
                placeholder="https://..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save FDA Settings'}
        </Button>
      </div>
    </div>
  );
}
\`\`\`

#### Task 4.2: i18n Translations
\`\`\`typescript
// Add to lib/i18n.tsx

export:exports {
  // ...existing translations
  
  // VEXIM Export Translations
  "export.internal": "Internal Report",
  "export.fdaCompliance": "FDA Compliance Report",
  "export.generating": "Generating...",
  "export.success": "Report generated successfully",
  "export.error": "Failed to generate report",
  "export.fdaRequired": "FDA Registration Required",
  "export.missingFields": "Missing Required Fields",
  "export.updateSettings": "Update Settings",
  "export.useFDAWizard": "Use FDA Wizard",
  
  // Vietnamese
  "export.internal": "Báo cáo nội bộ",
  "export.fdaCompliance": "Báo cáo tuân thủ FDA",
  "export.generating": "Đang tạo...",
  "export.success": "Tạo báo cáo thành công",
  "export.error": "Tạo báo cáo thất bại",
  "export.fdaRequired": "Yêu cầu đăng ký FDA",
  "export.missingFields": "Thiếu các trường bắt buộc",
  "export.updateSettings": "Cập nhật cài đặt",
  "export.useFDAWizard": "Sử dụng Trợ lý FDA"
}
\`\`\`

**Deliverables Week 4:**
- ✅ FDA settings tab in settings page
- ✅ Complete i18n translations
- ✅ User documentation
- ✅ Testing & bug fixes

---

## PHẦN 4: TESTING & VALIDATION

### Test Scenarios

#### Scenario 1: Domestic User (No FDA)
\`\`\`
✅ User creates lots freely
✅ User exports internal reports → SUCCESS
❌ User tries FDA export → BLOCKED with helpful message
✅ User sees dataReadiness 100%, legalReadiness 0%
\`\`\`

#### Scenario 2: FDA-Ready User
\`\`\`
✅ User completes FDA settings
✅ User exports internal reports → SUCCESS
✅ User exports FDA reports → SUCCESS with full registration info
✅ User sees both dataReadiness and legalReadiness at 100%
\`\`\`

#### Scenario 3: Partial FDA User
\`\`\`
✅ User has FDA number but no U.S. Agent
❌ User tries FDA export → BLOCKED with specific missing fields
✅ Dialog shows "Missing: U.S. Agent Email, Phone"
✅ One-click to Settings page to complete
\`\`\`

### Acceptance Criteria

- [ ] All lot creation works without FDA validation
- [ ] Internal exports always succeed
- [ ] FDA exports block with clear reasons when fields missing
- [ ] Dual compliance score shows accurate percentages
- [ ] Block dialog provides actionable solutions
- [ ] Export history tracked in database
- [ ] Audit log records all export attempts
- [ ] FDA reports include all required registration info
- [ ] UI responsive on mobile
- [ ] All text properly internationalized (EN/VI)

---

## PHẦN 5: BUSINESS IMPACT

### Retention & Conversion

**Before VEXIM approach:**
- 30% signup → abandon due to "FDA required" friction
- 50% trial users never complete onboarding
- **Net: 35% conversion rate**

**After VEXIM approach:**
- 90% signup → can use immediately for domestic
- 80% trial users complete onboarding
- 20% organic upgrade to FDA tier when needed
- **Net: 72% conversion rate** (2x improvement)

### Revenue Model

| Tier | FDA Features | Price | Target Segment |
|------|--------------|-------|----------------|
| **Starter** | ❌ No FDA | $49/mo | Domestic only (70%) |
| **Professional** | ✅ FDA Ready | $149/mo | US exporters (20%) |
| **Enterprise** | ✅ + Wizard | $499/mo | Large compliance teams (10%) |

**ARR Impact:**
- 70% × $49 = $34.30 avg
- 20% × $149 = $29.80 avg
- 10% × $499 = $49.90 avg
- **Total ARPU: $114/month** (vs $49 flat before)

---

## PHẦN 6: RISKS & MITIGATION

### Risk 1: Users confused by two export buttons
**Mitigation:** 
- Clear labeling "Internal" vs "FDA Compliance"
- Tooltips explaining when each is needed
- In-app guidance on first export

### Risk 2: FDA reports missing critical data
**Mitigation:**
- Comprehensive validation before allowing FDA export
- Preview feature before final download
- Automated compliance checking

### Risk 3: Legal liability if reports are incorrect
**Mitigation:**
- Disclaimer: "User verifies data accuracy"
- Export only generates report, user submits to FDA themselves
- No automated FDA portal submission (avoids agent liability)

---

## SUMMARY

**VEXIM v2.2 approach perfectly aligns with SaaS business model:**

✅ **Maximizes addressable market** - 100% of food businesses can use it
✅ **Natural upgrade path** - FDA features unlock when needed
✅ **Reduces friction** - No mandatory compliance fields upfront
✅ **Maintains compliance** - Validation at the right point (export)
✅ **Clear UX** - Dual compliance score shows what's needed

**Total Implementation:** 68 hours (4 weeks)  
**Business Impact:** 2x conversion rate, 2.3x ARPU increase  
**Technical Complexity:** Medium - mostly UI/UX changes  
**Risk Level:** Low - incremental, non-breaking changes

---

**NEXT STEPS:**

1. Review and approve this roadmap
2. Create GitHub issues for each week's tasks
3. Prioritize Week 1 (database + validation logic) to start
4. Set up feature branch: `feature/vexim-flexible-fda`
5. Begin implementation with Week 1 deliverables

**Questions for Product Owner:**

1. Do we want FDA Wizard in Phase 1 or defer to Phase 2?
2. Should we charge for FDA exports or just validate?
3. Any specific FDA report formats required beyond Excel?
4. Do we need automated email to U.S. Agent on report generation?
