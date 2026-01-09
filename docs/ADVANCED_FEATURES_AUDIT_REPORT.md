# BÁO CÁO KIỂM TOÁN: CÁC TÍNH NĂNG NÂNG CAO
**Ngày kiểm toán**: 2 tháng 1, 2026  
**Phạm vi**: Smart TLC, Approval Workflows, Shelf Life & Recall Management  
**Mục đích**: Đánh giá hiện trạng và đề xuất implementation roadmap

---

## 📊 TÓM TẮT ĐIỀU HÀN (EXECUTIVE SUMMARY)

| Feature | Trạng thái | % Hoàn thành | Đề xuất hành động |
|---------|-----------|--------------|-------------------|
| **1. Smart TLC Auto-Generation** | ✅ ĐÃ CÓ | **95%** | Tích hợp vào UI hiện tại |
| **2. Supply Chain Partner Linking** | ⚠️ CƠ BẢN | **30%** | KHÔNG ƯU TIÊN (Phase 3) |
| **3. Approval Workflows** | ⚠️ CƠ BẢN | **40%** | Xây dựng MVP UI |
| **4. Shelf Life & Recall Management** | ✅ ĐÃ CÓ | **80%** | Hoàn thiện recall flow |

**Kết luận**: Hệ thống đã có nền tảng tốt cho 3/4 features. Chỉ cần thêm UI và hoàn thiện workflows.

---

## 1️⃣ SMART TLC AUTO-GENERATION

### ✅ **HIỆN TRẠNG: 95% HOÀN THÀNH**

#### Database Layer (100% ✅)
**File**: `scripts/012_tlc_auto_generation.sql`

**Đã có:**
- ✅ Function `generate_tlc()` - Tạo TLC theo format FSMA 204:
  \`\`\`
  Format: ORG-FOOD-LOC-YYYYMMDD-####
  Example: ABC-STRAW-SF01-20250115-0001
  \`\`\`
- ✅ Function `suggest_tlc()` - Gợi ý TLC trước khi tạo lot
- ✅ Function `validate_tlc_format()` - Validate format
- ✅ Trigger `auto_assign_tlc()` - Tự động gán TLC nếu user không nhập
- ✅ Unique index `idx_unique_tlc_per_org` - Ngăn TLC trùng trong org

#### API Layer (100% ✅)
**File**: `app/api/tlc/suggest/route.ts`

- ✅ POST `/api/tlc/suggest` - API gợi ý TLC
- ✅ Nhận params: `production_date`, `food_id`, `location_id`
- ✅ Trả về: `suggested_tlc` với format chuẩn

#### UI Layer (90% ✅)
**File**: `app/dashboard/lots/new/page.tsx`

**Đã có:**
- ✅ Button "Auto-Generate TLC" với icon Sparkles
- ✅ Loading state khi đang generate
- ✅ Toast notification thành công
- ✅ Error handling

**Thiếu (10%):**
- ⚠️ TLC preview/explanation tooltip
- ⚠️ Format validation trên client-side

### 📍 **NƠI TÍCH HỢP**
**Trang hiện có**: `/dashboard/lots/new` (Đã có, chỉ cần polish)

**Không cần tạo trang mới!**

### ✅ **ĐỀ XUẤT HÀNH ĐỘNG**
**Priority: LOW** (feature đã đủ dùng)

1. ✅ Thêm tooltip giải thích format TLC
2. ✅ Thêm client-side validation khi user nhập thủ công
3. ⏸️ (Optional) Show TLC history/suggestions từ previous lots

---

## 2️⃣ SUPPLY CHAIN PARTNER LINKING

### ⚠️ **HIỆN TRẠNG: 30% HOÀN THÀNH**

#### Database Layer (60% ✅)
**File**: `scripts/013_supply_chain_partner_tracking.sql`

**Đã có:**
- ✅ Table `supply_chain_partners` - Lưu thông tin partners
- ✅ Junction table `lot_partner_chain` - Link lots với partners
- ✅ Function `get_upstream_partners()` - Lấy upstream partners
- ✅ Function `get_downstream_partners()` - Lấy downstream partners

**Thiếu (40%):**
- ❌ Multi-tenant data sharing logic
- ❌ Partner invitation/approval workflow
- ❌ Cross-organization data access control

#### UI Layer (0% ❌)
- ❌ Không có UI để quản lý partners
- ❌ Không có UI để link partners vào lots/events

### 📍 **NƠI TÍCH HỢP**
**KHÔNG NÊN TÍCH HỢP BÂY GIỜ**

**Lý do (theo phân tích của bạn):**
1. Multi-tenant phức tạp
2. 80% khách hàng chỉ cần trace nội bộ
3. Khi FDA hỏi → export file PDF/Excel là đủ
4. Nên đợi có ≥3 enterprise customers cùng supply chain

### ✅ **ĐỀ XUẤT HÀNH ĐỘNG**
**Priority: VERY LOW** (Phase 3, không phải bây giờ)

**⏸️ POSTPONE** - Chỉ implement khi:
- Có ≥3 enterprise customers yêu cầu
- Cùng một supply chain
- Sẵn sàng ép partners dùng chung hệ thống

---

## 3️⃣ APPROVAL WORKFLOWS

### ⚠️ **HIỆN TRẠNG: 40% HOÀN THÀNH**

#### Database Layer (80% ✅)
**File**: `scripts/015_real_time_dashboards.sql`

**Đã có:**
- ✅ View `pending_approvals_queue` - Danh sách transactions cần phê duyệt:
  - Transformations với loss > 10%
  - High-value shipments
  - Status: 'requires_approval'
- ✅ Columns trong `cte_transformation`:
  - `approved_by` (user_id)
  - `approval_notes` (text)
  
**Thiếu (20%):**
- ❌ Approval status tracking (pending/approved/rejected)
- ❌ Approval timestamp
- ❌ Approval history/audit trail

#### API Layer (0% ❌)
- ❌ Không có API để approve/reject
- ❌ Không có API để fetch pending approvals

#### UI Layer (0% ❌)
- ❌ Không có UI hiển thị pending approvals queue
- ❌ Không có buttons Approve/Reject
- ❌ Không có approval workflow trong transformation form

### 📍 **NƠI TÍCH HỢP**

**Option 1: Dashboard Widget** (Recommended ✅)
- Tích hợp vào `/dashboard` (main dashboard)
- Tạo widget "Pending Approvals" bên cạnh Expiration Alerts
- Hiển thị count + quick actions

**Option 2: Dedicated Page**
- Tạo trang mới `/dashboard/approvals`
- Full-featured approval management
- Filtering, search, bulk actions

**Đề xuất: Option 1 + Option 2**
- Widget ở dashboard (visibility cao)
- Link "View All" → trang approvals đầy đủ

### ✅ **ĐỀ XUẤT HÀNH ĐỘNG**
**Priority: MEDIUM** (MVP approval workflow)

**Phase 1 - MVP (2-3 ngày):**
1. ✅ Tạo API routes:
   - `GET /api/approvals/pending` - Lấy queue
   - `POST /api/approvals/approve` - Approve
   - `POST /api/approvals/reject` - Reject
   
2. ✅ Tạo dashboard widget "Pending Approvals":
   - Hiển thị top 5 pending items
   - Quick approve/reject buttons
   - Link to full page
   
3. ✅ Tạo trang `/dashboard/approvals`:
   - Table với pending items
   - Filter by type (transformation/shipment)
   - Approve/Reject modal với notes

**Phase 2 - Enhanced (sau):**
- ⏸️ Multi-level approval (Manager → Director)
- ⏸️ Approval delegation
- ⏸️ Email notifications

---

## 4️⃣ SHELF LIFE & RECALL MANAGEMENT

### ✅ **HIỆN TRẠNG: 80% HOÀN THÀNH**

#### Database Layer (100% ✅)
**File**: `scripts/011_timeline_validation_triggers.sql`

**Đã có:**
- ✅ Table `traceability_lots`:
  - `expiration_date` column
  - `status` column (có giá trị 'recalled')
- ✅ Table `ftl_foods`:
  - `shelf_life_days` column
- ✅ Trigger `check_lot_expiration()`:
  - Auto-calculate expiration từ production_date + shelf_life
  - Warn nếu expiration > recommended shelf life
- ✅ View `lot_expiration_alerts`:
  - Expired lots (< today)
  - Expiring soon (< 7 days)
  - Expiring month (< 30 days)
  - `days_until_expiration` calculated

#### API Layer (100% ✅)
**File**: `app/api/lots/expiring/route.ts`

- ✅ GET `/api/lots/expiring?status=all|expired|expiring_soon`
- ✅ Returns expiring lots với status badges
- ✅ Ordered by expiration date

#### UI Layer (70% ✅)
**File**: `components/expiration-alerts-widget.tsx`

**Đã có:**
- ✅ Widget hiển thị top 5 expiring lots
- ✅ Color-coded badges:
  - 🔴 Expired
  - 🟡 Expiring Soon (< 7 days)
  - 🟢 Expiring Month (< 30 days)
- ✅ Link to "View All Expiring Lots"
- ✅ Tích hợp vào dashboard

**Thiếu (30%):**
- ❌ Không có action buttons (Mark as Disposed, Extend Shelf Life)
- ❌ Không có recall workflow UI:
  - Mark lot as recalled
  - Show downstream impact (lots sử dụng recalled input)
  - Export customer list affected
- ❌ Không có bulk actions cho expired lots

### 📍 **NƠI TÍCH HỢP**

**Đã tích hợp**: `/dashboard` (main page) ✅

**Cần thêm**:
1. **Recall Management Page**: `/dashboard/recalls` (NEW)
   - List recalled lots
   - Recall initiation workflow
   - Impact analysis (downstream tracing)
   - Customer notification list export
   
2. **Enhanced Expiration Actions**:
   - Trong widget hiện tại, thêm dropdown menu:
     - "Mark as Disposed"
     - "Extend Shelf Life" (với justification)
     - "Initiate Recall"

### ✅ **ĐỀ XUẤT HÀNH ĐỘNG**
**Priority: HIGH** (Business value cao, FDA care)

**Phase 1 - Expiration Actions (1-2 ngày):**
1. ✅ Thêm action menu vào ExpirationAlertsWidget:
   - Button "Actions" với dropdown
   - "Mark as Disposed" → update status
   - "Extend Shelf Life" → modal với new date + reason
   
2. ✅ Update lot status workflow:
   - Thêm status 'disposed' vào traceability_lots
   - Audit log khi extend shelf life

**Phase 2 - Recall Management (2-3 ngày):**
1. ✅ Tạo trang `/dashboard/recalls`:
   - Button "Initiate Recall" → modal chọn lot
   - Table hiển thị recalled lots
   - Impact analysis: 
     - Show downstream lots (sử dụng recalled input)
     - Calculate affected quantity
   
2. ✅ Tạo recall report export:
   - API `/api/recalls/[lotCode]/report`
   - Generate PDF với:
     - Recalled lot info
     - Downstream affected lots
     - Customer/recipient list
     - Recommended actions

**Phase 3 - Advanced (sau):**
- ⏸️ Automated recall notifications (email/SMS)
- ⏸️ FDA recall report format export
- ⏸️ Recall effectiveness tracking

---

## 📋 TỔNG HỢP ĐỀ XUẤT IMPLEMENTATION

### **PRIORITY 1: IMMEDIATE** (1 tuần)

#### 1. Approval Workflows MVP ⭐⭐⭐
**Effort**: 2-3 ngày  
**ROI**: Cao - Enterprise thích feature này  
**Files cần tạo**:
- `app/api/approvals/pending/route.ts` (NEW)
- `app/api/approvals/approve/route.ts` (NEW)
- `app/api/approvals/reject/route.ts` (NEW)
- `components/pending-approvals-widget.tsx` (NEW)
- `app/dashboard/approvals/page.tsx` (NEW)

**Nơi tích hợp**:
- Widget vào `/dashboard` (main page)
- Full page `/dashboard/approvals` (NEW)

#### 2. Shelf Life Actions ⭐⭐⭐
**Effort**: 1-2 ngày  
**ROI**: Cao - Pain point lớn, FDA care  
**Files cần sửa**:
- `components/expiration-alerts-widget.tsx` (thêm action menu)
- `app/api/lots/[id]/dispose/route.ts` (NEW)
- `app/api/lots/[id]/extend-shelf-life/route.ts` (NEW)

**Nơi tích hợp**:
- Vào widget hiện tại ở `/dashboard`

### **PRIORITY 2: NEXT SPRINT** (2-3 tuần)

#### 3. Recall Management ⭐⭐
**Effort**: 2-3 ngày  
**ROI**: Cao - Compliance requirement  
**Files cần tạo**:
- `app/dashboard/recalls/page.tsx` (NEW)
- `app/api/recalls/initiate/route.ts` (NEW)
- `app/api/recalls/[lotCode]/impact/route.ts` (NEW)
- `app/api/recalls/[lotCode]/report/route.ts` (NEW)

**Nơi tích hợp**:
- Trang mới `/dashboard/recalls`
- Link từ sidebar menu

#### 4. TLC Polish ⭐
**Effort**: 4-6 giờ  
**ROI**: Thấp - Feature đã hoạt động tốt  
**Files cần sửa**:
- `app/dashboard/lots/new/page.tsx` (thêm tooltip, validation)

**Nơi tích hợp**:
- Trong page hiện tại `/dashboard/lots/new`

### **PRIORITY 3: BACKLOG** (Phase 3)

#### 5. Supply Chain Partner Linking ⏸️
**Effort**: 2-3 tuần  
**ROI**: Thấp - Chỉ cần khi có enterprise demand  
**Điều kiện**: Đợi có ≥3 enterprise customers yêu cầu

---

## 🎯 ROADMAP ĐỀ XUẤT

### **Tuần 1-2: Approval Workflows + Shelf Life Actions**
\`\`\`
Day 1-2: Approval APIs + Widget
Day 3-4: Approval Full Page
Day 5-6: Shelf Life Actions (dispose/extend)
Day 7: Testing + Polish
\`\`\`

### **Tuần 3-4: Recall Management**
\`\`\`
Day 1-2: Recall Page + Initiate Flow
Day 3-4: Impact Analysis API
Day 5-6: Recall Report Export
Day 7: Testing + Integration
\`\`\`

### **Tuần 5: TLC Polish + Documentation**
\`\`\`
Day 1-2: TLC Tooltips + Validation
Day 3-5: User Documentation
Day 6-7: Demo Videos
\`\`\`

---

## 📊 BẢN ĐỒ TÍCH HỢP (INTEGRATION MAP)

\`\`\`
/dashboard (Main)
├── [EXISTING] ExpirationAlertsWidget ✅
│   └── [ADD] Action Menu (dispose/extend)
├── [NEW] PendingApprovalsWidget
│   └── Link to → /dashboard/approvals
└── [NEW] Quick Stats Cards

/dashboard/approvals (NEW PAGE)
├── Pending Queue Table
├── Filter by Type
└── Approve/Reject Modal

/dashboard/recalls (NEW PAGE)
├── Initiate Recall Button
├── Recalled Lots Table
├── Impact Analysis View
└── Export Customer List

/dashboard/lots/new (EXISTING)
└── [POLISH] TLC Auto-Generate
    ├── [ADD] Format Tooltip
    └── [ADD] Client Validation

/dashboard/traceability (EXISTING)
└── [NO CHANGE] Already has FSMA 204 compliance tab
\`\`\`

---

## ✅ CHECKLIST TRIỂN KHAI

### Phase 1: Approval Workflows MVP
- [ ] Tạo API `/api/approvals/*` (3 endpoints)
- [ ] Tạo `PendingApprovalsWidget` component
- [ ] Tích hợp widget vào dashboard
- [ ] Tạo page `/dashboard/approvals`
- [ ] Testing workflows

### Phase 2: Shelf Life Actions
- [ ] Thêm action menu vào `ExpirationAlertsWidget`
- [ ] Tạo API `/api/lots/[id]/dispose`
- [ ] Tạo API `/api/lots/[id]/extend-shelf-life`
- [ ] Modal "Extend Shelf Life" với reason field
- [ ] Testing disposal + extension flows

### Phase 3: Recall Management
- [ ] Tạo page `/dashboard/recalls`
- [ ] Tạo API `/api/recalls/initiate`
- [ ] Implement downstream impact analysis
- [ ] Recall report export (PDF)
- [ ] Testing recall workflows

### Phase 4: Polish
- [ ] TLC format tooltip
- [ ] TLC client-side validation
- [ ] User documentation
- [ ] Demo videos

---

## 💰 BUSINESS IMPACT ANALYSIS

| Feature | User Demand | FDA Compliance | Revenue Impact | Priority |
|---------|-------------|----------------|----------------|----------|
| Approval Workflows | ⭐⭐⭐ Enterprise | ⭐⭐ Important | $$ (Enterprise selling point) | HIGH |
| Shelf Life Actions | ⭐⭐⭐ All users | ⭐⭐⭐ Critical | $$$ (Prevents fines) | HIGH |
| Recall Management | ⭐⭐ Medium | ⭐⭐⭐ Critical | $$ (Risk mitigation) | MEDIUM |
| TLC Polish | ⭐ Low | ✅ Already compliant | $ (Nice-to-have) | LOW |
| Partner Linking | ⭐ Very Low | ⭐ Optional | $$$ (Future) | VERY LOW |

---

## 🎯 KẾT LUẬN

**RECOMMENDATION**: Focus vào Priority 1 trước

1. ✅ **Implement Approval Workflows MVP** (2-3 ngày)
   - Tích hợp vào dashboard hiện tại
   - Tạo page `/dashboard/approvals`
   - ROI cao, Enterprise selling point

2. ✅ **Implement Shelf Life Actions** (1-2 ngày)
   - Thêm vào widget hiện tại
   - Quick wins, user value cao

3. ⏸️ **Recall Management** = Phase 2 (2-3 tuần sau)
   - Tạo page mới `/dashboard/recalls`
   - Compliance requirement

4. ⏸️ **TLC Polish** = Phase 3 (khi rảnh)
   - Feature đã đủ dùng

5. ❌ **Partner Linking** = Không làm bây giờ
   - Đợi enterprise demand

**TOTAL EFFORT**: 1-2 tuần cho Priority 1  
**EXPECTED ROI**: High - Bán được Enterprise, giảm FDA fines

---

**Prepared by**: v0 AI System Auditor  
**Review Status**: Ready for Implementation  
**Next Action**: Review với user → Start implementation
