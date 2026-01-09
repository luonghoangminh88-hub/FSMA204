# BÁO CÁO KIỂM TOÁN HỆ THỐNG THANH TOÁN - SUBSCRIPTION & INVOICE SYSTEM
## Kiểm Toán Viên: v0 AI Auditor | Ngày: 03/01/2026

---

## 📋 TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)

**Tình trạng hệ thống:** 🔴 CRITICAL - Hệ thống đang gặp lỗi nghiêm trọng khi tạo Subscription/Invoice

**Lỗi chính:**
- **Error 23502:** `null value in column "monthly_total" violates not-null constraint`
- **Root Cause:** Xung đột giữa Database Trigger logic và Backend API data flow

**Tác động:**
- Người dùng KHÔNG THỂ đăng ký gói dịch vụ mới
- Hệ thống thanh toán hoàn toàn ngừng hoạt động
- Revenue bị ảnh hưởng trực tiếp

---

## 🔍 PHÂN TÍCH KIẾN TRÚC HỆ THỐNG

### 1. LUỒNG DỮ LIỆU HOÀN CHỈNH (END-TO-END FLOW)

\`\`\`
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Pricing Page)                       │
│  app/dashboard/pricing/page.tsx                                      │
│                                                                       │
│  [User] Click "Get Started" on a package                            │
│    ↓                                                                  │
│  handleSelectPackage(pkg)                                            │
│    ↓                                                                  │
│  fetch('/api/invoices/create', {                                     │
│    method: 'POST',                                                   │
│    body: JSON.stringify({                                            │
│      package_code: 'professional',                                   │
│      billing_cycle: 'monthly'                                        │
│    })                                                                │
│  })                                                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Create Invoice)                      │
│  app/api/invoices/create/route.ts                                   │
│                                                                       │
│  Step 1: Authenticate user                                           │
│    ↓                                                                  │
│  Step 2: Get user profile & organization_id                          │
│    ↓                                                                  │
│  Step 3: Check existing subscription                                 │
│    ↓                                                                  │
│  Step 4: Fetch package data (price, tier, features)                 │
│    ↓                                                                  │
│  Step 5: CREATE SUBSCRIPTION ❌ ERROR HERE!                         │
│         ↓                                                             │
│         INSERT INTO organization_subscriptions (                     │
│           organization_id,                                           │
│           package_id,                                                │
│           subscription_status: 'pending',                            │
│           base_price: 99.00,                                         │
│           extra_users_count: 0,                                      │
│           // monthly_total: NOT SENT! ❌                            │
│         )                                                            │
│    ↓                                                                  │
│  Step 6: CREATE INVOICE (never reached due to error)                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                                │
│  Supabase PostgreSQL                                                 │
│                                                                       │
│  Table: organization_subscriptions                                   │
│    ↓                                                                  │
│  BEFORE INSERT TRIGGER: trigger_update_subscription_total            │
│    ↓                                                                  │
│  Function: update_subscription_monthly_total()                       │
│    ↓                                                                  │
│  🔴 PROBLEM: Trigger tries to query NEW.id before INSERT completes  │
│    SELECT ... FROM organization_subscriptions                        │
│    WHERE id = NEW.id  ← NEW.id doesn't exist yet!                   │
│    ↓                                                                  │
│  Result: monthly_total remains NULL                                  │
│    ↓                                                                  │
│  NOT NULL constraint check fails                                     │
│    ↓                                                                  │
│  ❌ ERROR 23502: null value in column "monthly_total"               │
└─────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## 🗄️ PHÂN TÍCH DATABASE SCHEMA

### 2.1 Bảng: organization_subscriptions

**Schema hiện tại (theo script 025):**
\`\`\`sql
CREATE TABLE organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  package_id UUID REFERENCES service_packages(id),
  
  base_price DECIMAL(10, 2) NOT NULL,           -- ✅ Có
  extra_users_count INTEGER DEFAULT 0,          -- ✅ Có
  extra_locations_count INTEGER DEFAULT 0,      -- ✅ Có
  extra_lots_count INTEGER DEFAULT 0,           -- ✅ Có
  monthly_total DECIMAL(10, 2) NOT NULL,        -- 🔴 NOT NULL - Root cause!
  
  subscription_status TEXT DEFAULT 'active',
  billing_cycle TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Vấn đề:**
1. ✅ Các cột `base_price`, `extra_*_count` đã được tạo
2. 🔴 `monthly_total NOT NULL` - không cho phép Backend bỏ qua field này
3. 🔴 Backend API KHÔNG gửi `monthly_total` trong INSERT statement
4. 🔴 Trigger cố tính toán nhưng FAILED do lỗi logic

### 2.2 Trigger: trigger_update_subscription_total

**Function hiện tại (từ script 025, line 378-386):**
\`\`\`sql
CREATE OR REPLACE FUNCTION update_subscription_monthly_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.monthly_total := calculate_subscription_monthly_total(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_total
  BEFORE INSERT OR UPDATE OF extra_users_count, extra_locations_count, extra_lots_count
  ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_monthly_total();
\`\`\`

**❌ LỖI NGHIÊM TRỌNG:**
\`\`\`sql
NEW.monthly_total := calculate_subscription_monthly_total(NEW.id);
                                                         ^^^^^^^^
                                                    NEW.id CHƯA TỒN TẠI!
\`\`\`

**Function được gọi (line 294-328):**
\`\`\`sql
CREATE OR REPLACE FUNCTION calculate_subscription_monthly_total(
  p_subscription_id UUID  -- ← Nhận NEW.id (NULL hoặc chưa tồn tại)
) RETURNS DECIMAL(10, 2) AS $$
BEGIN
  SELECT 
    os.base_price,
    os.extra_users_count,
    ...
  FROM public.organization_subscriptions os  -- ← Query bảng
  WHERE os.id = p_subscription_id;           -- ← WHERE id = NULL → Không tìm thấy!
  
  RETURN v_total;  -- → Trả về NULL
END;
$$;
\`\`\`

**Tại sao lỗi:**
- Trong BEFORE INSERT trigger, `NEW.id` có thể đã được sinh bởi `DEFAULT uuid_generate_v4()`
- NHƯNG row chưa được INSERT vào table, nên query `WHERE id = NEW.id` sẽ trả về 0 rows
- Function không tìm thấy data → trả về NULL
- `NEW.monthly_total := NULL` → Vi phạm NOT NULL constraint

---

## 🔧 PHÂN TÍCH CÁC FIX ĐÃ THỰC HIỆN

### 3.1 Script 034_fix_subscription_constraints_v2.sql

**Mục đích:** Sửa lỗi NOT NULL bằng cách:
1. DROP NOT NULL constraint
2. SET DEFAULT 0.00
3. UPDATE NULL values
4. Re-apply NOT NULL

**Kết quả:** ❌ FAILED
**Lý do:** Trigger logic vẫn sai, chỉ sửa constraint không đủ

### 3.2 Script 035_fix_trigger_and_constraints.sql

**Cải tiến:**
\`\`\`sql
CREATE OR REPLACE FUNCTION update_subscription_monthly_total()
RETURNS TRIGGER AS $$
DECLARE
  v_user_price DECIMAL(10, 2) := 0;
  v_total DECIMAL(10, 2);
BEGIN
  -- ✅ Lấy price từ service_packages thay vì query NEW.id
  SELECT extra_user_price INTO v_user_price
  FROM service_packages WHERE id = NEW.package_id;
  
  -- ✅ Tính toán trực tiếp từ NEW.*
  v_total := COALESCE(NEW.base_price, 0) 
           + (COALESCE(NEW.extra_users_count, 0) * v_user_price);
  
  NEW.monthly_total := v_total;
  RETURN NEW;
END;
$$;
\`\`\`

**Kết quả:** ⚠️ PARTIAL FIX
**Vấn đề còn lại:**
- monthly_total vẫn NOT NULL trong một số migration paths
- Backend vẫn gửi monthly_total từ API

### 3.3 Script 036_final_fix_subscription_invoice.sql

**Giải pháp toàn diện:**

1. **DROP NOT NULL hoàn toàn:**
\`\`\`sql
ALTER TABLE organization_subscriptions 
  ALTER COLUMN monthly_total DROP NOT NULL,
  ALTER COLUMN monthly_total SET DEFAULT 0.00;
\`\`\`

2. **Trigger logic hoàn chỉnh:**
\`\`\`sql
CREATE OR REPLACE FUNCTION update_subscription_monthly_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Tính toán trực tiếp không cần query database
  v_total := COALESCE(NEW.base_price, 0) 
           + (extra_users * extra_user_price)
           + (extra_locations * extra_location_price)
           + (extra_lots * extra_lot_price);
  
  -- Chỉ set nếu NULL hoặc 0
  IF NEW.monthly_total IS NULL OR NEW.monthly_total = 0 THEN
    NEW.monthly_total := v_total;
  END IF;
  
  -- Đảm bảo không bao giờ NULL
  NEW.monthly_total := COALESCE(NEW.monthly_total, 0.00);
  
  RETURN NEW;
END;
$$;
\`\`\`

**Kết quả:** ✅ SHOULD WORK
**Nhưng:** Backend API vẫn cần cập nhật

---

## 💻 PHÂN TÍCH BACKEND API

### 4.1 File: app/api/invoices/create/route.ts

**Line 79-95 - Tạo Subscription:**
\`\`\`typescript
const { data: subscription, error: subscriptionError } = await supabase
  .from("organization_subscriptions")
  .insert({
    organization_id: profile.organization_id,
    package_id: packageData.id,
    subscription_status: subscriptionStatus,
    billing_cycle: billingCycle,
    subscription_start_date: billingPeriodStart,
    subscription_end_date: billingPeriodEnd,
    next_billing_date: billingPeriodEnd,
    base_price: price,                    // ✅ Gửi base_price
    extra_users_count: 0,                 // ✅ Gửi extra counts
    extra_locations_count: 0,
    extra_lots_count: 0,
    // monthly_total: REMOVED ← Comment ghi nhận đã xóa
    payment_provider: "manual",
    created_by: user.id,
  })
\`\`\`

**✅ ĐÚNG:** API không gửi monthly_total, để trigger tự tính

**Line 126-143 - Tạo Invoice:**
\`\`\`typescript
const { data: invoice, error: invoiceError } = await supabase
  .from("invoices")
  .insert({
    subscription_id: subscription.id,
    organization_id: profile.organization_id,  // ✅ Có organization_id
    billing_period_start: billingPeriodStart,  // ✅ Có billing periods
    billing_period_end: billingPeriodEnd,
    invoice_date: billingPeriodStart,
    due_date: ...,
    subtotal: subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    currency: "USD",
    status: "sent",
    payment_method: "bank_transfer",
    // invoice_number: REMOVED ← Để trigger tự sinh
  })
\`\`\`

**✅ ĐÚNG:** 
- API đã thêm organization_id và billing periods
- Không gửi invoice_number để trigger tự sinh

**⚠️ VẤN ĐỀ TIỀM ẨN:**
Line 133: 
\`\`\`typescript
const subtotal = subscription.monthly_total || price
\`\`\`
Nếu trigger failed hoặc chạy sau, `subscription.monthly_total` có thể NULL → dùng fallback `price`

---

## 🔴 NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

### **Vấn đề #1: Database Schema Conflicts**

\`\`\`
Script 025 (Base Schema)           Script 032 (Invoice System)           Script 034 (Fix Attempt)
       ↓                                    ↓                                     ↓
monthly_total NOT NULL  →  Keeps NOT NULL (redefine table)  →  Tries to fix but incomplete
\`\`\`

**3 scripts đều RE-CREATE TABLE organization_subscriptions với cấu trúc khác nhau!**

\`\`\`sql
-- Script 025 (line 79-131):
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  monthly_total DECIMAL(10, 2) NOT NULL,  -- ← NOT NULL
  ...
);

-- Script 032 (line 42-59):
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  monthly_total DECIMAL(10, 2) NOT NULL,  -- ← Vẫn NOT NULL!
  ...
);

-- Script 034 (line 58-72):
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  monthly_total DECIMAL(10, 2) NOT NULL,  -- ← Vẫn giữ NOT NULL
  ...
);
-- Sau đó mới:
ALTER TABLE ... ALTER COLUMN monthly_total DROP NOT NULL;
\`\`\`

**🔥 CREATE TABLE IF NOT EXISTS không thay đổi cấu trúc nếu bảng đã tồn tại!**

### **Vấn đề #2: Trigger Logic Fundamentally Broken**

\`\`\`sql
-- ❌ SAI (Script 025):
BEFORE INSERT TRIGGER → calls calculate_subscription_monthly_total(NEW.id)
                          ↓
                 Query: SELECT ... WHERE id = NEW.id
                          ↓
                 NEW.id chưa INSERT vào table
                          ↓
                 Query trả về 0 rows
                          ↓
                 Function return NULL
                          ↓
                 NEW.monthly_total = NULL
                          ↓
                 NOT NULL constraint violated!

-- ✅ ĐÚNG (Script 036):
BEFORE INSERT TRIGGER → Tính toán trực tiếp từ NEW.* values
                          ↓
                 Không cần query database
                          ↓
                 v_total = NEW.base_price + (NEW.extra_users_count * price)
                          ↓
                 NEW.monthly_total = v_total
                          ↓
                 SUCCESS!
\`\`\`

### **Vấn đề #3: Invoice Number Generation**

**Tương tự với invoices table:**
\`\`\`sql
-- Script 032 (line 61-97):
CREATE TABLE invoices (
  invoice_number TEXT UNIQUE NOT NULL,  -- ← NOT NULL
);

-- Function generate_invoice_number() tồn tại nhưng:
-- ❌ Không có trigger để tự động gọi function!
-- Backend API phải tự gọi generate_invoice_number() hoặc gửi giá trị
\`\`\`

**Script 035/036 đã fix:**
\`\`\`sql
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
\`\`\`

---

## ✅ GIẢI PHÁP ĐỀ XUẤT

### **Solution A: Full Database Migration (RECOMMENDED)**

**Bước 1: Tạo script migration mới (037_complete_schema_fix.sql)**
\`\`\`sql
-- Drop và tạo lại bảng với cấu trúc đúng
DROP TABLE IF EXISTS organization_subscriptions CASCADE;
CREATE TABLE organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  package_id UUID REFERENCES service_packages(id),
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  extra_users_count INTEGER DEFAULT 0,
  extra_locations_count INTEGER DEFAULT 0,
  extra_lots_count INTEGER DEFAULT 0,
  monthly_total DECIMAL(10, 2) DEFAULT 0.00,  -- ← KHÔNG NOT NULL!
  subscription_status TEXT DEFAULT 'pending',
  billing_cycle TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger tính monthly_total (logic đúng)
CREATE OR REPLACE FUNCTION update_subscription_monthly_total()
RETURNS TRIGGER AS $$
DECLARE
  v_user_price DECIMAL(10, 2) := 0;
  v_location_price DECIMAL(10, 2) := 0;
  v_lot_price DECIMAL(10, 4) := 0;
BEGIN
  -- Lấy giá từ package
  IF NEW.package_id IS NOT NULL THEN
    SELECT extra_user_price, extra_location_price, extra_lot_price
    INTO v_user_price, v_location_price, v_lot_price
    FROM service_packages WHERE id = NEW.package_id;
  END IF;
  
  -- Tính toán trực tiếp
  NEW.monthly_total := COALESCE(NEW.base_price, 0)
    + (COALESCE(NEW.extra_users_count, 0) * COALESCE(v_user_price, 0))
    + (COALESCE(NEW.extra_locations_count, 0) * COALESCE(v_location_price, 0))
    + (COALESCE(NEW.extra_lots_count, 0) * COALESCE(v_lot_price, 0));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_total
  BEFORE INSERT OR UPDATE ON organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_monthly_total();
\`\`\`

**Bước 2: Cập nhật invoices table**
\`\`\`sql
-- Đảm bảo invoice_number có trigger
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
      LPAD((SELECT COUNT(*) + 1 FROM invoices 
            WHERE EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE))::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invoice_number ON invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
\`\`\`

**Bước 3: Backend API - NO CHANGES NEEDED** (nếu đã áp dụng code mới nhất)

---

### **Solution B: Incremental Fix (FASTER)**

**Nếu không muốn DROP TABLE (mất data), chạy script này:**

\`\`\`sql
-- Script: 037_incremental_fix.sql
-- Fix constraints in-place without data loss

-- 1. Drop problematic triggers
DROP TRIGGER IF EXISTS trigger_update_subscription_total ON organization_subscriptions;
DROP FUNCTION IF EXISTS update_subscription_monthly_total();
DROP FUNCTION IF EXISTS calculate_subscription_monthly_total(UUID);

-- 2. Fix column constraints
ALTER TABLE organization_subscriptions 
  ALTER COLUMN monthly_total DROP NOT NULL,
  ALTER COLUMN monthly_total SET DEFAULT 0.00;

UPDATE organization_subscriptions 
SET monthly_total = base_price 
WHERE monthly_total IS NULL;

-- 3. Add missing columns if they don't exist
ALTER TABLE organization_subscriptions 
  ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE organization_subscriptions 
  ADD COLUMN IF NOT EXISTS extra_users_count INTEGER DEFAULT 0;
ALTER TABLE organization_subscriptions 
  ADD COLUMN IF NOT EXISTS extra_locations_count INTEGER DEFAULT 0;
ALTER TABLE organization_subscriptions 
  ADD COLUMN IF NOT EXISTS extra_lots_count INTEGER DEFAULT 0;

-- 4. Create corrected trigger
CREATE OR REPLACE FUNCTION update_subscription_monthly_total()
RETURNS TRIGGER AS $$
DECLARE
  v_extra_prices RECORD;
  v_total DECIMAL(10, 2);
BEGIN
  -- Get pricing from package
  SELECT 
    COALESCE(extra_user_price, 0) as user_price,
    COALESCE(extra_location_price, 0) as location_price,
    COALESCE(extra_lot_price, 0) as lot_price
  INTO v_extra_prices
  FROM service_packages 
  WHERE id = NEW.package_id;
  
  -- Calculate total directly from NEW record
  v_total := COALESCE(NEW.base_price, 0)
    + (COALESCE(NEW.extra_users_count, 0) * COALESCE(v_extra_prices.user_price, 0))
    + (COALESCE(NEW.extra_locations_count, 0) * COALESCE(v_extra_prices.location_price, 0))
    + (COALESCE(NEW.extra_lots_count, 0) * COALESCE(v_extra_prices.lot_price, 0));
  
  -- Only set if not already set by application
  IF NEW.monthly_total IS NULL OR NEW.monthly_total = 0 THEN
    NEW.monthly_total := v_total;
  END IF;
  
  -- Ensure never NULL
  NEW.monthly_total := COALESCE(NEW.monthly_total, v_total, 0.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_total
  BEFORE INSERT OR UPDATE ON organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_monthly_total();

-- 5. Fix invoices
ALTER TABLE invoices 
  ALTER COLUMN invoice_number DROP NOT NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS billing_period_start DATE;
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS billing_period_end DATE;

-- Invoice number trigger
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON invoices;

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    SELECT COUNT(*) + 1 INTO v_count
    FROM invoices
    WHERE EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM COALESCE(NEW.invoice_date, CURRENT_DATE));
    
    NEW.invoice_number := 'INV-' || 
      TO_CHAR(COALESCE(NEW.invoice_date, CURRENT_DATE), 'YYYY') || '-' || 
      LPAD(v_count::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Schema fix completed successfully';
  RAISE NOTICE 'monthly_total nullable: %', 
    (SELECT is_nullable FROM information_schema.columns 
     WHERE table_name='organization_subscriptions' AND column_name='monthly_total');
  RAISE NOTICE 'invoice_number nullable: %',
    (SELECT is_nullable FROM information_schema.columns 
     WHERE table_name='invoices' AND column_name='invoice_number');
END $$;
\`\`\`

---

## 🧪 TEST CASES

### Test 1: Create Subscription WITHOUT monthly_total
\`\`\`sql
INSERT INTO organization_subscriptions (
  organization_id,
  package_id,
  subscription_status,
  base_price,
  extra_users_count
) VALUES (
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM service_packages WHERE package_code = 'professional'),
  'pending',
  99.00,
  2
) RETURNING id, base_price, monthly_total;

-- Expected: monthly_total should be calculated automatically
-- Example: 99.00 + (2 * 10.00) = 119.00
\`\`\`

### Test 2: Create Invoice WITHOUT invoice_number
\`\`\`sql
INSERT INTO invoices (
  subscription_id,
  organization_id,
  invoice_date,
  due_date,
  billing_period_start,
  billing_period_end,
  subtotal,
  tax_amount,
  total_amount
) VALUES (
  (SELECT id FROM organization_subscriptions LIMIT 1),
  (SELECT organization_id FROM organization_subscriptions LIMIT 1),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 month',
  119.00,
  11.90,
  130.90
) RETURNING invoice_number, total_amount;

-- Expected: invoice_number = 'INV-2026-0001' (or next number)
\`\`\`

### Test 3: End-to-End via API
\`\`\`bash
curl -X POST https://your-app.vercel.app/api/invoices/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "package_code": "professional",
    "billing_cycle": "monthly"
  }'

# Expected Response:
# {
#   "success": true,
#   "invoice_id": "uuid...",
#   "invoice_number": "INV-2026-0001",
#   "total_amount": 130.90,
#   "subscription_id": "uuid..."
# }
\`\`\`

---

## 📊 CHECKLIST VERIFICATION

### Database Layer
- [ ] monthly_total column nullable (not NOT NULL)
- [ ] monthly_total has DEFAULT 0.00
- [ ] Trigger update_subscription_monthly_total exists
- [ ] Trigger does NOT query NEW.id during INSERT
- [ ] base_price, extra_*_count columns exist
- [ ] invoice_number column nullable
- [ ] Trigger set_invoice_number exists
- [ ] organization_id, billing_period_* columns exist in invoices

### Backend API Layer
- [ ] API does NOT send monthly_total in INSERT
- [ ] API sends all required fields (base_price, extra_counts, etc.)
- [ ] API does NOT send invoice_number in INSERT
- [ ] API sends organization_id and billing periods for invoice
- [ ] Error handling catches constraint violations
- [ ] Logging shows data being sent to database

### Frontend Layer
- [ ] Pricing page loads packages correctly
- [ ] Click "Get Started" triggers API call
- [ ] Error messages display to user
- [ ] Success dialog shows with payment instructions
- [ ] Can navigate to invoices page after creation

---

## 🚨 CRITICAL RECOMMENDATIONS

### Immediate Actions (Within 24h):
1. **Run Solution B script (037_incremental_fix.sql)** - Ít rủi ro, giữ được data
2. **Verify với Test Cases** - Đảm bảo trigger hoạt động đúng
3. **Monitor production logs** - Kiểm tra có lỗi mới không

### Short-term (1 week):
4. **Add comprehensive logging** - Log mọi bước trong API
5. **Create automated tests** - Prevent regression
6. **Document schema changes** - Update system documentation

### Long-term (1 month):
7. **Schema versioning** - Implement proper migration system (e.g., Prisma, Flyway)
8. **Code review process** - Multi-script changes need review
9. **Staging environment** - Test migrations before production
10. **Monitoring & Alerting** - Set up Sentry/NewRelic for errors

---

## 📝 KẾT LUẬN

**Hệ thống hiện tại:** 🔴 BROKEN - Không thể tạo subscription/invoice

**Root Cause:** Xung đột giữa:
- Multiple SQL scripts redefining same tables
- Trigger logic cố query NEW.id trước khi INSERT hoàn tất
- NOT NULL constraints không tương thích với trigger workflow

**Solution:** Áp dụng **Solution B (Incremental Fix)** là an toàn nhất:
- Không mất data
- Fix constraints và trigger
- Compatible với Backend API hiện tại

**Timeline:**
- Fix script: 15 phút viết + chạy
- Testing: 30 phút
- Deployment: 15 phút
- **Total: ~1 giờ để fix hoàn toàn**

---

**Kiểm toán bởi:** v0 AI Professional Auditor  
**Ngày:** 03/01/2026  
**Status:** ✅ Audit Complete - Action Required
