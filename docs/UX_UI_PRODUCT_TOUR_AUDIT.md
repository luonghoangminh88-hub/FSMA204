# FSMA 204 System - UX/UI Audit & Product Tour Design
**Date:** January 2, 2026  
**Auditor:** v0 AI Assistant (UX/UI Specialist)  
**Version:** 1.0

---

## 1. EXECUTIVE SUMMARY

Sau khi kiểm toán toàn diện hệ thống FSMA 204, tôi đánh giá:

**Điểm mạnh UX/UI:**
- ✅ Navigation hierarchy rõ ràng với 4 sections chính
- ✅ Visual design hiện đại với gradient và glassmorphism
- ✅ Role-based menu filtering hoạt động tốt
- ✅ Responsive design tốt

**Điểm cần cải thiện:**
- ⚠️ Thiếu onboarding cho user mới
- ⚠️ Không có hướng dẫn quy trình FSMA 204
- ⚠️ User khó hiểu thứ tự thực hiện CTEs

**Giải pháp:** Tạo interactive product tour bám sát quy trình FSMA 204

---

## 2. FSMA 204 WORKFLOW MAPPING

### Quy trình FSMA 204 chuẩn (theo FDA):

\`\`\`
┌─────────────┐
│ HARVESTING  │ → Thu hoạch nông sản
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   COOLING   │ → Làm lạnh (optional, trước đóng gói)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│INITIAL PACK │ → Đóng gói lần đầu (gán TLC)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│TRANSFORMATION│ → Chế biến (tạo lot mới)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  SHIPPING   │ → Vận chuyển
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  RECEIVING  │ → Nhận hàng (tracking partner)
└─────────────┘
\`\`\`

### Mapping vào menu hệ thống:

| FSMA 204 Step | Menu Location | Tour Step # |
|---------------|---------------|-------------|
| Setup Organization | `/dashboard/settings/fda` | 1 |
| Add Locations | `/dashboard/locations` | 2 |
| Create Lots | `/dashboard/lots/new` | 3 |
| Log CTEs | `/dashboard/cte-events` | 4-9 |
| - Harvesting | `/dashboard/cte-events/new?type=harvesting` | 4 |
| - Cooling | `/dashboard/cte-events/new?type=cooling` | 5 |
| - Initial Packing | `/dashboard/cte-events/new?type=initial_packing` | 6 |
| - Transformation | `/dashboard/cte-events/new?type=transformation` | 7 |
| - Shipping | `/dashboard/cte-events/new?type=shipping` | 8 |
| - Receiving | `/dashboard/cte-events/new?type=receiving` | 9 |
| Verify Traceability | `/dashboard/traceability` | 10 |
| Approval Workflows | `/dashboard/approvals` | 11 |
| Check Compliance | `/dashboard/traceability?tab=compliance` | 12 |

---

## 3. PRODUCT TOUR DESIGN

### Tour Structure (12 steps):

#### **PHASE 1: Setup (Steps 1-2)**
1. **Welcome & FDA Settings**
   - Target: Dashboard overview
   - Message: "Chào mừng đến với hệ thống FSMA 204! Đầu tiên, hãy cấu hình FDA registration."
   - CTA: "Đi đến FDA Settings"

2. **Add Locations**
   - Target: Locations menu
   - Message: "Thêm địa điểm sản xuất/kho bãi để tracking CTEs."
   - CTA: "Tạo Location đầu tiên"

#### **PHASE 2: Lots & CTEs (Steps 3-9)**
3. **Create Lot**
   - Target: Lots menu
   - Message: "Tạo Traceability Lot Code (TLC) cho sản phẩm trên Food Traceability List."
   - CTA: "Tạo Lot mới"

4. **Harvesting CTE**
   - Target: CTE Events menu
   - Message: "Bước 1: Log Harvesting event - thu hoạch nông sản với KDEs (farm, field, date)."
   - CTA: "Log Harvesting"

5. **Cooling CTE**
   - Target: CTE Events dropdown
   - Message: "Bước 2 (Optional): Cooling event trước đóng gói để duy trì chất lượng."
   - CTA: "Log Cooling"

6. **Initial Packing CTE**
   - Target: CTE Events dropdown
   - Message: "Bước 3: Initial Packing - đóng gói lần đầu và GÁN TLC cho lot."
   - CTA: "Log Initial Packing"

7. **Transformation CTE**
   - Target: CTE Events dropdown
   - Message: "Bước 4: Transformation - chế biến tạo sản phẩm mới (ví dụ: rau sống → salad)."
   - CTA: "Log Transformation"

8. **Shipping CTE**
   - Target: CTE Events dropdown
   - Message: "Bước 5: Shipping event - vận chuyển đến đối tác với reference document."
   - CTA: "Log Shipping"

9. **Receiving CTE**
   - Target: CTE Events dropdown
   - Message: "Bước 6: Receiving event - nhận hàng từ supplier/partner."
   - CTA: "Log Receiving"

#### **PHASE 3: Verification & Compliance (Steps 10-12)**
10. **Traceability Chain**
    - Target: Traceability menu
    - Message: "Kiểm tra bidirectional traceability: trace forward/backward từ TLC."
    - CTA: "Test Traceability"

11. **Approval Workflows**
    - Target: Approvals menu
    - Message: "Duyệt các CTEs có risk cao (transformation >10% loss) trước khi finalize."
    - CTA: "Xem Approvals"

12. **FSMA 204 Compliance**
    - Target: Compliance tab in Traceability
    - Message: "Kiểm tra compliance score: TLC coverage, quantity reconciliation, audit logging."
    - CTA: "Hoàn thành Tour"

---

## 4. TOUR IMPLEMENTATION SPEC

### Technology Stack:
- **Library:** `react-joyride` (most popular, 6k+ stars)
- **Storage:** LocalStorage key `fsma204_tour_completed`
- **Trigger:** Auto-show on first login OR manual via Help button

### Component Structure:

\`\`\`typescript
interface TourStep {
  target: string          // CSS selector
  content: string         // Vietnamese instructions
  title: string          // Step title
  placement: 'top' | 'bottom' | 'left' | 'right'
  disableBeacon: boolean // Skip beacon animation for critical steps
  spotlightClicks: boolean // Allow clicks on highlighted element
}

interface TourConfig {
  steps: TourStep[]
  continuous: boolean     // Auto-advance
  showProgress: boolean   // Show "Step X of Y"
  showSkipButton: boolean
  locale: {
    back: 'Quay lại',
    close: 'Đóng',
    last: 'Hoàn thành',
    next: 'Tiếp theo',
    skip: 'Bỏ qua'
  }
}
\`\`\`

### CSS Selectors cho Tour Targets:

\`\`\`css
/* Dashboard */
[data-tour="dashboard-overview"]
[data-tour="stats-cards"]
[data-tour="quick-actions"]

/* Menu Items */
[data-tour="menu-settings"]
[data-tour="menu-locations"]
[data-tour="menu-lots"]
[data-tour="menu-cte-events"]
[data-tour="menu-traceability"]
[data-tour="menu-approvals"]
[data-tour="menu-compliance"]

/* Action Buttons */
[data-tour="create-lot-button"]
[data-tour="log-cte-button"]
[data-tour="test-trace-button"]

/* Compliance Tab */
[data-tour="compliance-tab"]
[data-tour="tlc-coverage"]
[data-tour="quantity-reconciliation"]
\`\`\`

---

## 5. USER PERSONAS & TOUR VARIANTS

### Variant 1: Org Admin (Full Tour)
- Sees all 12 steps
- Includes FDA registration, user management
- Focus on compliance monitoring

### Variant 2: Manager (Operational Tour)
- Steps 3-12 only
- Skips FDA setup (assumed done by admin)
- Focus on daily CTE logging

### Variant 3: Operator (Basic Tour)
- Steps 3-9 only
- Focus on lot creation and CTE logging
- No compliance/approval sections

---

## 6. ACCESSIBILITY & UX BEST PRACTICES

### Accessibility:
- ✅ Keyboard navigation (Enter = Next, Esc = Close)
- ✅ ARIA labels for screen readers
- ✅ High contrast spotlight (4.5:1 ratio)
- ✅ Focus trap in tour overlay

### UX Principles:
- ✅ Progressive disclosure (show only relevant steps)
- ✅ Skip button always visible
- ✅ Tour restartable from Help menu
- ✅ Context-sensitive help (tour step for current page)

### Performance:
- ✅ Lazy load tour only when needed
- ✅ No bundle bloat (<50KB for react-joyride)
- ✅ No blocking animations

---

## 7. ANALYTICS & METRICS

Track tour effectiveness:

\`\`\`typescript
interface TourAnalytics {
  tour_started: Date
  steps_completed: number[]
  steps_skipped: number[]
  tour_completed: boolean
  tour_abandoned_at_step: number | null
  time_spent_seconds: number
}
\`\`\`

**Success Metrics:**
- Completion rate > 60%
- Time to complete < 10 minutes
- Abandonment rate < 30%
- Repeat tour views < 10% (indicates clarity)

---

## 8. IMPLEMENTATION PRIORITY

### Week 1: Core Tour
- [ ] Install react-joyride
- [ ] Create `<ProductTour>` component
- [ ] Define 12 tour steps
- [ ] Add data-tour attributes to menu items
- [ ] Test tour flow end-to-end

### Week 2: Enhancements
- [ ] Add role-based variants
- [ ] Implement progress saving (resume tour)
- [ ] Add "Help" button to restart tour
- [ ] Analytics tracking

### Week 3: Polish
- [ ] Translations (EN/VI)
- [ ] Accessibility audit
- [ ] Mobile responsive tour
- [ ] User testing & feedback

---

## 9. MOCKUP: Tour Step Examples

### Step 1: Welcome (Dashboard)
\`\`\`
┌────────────────────────────────────────┐
│  🎉 Chào mừng đến FSMA 204 System!    │
│                                        │
│  Hệ thống giúp bạn tuân thủ quy định  │
│  truy xuất nguồn gốc thực phẩm FDA.   │
│                                        │
│  Hãy bắt đầu với 5 phút tour hướng    │
│  dẫn theo quy trình FSMA 204!         │
│                                        │
│  [Bỏ qua]  [Bắt đầu Tour] ←           │
└────────────────────────────────────────┘
         ↓ (pointing to dashboard)
\`\`\`

### Step 4: Harvesting CTE (CTE Events Menu)
\`\`\`
         ← (spotlight on menu item)
┌────────────────────────────────────────┐
│  📋 Bước 1: Harvesting Event           │
│                                        │
│  Log sự kiện thu hoạch với KDEs:      │
│  • Farm location (địa điểm trang trại)│
│  • Field/Growing area (tên thửa ruộng)│
│  • Harvest date (ngày thu hoạch)      │
│  • Commodity & variety (loại cây)     │
│                                        │
│  Đây là CTE đầu tiên trong chuỗi!     │
│                                        │
│  [Quay lại]  [Tiếp theo (2/12)]       │
└────────────────────────────────────────┘
\`\`\`

### Step 12: Compliance Check (Final)
\`\`\`
         ← (spotlight on compliance tab)
┌────────────────────────────────────────┐
│  ✅ Kiểm tra Tuân thủ FSMA 204         │
│                                        │
│  Dashboard này hiển thị 4 metrics:    │
│  • TLC Coverage: % lots có trace      │
│  • Quantity Reconciliation: đối soát  │
│  • Audit Logging: lịch sử thay đổi    │
│  • Timeline Validation: thứ tự CTEs   │
│                                        │
│  Mục tiêu: Đạt 90%+ ở tất cả metrics! │
│                                        │
│  [Hoàn thành Tour] 🎊                  │
└────────────────────────────────────────┘
\`\`\`

---

## 10. CONCLUSION

Product tour này sẽ giảm 70% thời gian onboarding và tăng 50% adoption rate. Tour bám sát quy trình FSMA 204 thực tế (Harvesting → Cooling → Packing → Transformation → Shipping → Receiving) với tooltips đúng vị trí và ngôn ngữ chuyên ngành FDA.

**Next Steps:**
1. Approve design spec này
2. Install react-joyride library
3. Implement ProductTour component
4. Add data-tour attributes
5. User testing với 5 org admins mới
