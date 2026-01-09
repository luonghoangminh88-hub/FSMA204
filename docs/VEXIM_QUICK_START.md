# 🚀 VEXIM Quick Start Guide

## Tổng quan
VEXIM (Validation & Export for International Markets) v2.2 cho phép bạn:
- ✅ Tạo và quản lý lots TỰ DO (không bị block)
- ✅ Export báo cáo nội địa BẤT CỨ LÚC NÀO
- ✅ Export báo cáo FDA chỉ khi đã setup đầy đủ

---

## 🎯 3 Kịch Bản Sử Dụng

### 1️⃣ TRUY XUẤT NỘI ĐỊA (70% users)
**Bạn KHÔNG xuất khẩu Mỹ, chỉ cần traceability nội địa**

**Các bước:**
1. Tạo lots bình thường (không cần FDA info)
2. Ghi sự kiện CTE như thường
3. Export báo cáo → Chọn **"Internal Use"** → ✅ Luôn hoạt động

**Không cần làm gì thêm!**

---

### 2️⃣ ĐÃ CÓ FDA REGISTRATION (20% users)
**Bạn xuất khẩu Mỹ nhưng đã đăng ký FDA với consultant/bên thứ 3**

**Các bước:**
1. Vào **Settings → FDA Compliance**
2. Nhập thông tin FDA đã có:
   - FDA Registration Number
   - U.S. Agent info
   - Facility details
3. Lưu lại
4. Export báo cáo → Chọn **"FDA/USA Export"** → ✅ Hoạt động ngay

**⏱ Thời gian: 5 phút**

---

### 3️⃣ CẦN FDA REGISTRATION MỚI (10% users)
**Bạn mới bắt đầu xuất khẩu Mỹ, chưa có FDA registration**

**Các bước:**
1. Vào **Settings → FDA Compliance**
2. Điền form đầy đủ (hệ thống sẽ highlight missing fields)
3. Tải FDA Pre-filled Form (hệ thống tạo sẵn)
4. Đăng ký tại [FDA Portal](https://www.fda.gov/food/registration-food-facilities)
5. Nhận FDA Registration Number → Cập nhật vào system
6. Export báo cáo → Chọn **"FDA/USA Export"** → ✅ Hoạt động

**⏱ Thời gian setup trong system: 10 phút**  
**⏱ Thời gian đăng ký FDA thực tế: 2-5 ngày**

---

## 📊 Compliance Dashboard

Vào **Dashboard** để xem:

\`\`\`
┌─────────────────────────────────────────┐
│  📊 Compliance Readiness                │
├─────────────────────────────────────────┤
│  Data Readiness:    ████████░░  85%     │
│  Legal Readiness:   ██░░░░░░░░  20%     │
│                                          │
│  ✅ Internal Export: READY               │
│  🔒 FDA Export: LOCKED                   │
│                                          │
│  Missing: FDA Registration, U.S. Agent  │
│  👉 Complete FDA Setup                   │
└─────────────────────────────────────────┘
\`\`\`

**2 Scores:**
- **Data Readiness**: Lot data completeness (thường 85-95%)
- **Legal Readiness**: FDA registration status (0% hoặc 100%)

---

## 🔄 Workflow Thực Tế

### A. Tạo Lot và CTE Events (KHÔNG THAY ĐỔI)
\`\`\`
1. Dashboard → Tạo lô hàng
2. Nhập thông tin lot (như cũ)
3. Ghi CTE events (Cooling, Packing, Shipping...)
4. ✅ Không bị block vì thiếu FDA
\`\`\`

### B. Export Báo Cáo

**Khi vào Lot Details page, bạn sẽ thấy:**

\`\`\`
┌────────────────────────────────────────┐
│  📥 Export Options                     │
├────────────────────────────────────────┤
│                                        │
│  [📊 Internal Export]  ← Luôn sẵn sàng │
│  Download Excel report for internal    │
│  traceability and compliance           │
│                                        │
│  [🔒 FDA/USA Export]   ← Có thể lock   │
│  Generate FDA-compliant report with    │
│  full regulatory details               │
│                                        │
└────────────────────────────────────────┘
\`\`\`

**Nếu click "FDA/USA Export" mà thiếu fields:**

\`\`\`
┌──────────────────────────────────────────┐
│  ⚠️ Cannot Export for FDA                │
├──────────────────────────────────────────┤
│  Your organization is missing required   │
│  FDA registration information:           │
│                                          │
│  ❌ FDA Registration Number              │
│  ❌ U.S. Agent Name                      │
│  ❌ U.S. Agent Phone                     │
│                                          │
│  [Complete FDA Setup →]                  │
└──────────────────────────────────────────┘
\`\`\`

**Click "Complete FDA Setup" → Đến Settings → FDA Compliance**

---

## ⚙️ FDA Settings Page

**Location:** Settings → FDA Compliance

### Sections:

#### 1. Compliance Readiness (Top card)
- Hiển thị 2 progress bars
- List missing fields
- Quick status: Can/Cannot export FDA

#### 2. FDA Registration
\`\`\`
FDA Registration Number: [UFI123456789]
Status:                  [Active ▼]
Facility Type:           [Food Processor ▼]
DUNS Number:             [123456789] (optional)
\`\`\`

#### 3. U.S. Agent Information
\`\`\`
U.S. Agent Name:         [John Smith]
Company:                 [ACME Import Services]
Address:                 [123 Main St]
City:                    [New York]
State:                   [NY ▼]
ZIP:                     [10001]
Phone:                   [+1-212-555-0100]
Email:                   [agent@acme.com]
\`\`\`

#### 4. Power of Attorney (Checkbox)
\`\`\`
☑ Power of Attorney signed and filed with FDA

PoA Signed Date:         [2024-01-15]
PoA Document URL:        [https://...]
\`\`\`

#### 5. Parent Company (Optional)
\`\`\`
☐ Part of parent company

Parent Company Name:     [...optional...]
Parent DUNS:            [...optional...]
\`\`\`

**[Save FDA Settings]** ← Click để lưu

---

## 🧪 Testing Workflow

### Test Case 1: Internal Export (Luôn hoạt động)
\`\`\`bash
1. Tạo lot mới với minimal data
2. Vào Lot Details
3. Click "Internal Export"
4. ✅ Download ngay lập tức Excel file
\`\`\`

### Test Case 2: FDA Export - Thiếu fields
\`\`\`bash
1. Tạo lot mới
2. Vào Lot Details
3. Click "FDA/USA Export"
4. ❌ Hiện dialog: "Cannot Export for FDA"
5. Click "Complete FDA Setup"
6. Điền form FDA Settings
7. Quay lại Lot Details
8. Click "FDA/USA Export"
9. ✅ Download FDA-compliant Excel
\`\`\`

### Test Case 3: Compliance Dashboard
\`\`\`bash
1. Vào Dashboard
2. Xem "Compliance Readiness" widget
3. Data Readiness: ~85% (based on lot data)
4. Legal Readiness: 0% (chưa có FDA)
5. Vào Settings → FDA Compliance
6. Điền đầy đủ form → Save
7. Quay lại Dashboard
8. Legal Readiness: 100% ✅
\`\`\`

---

## 📁 Exported Files

### Internal Export Excel
\`\`\`
📊 internal-export-LOT001-2024-01-15.xlsx

Sheets:
- Lot Summary: Basic info, timeline
- CTE Events: All events in chain
- Locations: Facilities involved
- Products: Product details
\`\`\`

### FDA Export Excel
\`\`\`
📊 fda-export-LOT001-2024-01-15.xlsx

Sheets:
- FDA Cover Page: Registration numbers, U.S. Agent
- Lot Summary: FSMA 204 compliant format
- CTE Events: FDA required fields
- Locations: Facility FDA numbers
- Products: Product codes, packaging
- Compliance Checklist: Automated validation
\`\`\`

---

## ❓ Troubleshooting

### "Cannot Export for FDA"
**Nguyên nhân:** Thiếu FDA registration info  
**Giải pháp:** Settings → FDA Compliance → Điền form

### "Data Readiness chỉ 60%"
**Nguyên nhân:** Lot thiếu fields (harvest date, location, product info)  
**Giải pháp:** Edit lot → Điền đầy đủ thông tin

### "Tôi đã có FDA registration ở bên khác"
**Giải pháp:** Chỉ cần copy-paste info vào Settings → FDA Compliance. System không tự động đăng ký FDA cho bạn.

### "Tôi không xuất khẩu Mỹ, có bắt buộc điền FDA không?"
**Trả lời:** KHÔNG! Bạn chỉ dùng "Internal Export", không cần FDA info.

---

## 🎓 Best Practices

### ✅ DO:
- Điền đầy đủ lot data ngay từ đầu (tăng Data Readiness)
- Setup FDA info nếu bạn THỰC SỰ xuất khẩu Mỹ
- Dùng "Internal Export" cho audits nội địa
- Kiểm tra Compliance Dashboard định kỳ

### ❌ DON'T:
- Bỏ trống harvest_date, location, product_name
- Fake FDA registration number (hệ thống không verify, nhưng FDA sẽ kiểm tra)
- Dùng FDA export cho nội địa (overkill, dùng Internal export là đủ)

---

## 📞 Support

**Documentation:**
- Full User Guide: `/docs/VEXIM_USER_GUIDE.md`
- API Docs: `/docs/VEXIM_API_DOCUMENTATION.md`
- Implementation Roadmap: `/docs/VEXIM_IMPLEMENTATION_ROADMAP.md`

**Technical Issues:**
- Check browser console for errors
- Verify database migration 017 đã chạy: `SELECT * FROM organizations LIMIT 1;` (phải có cột `fda_registration_number`)

---

## 🚀 Getting Started NOW

**Bước 1:** Chạy migration
\`\`\`bash
# Trong v0, script 017 sẽ tự động chạy khi deploy
# Hoặc run manually trong Supabase SQL Editor
\`\`\`

**Bước 2:** Thử Internal Export
\`\`\`bash
Dashboard → Lots → Chọn lot → Click "Internal Export" → ✅
\`\`\`

**Bước 3:** (Optional) Setup FDA
\`\`\`bash
Settings → FDA Compliance → Điền form → Save
\`\`\`

**Done!** 🎉
