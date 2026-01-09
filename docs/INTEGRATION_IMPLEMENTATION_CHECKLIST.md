# INTEGRATION IMPLEMENTATION CHECKLIST
## Danh sách kiểm tra chi tiết cho Phase 1, 2, 3 Integration

---

## ✅ PHASE 1 INTEGRATION

### 1.1 Navigation Updates

- [ ] **Add "Traceability" to sidebar**
  - File: `components/fsma/dashboard-sidebar.tsx`
  - Location: Main menu, after "CTE Events"
  - Icon: `GitBranch` from lucide-react
  - Translation keys: Add to `lib/i18n.tsx`

- [ ] **Update dashboard stats to include traceability metrics**
  - File: `app/dashboard/page.tsx`
  - Add: "Complete Traceability Chains" card
  - Query: Count lots with complete backward + forward trace

### 1.2 Inventory Dashboard Widget

- [ ] **Create InventoryLevelsWidget component**
  - File: `components/dashboards/inventory-levels-widget.tsx`
  - Props: `organizationId`, `limit` (default 10)
  - API: Connect to `/api/dashboards/inventory`
  - Features:
    - Show current balance by location
    - Color-code low stock (< 20% of expected)
    - Link to full inventory page

- [ ] **Integrate into dashboard**
  - File: `app/dashboard/page.tsx`
  - Add widget below quick actions
  - Layout: 2-column grid with ExpirationAlertsWidget

- [ ] **Create full Inventory page**
  - File: `app/dashboard/inventory/page.tsx`
  - Features:
    - Real-time inventory by location
    - Filter by food type, location
    - Show loss rates per location
    - Export to CSV

### 1.3 Traceability Chain Viewer Integration

- [ ] **Update TraceabilityChainViewer to accept lotCode prop**
  - File: `components/fsma/traceability-chain-viewer.tsx`
  - Change from input field to prop
  - Add loading skeleton
  - Add error boundary

- [ ] **Integrate into Lot Details page**
  - File: `app/dashboard/lots/[id]/page.tsx`
  - Add new tab: "Traceability"
  - Pass `lot.lot_code` as prop
  - Show both backward and forward chains side-by-side

- [ ] **Add quick trace button to Lots table**
  - File: `app/dashboard/lots/page.tsx`
  - Add icon button in actions column
  - Opens dialog with TraceabilityChainViewer
  - Allow quick view without navigation

### 1.4 Audit Log Viewer

- [ ] **Create AuditLogViewer component**
  - File: `components/fsma/audit-log-viewer.tsx`
  - Props: `lotId`, `eventId`, `entityType`
  - Query: `audit_log` table
  - Features:
    - Timeline view of changes
    - Show old_data vs new_data diff
    - Filter by action (INSERT, UPDATE, DELETE)
    - Color-code by severity

- [ ] **Integrate into Lot Details**
  - File: `app/dashboard/lots/[id]/page.tsx`
  - Add tab: "Audit Log"
  - Show all changes to this lot

- [ ] **Integrate into CTE Event Details**
  - File: `app/dashboard/cte-events/page.tsx`
  - Add audit log section in event detail dialog
  - Show who created/modified event

### 1.5 Quantity Validation Feedback

- [ ] **Add inline validation to transformation forms**
  - File: `components/fsma/kde-form.tsx`
  - Section: Transformation event type
  - Features:
    - Real-time calculation: input = output + loss
    - Visual equation display
    - Color indicators (green = balanced, red = unbalanced)
    - Block submit if unbalanced

- [ ] **Add validation to lot split/merge**
  - File: `app/dashboard/lots/new/page.tsx`
  - When parent_lot_id selected:
    - Show parent quantity
    - Warn if child exceeds parent
    - Calculate remaining parent quantity

---

## ✅ PHASE 2 INTEGRATION

### 2.1 TLC Auto-Generation

- [ ] **Add TLC generator button to Lot Creation**
  - File: `app/dashboard/lots/new/page.tsx`
  - Location: Next to TLC input field
  - Button: "Auto-Generate TLC"
  - Icon: `Sparkles` from lucide-react

- [ ] **Implement TLC generation logic**
  - API call to: `/api/tlc/suggest`
  - Show preview before applying
  - Allow manual override
  - Show format explanation tooltip

- [ ] **Add TLC validation**
  - Check uniqueness in real-time
  - Show error if duplicate
  - Suggest alternative if conflict

### 2.2 Partner Selector Integration

- [ ] **Update PartnerSelector component**
  - File: `components/fsma/partner-selector.tsx`
  - Add: Fetch partners from `supply_chain_partners` table
  - Add: "Create New Partner" quick action
  - Add: Show partner contact info on hover

- [ ] **Integrate into Shipping events**
  - File: `components/fsma/kde-form.tsx`
  - Section: `eventType === 'shipping'`
  - Field label: "Receiver / Destination Partner"
  - Required field

- [ ] **Integrate into Receiving events**
  - File: `components/fsma/kde-form.tsx`
  - Section: `eventType === 'receiving'`
  - Field label: "Sender / Source Partner"
  - Required field

- [ ] **Update form submission**
  - Include `partner_id` in CTE event insert
  - Validate partner exists
  - Link partner to event in junction table

### 2.3 Timeline Validation Warnings

- [ ] **Create TimelineWarning component usage**
  - File: `components/fsma/kde-form.tsx`
  - Trigger: When event_datetime changes
  - Check: Query existing events for this lot
  - Display: Warning alert if chronologically invalid

- [ ] **Add real-time validation**
  - Function: `checkTimelineConflicts(eventType, eventDatetime, lotCode)`
  - Query: Get all events for lot, check order
  - Return: List of conflicting events
  - Show: Specific event that must come before/after

- [ ] **Add override option for admins**
  - Allow system_admin to force save
  - Require reason in text field
  - Log override in audit_log

### 2.4 Expiration Alerts Enhancements

- [ ] **Add action buttons to ExpirationAlertsWidget**
  - Button 1: "Mark as Disposed"
  - Button 2: "Extend Shelf Life"
  - Button 3: "Transfer to Another Location"

- [ ] **Create disposal workflow**
  - Open dialog with disposal reason
  - Update lot status to "disposed"
  - Create CTE event for disposal
  - Update inventory ledger

- [ ] **Create shelf-life extension workflow**
  - Show current expiration date
  - Allow input of new date
  - Require justification (quality check passed, etc.)
  - Log in audit trail

---

## ✅ PHASE 3 INTEGRATION

### 3.1 FDA Response Integration

- [ ] **Update FDA Requests page**
  - File: `app/dashboard/fda-requests/page.tsx`
  - Add: "Generate Report" button in request detail dialog
  - Position: Next to status badge

- [ ] **Implement report generation**
  - API call: `/api/fda/generate-report/[requestId]`
  - Show loading state: "Generating report..."
  - On success: Show download button
  - Store report_file_url in database

- [ ] **Add download button**
  - Show only if report_file_url exists
  - Icon: `Download` from lucide-react
  - Download filename: `FDA-Response-{requestId}-{date}.xlsx`

- [ ] **Add 24-hour countdown timer**
  - Component: Create `DeadlineCountdown.tsx`
  - Show: Hours:Minutes remaining
  - Color: Red if < 6 hours, Yellow if < 12 hours
  - Alert: Toast notification at 6 hours, 2 hours, 30 minutes

### 3.2 Real-Time Dashboards

- [ ] **Replace Analytics page mock data**
  - File: `app/dashboard/analytics/page.tsx`
  - Remove: All mock chart data
  - Add: Real API calls to Phase 3 endpoints

- [ ] **Integrate LossRateChart**
  - Component: `components/dashboards/loss-rate-chart.tsx`
  - Location: Analytics page, top section
  - Data source: `/api/dashboards/loss-rate` (CREATE THIS)
  - Features:
    - Line chart over time
    - Filter by event type
    - Show trend (increasing/decreasing)

- [ ] **Integrate ComplianceScoreWidget**
  - Location: Analytics page, right sidebar
  - Props: `organizationId` (or null for system-wide)
  - Add: Multi-org comparison for admins

- [ ] **Create Inventory Dashboard full page**
  - File: `app/dashboard/inventory/page.tsx`
  - Query: `inventory_ledger` view
  - Features:
    - Table view with current balances
    - Chart: Inventory trends over time
    - Alerts: Low stock warnings
    - Export: CSV/Excel

### 3.3 Batch Operations

- [ ] **Create Batch Operations main page**
  - File: `app/dashboard/batch/page.tsx`
  - Layout: Tabs for 3 operations
  - Tab 1: Bulk Lot Creation
  - Tab 2: Mass Transformation
  - Tab 3: Batch Status Update

- [ ] **Create BulkLotCreationForm**
  - File: `components/batch/bulk-lot-creation-form.tsx`
  - Input: Select harvest CTE event
  - Input: Number of lots to create
  - Input: Lot quantity distribution (equal or custom)
  - API: `/api/batch/create-lots-from-harvest`
  - Output: Show created lots in table

- [ ] **Create MassTransformationForm**
  - File: `components/batch/mass-transformation-form.tsx`
  - Input: Select multiple input lots (checkboxes)
  - Input: Transformation type
  - Input: Output lot configuration
  - Validation: Check total input quantity
  - API: `/api/batch/mass-transformation`
  - Output: Show transformation summary

- [ ] **Create BatchStatusUpdateForm**
  - File: `components/batch/batch-status-update-form.tsx`
  - Input: Select lots via filters or checkboxes
  - Input: New status (dropdown)
  - Input: Update reason (textarea)
  - API: Create endpoint `/api/batch/update-status`
  - Output: Show updated lots count

- [ ] **Add multi-select to Lots table**
  - File: `app/dashboard/lots/page.tsx`
  - Add: Checkbox column (first column)
  - Add: "Actions on Selected" dropdown
  - Actions: Update Status, Export Selected, Delete Selected

### 3.4 Compliance Dashboard Enhancements

- [ ] **Add multi-org compliance view for admins**
  - File: `app/dashboard/analytics/page.tsx` or new `/compliance` page
  - Component: `ComplianceComparisonTable.tsx`
  - Features:
    - Table with all organizations
    - Columns: Org name, Overall score, Lot completeness, CTE coverage, Traceability
    - Sort by any column
    - Color-code scores (green > 90, yellow 75-90, red < 75)
    - Click org to drill down

- [ ] **Add pending approvals queue**
  - Widget: Show high-risk transactions awaiting approval
  - Location: Dashboard or Compliance page
  - Query: `approval_queue` table
  - Actions: Approve / Reject buttons
  - Filter: By approval type

---

## 🛠️ TECHNICAL TASKS

### Error Handling

- [ ] **Create ErrorBoundary component**
  - File: `components/error-boundary.tsx`
  - Wrap all major routes
  - Show user-friendly error messages
  - Log errors to console with `[v0]` prefix

- [ ] **Standardize API error responses**
  - All APIs return: `{ success: boolean, error?: string, data?: any }`
  - Map database errors to user-friendly messages
  - Create error code enum

- [ ] **Add toast notifications for all actions**
  - Success: Green toast with check icon
  - Error: Red toast with X icon
  - Warning: Yellow toast with alert icon
  - Use sonner library consistently

### Loading States

- [ ] **Create loading skeletons for all tables**
  - Component: `components/ui/skeleton-table.tsx`
  - Use in: Lots, CTE Events, Locations, Organizations

- [ ] **Add loading spinners to all buttons**
  - Pattern: `disabled={loading}` + show Spinner icon
  - Use: All form submit buttons, action buttons

- [ ] **Add progress bars for long operations**
  - Use: Batch operations, report generation
  - Component: shadcn/ui Progress

### Empty States

- [ ] **Create EmptyState component**
  - File: `components/ui/empty-state.tsx`
  - Props: icon, title, description, action (optional)
  - Use everywhere: Tables, charts, widgets

- [ ] **Add empty states to all lists**
  - Lots table: "No lots found. Create your first lot."
  - CTE Events: "No events recorded. Log your first event."
  - Traceability: "No traceability chain found."

### Responsive Design

- [ ] **Add horizontal scroll to all tables**
  - Wrap: `<div className="overflow-x-auto"><Table /></div>`
  - Add: Scroll indicators (shadows on edges)

- [ ] **Make TraceabilityChainViewer mobile-friendly**
  - Desktop: Tree layout (horizontal)
  - Mobile: Vertical list layout
  - Use: Tailwind responsive classes (md:)

- [ ] **Test all forms on mobile**
  - Check: Input sizes, button spacing
  - Fix: Multi-column grids collapse to single column

### Accessibility

- [ ] **Add sr-only text to loading states**
  - Example: `<span className="sr-only">Loading...</span>`
  - All spinners and skeleton loaders

- [ ] **Verify keyboard navigation**
  - Test: Tab through all forms
  - Test: Enter to submit, Esc to close dialogs
  - Fix: Any trapped focus issues

- [ ] **Add ARIA labels to icon buttons**
  - All buttons without text labels
  - Example: `<Button aria-label="Edit lot">...</Button>`

### Performance

- [ ] **Add pagination to all tables**
  - Lots, CTE Events, Locations: 50 items per page
  - Use Supabase `.range()`
  - Add pagination UI (shadcn/ui Pagination)

- [ ] **Add debounced search**
  - All search inputs
  - Delay: 300ms
  - Cancel on unmount

- [ ] **Optimize traceability queries**
  - Add indexes: lot_code, parent_lot_id, event_datetime
  - Limit recursion depth: Max 10 levels
  - Cache results: 5 minutes

### Testing

- [ ] **Test end-to-end flows**
  - Flow 1: Create lot → Log CTE event → View traceability
  - Flow 2: Harvest → Transform → Ship → Receive
  - Flow 3: FDA request → Generate report → Download

- [ ] **Test database triggers**
  - Verify: Timeline validation blocks out-of-order events
  - Verify: Quantity validation blocks unbalanced transformations
  - Verify: Audit log captures all changes

- [ ] **Test permissions**
  - Verify: Regular users cannot delete lots
  - Verify: Admins can override timeline validation
  - Verify: System admins see all organizations

---

## 📋 DEFINITION OF DONE

Each task is considered complete when:

- [ ] Code implemented and tested locally
- [ ] Component has loading and error states
- [ ] Responsive on mobile (tested at 375px width)
- [ ] Accessible (keyboard navigation works)
- [ ] i18n translations added (English + Vietnamese)
- [ ] No console errors or warnings
- [ ] Integrated into navigation if new page
- [ ] Documentation updated (if new pattern)

---

## 🎯 SUCCESS METRICS

After completing all integration tasks:

- ✅ 100% of Phase 1-3 APIs accessible from UI
- ✅ 0 created components unused
- ✅ 0 hidden features in navigation
- ✅ All tables have loading/empty/error states
- ✅ All forms have inline validation
- ✅ Mobile responsive score > 90%
- ✅ Accessibility score > 85%
- ✅ User can complete end-to-end FSMA 204 workflow without errors

---

**Estimated Total Effort: 4-7 weeks**
**Priority: CRITICAL - Block all new features until integration complete**
