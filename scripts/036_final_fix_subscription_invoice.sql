-- =============================================
-- SCRIPT 036: GIẢI PHÁP CUỐI CÙNG CHO LỖI 23502
-- Khắc phục hoàn toàn lỗi NOT NULL constraint violation
-- Date: 2026-01-03
-- =============================================

-- ==============================================
-- PHẦN 1: XÓA CÁC TRIGGER VÀ FUNCTION CŨ
-- ==============================================

DROP TRIGGER IF EXISTS trigger_update_subscription_total ON public.organization_subscriptions;
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON public.invoices;
DROP FUNCTION IF EXISTS update_subscription_monthly_total();
DROP FUNCTION IF EXISTS set_invoice_number();
DROP FUNCTION IF EXISTS calculate_subscription_monthly_total(UUID);

-- ==============================================
-- PHẦN 2: SỬA CONSTRAINTS CHO ORGANIZATION_SUBSCRIPTIONS
-- ==============================================

-- Đảm bảo các cột cần thiết tồn tại
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='organization_subscriptions' AND column_name='base_price') THEN
        ALTER TABLE public.organization_subscriptions ADD COLUMN base_price DECIMAL(10, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='organization_subscriptions' AND column_name='extra_users_count') THEN
        ALTER TABLE public.organization_subscriptions ADD COLUMN extra_users_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='organization_subscriptions' AND column_name='extra_locations_count') THEN
        ALTER TABLE public.organization_subscriptions ADD COLUMN extra_locations_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='organization_subscriptions' AND column_name='extra_lots_count') THEN
        ALTER TABLE public.organization_subscriptions ADD COLUMN extra_lots_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- ✅ QUAN TRỌNG: DROP NOT NULL và SET DEFAULT cho monthly_total
ALTER TABLE public.organization_subscriptions 
  ALTER COLUMN monthly_total DROP NOT NULL,
  ALTER COLUMN monthly_total SET DEFAULT 0.00;

-- Cập nhật các giá trị NULL hiện tại về 0.00
UPDATE public.organization_subscriptions 
SET monthly_total = 0.00 
WHERE monthly_total IS NULL;

-- Set DEFAULT cho base_price nếu chưa có
ALTER TABLE public.organization_subscriptions 
  ALTER COLUMN base_price SET DEFAULT 0.00;

-- ==============================================
-- PHẦN 3: SỬA CONSTRAINTS CHO INVOICES
-- ==============================================

-- Đảm bảo các cột cần thiết tồn tại
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='organization_id') THEN
        ALTER TABLE public.invoices 
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='billing_period_start') THEN
        ALTER TABLE public.invoices ADD COLUMN billing_period_start DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='billing_period_end') THEN
        ALTER TABLE public.invoices ADD COLUMN billing_period_end DATE;
    END IF;
END $$;

-- ✅ QUAN TRỌNG: DROP NOT NULL cho invoice_number để trigger tự sinh
ALTER TABLE public.invoices 
  ALTER COLUMN invoice_number DROP NOT NULL;

-- ==============================================
-- PHẦN 4: TẠO LẠI TRIGGER TÍNH monthly_total (LOGIC ĐÚNG)
-- ==============================================

CREATE OR REPLACE FUNCTION update_subscription_monthly_total()
RETURNS TRIGGER AS $$
DECLARE
  v_user_price DECIMAL(10, 2) := 0;
  v_location_price DECIMAL(10, 2) := 0;
  v_lot_price DECIMAL(10, 4) := 0;
  v_total DECIMAL(10, 2);
BEGIN
  -- Lấy giá add-on từ service_packages (nếu có package_id)
  IF NEW.package_id IS NOT NULL THEN
    SELECT 
      COALESCE(extra_user_price, 0),
      COALESCE(extra_location_price, 0),
      COALESCE(extra_lot_price, 0)
    INTO v_user_price, v_location_price, v_lot_price
    FROM public.service_packages 
    WHERE id = NEW.package_id;
  END IF;

  -- ✅ TÍNH TOÁN TRỰC TIẾP - KHÔNG CẦN QUERY NEW.id
  v_total := COALESCE(NEW.base_price, 0) 
           + (COALESCE(NEW.extra_users_count, 0) * v_user_price)
           + (COALESCE(NEW.extra_locations_count, 0) * v_location_price)
           + (COALESCE(NEW.extra_lots_count, 0) * v_lot_price);

  -- Chỉ gán nếu monthly_total chưa được set từ API (hoặc NULL)
  IF NEW.monthly_total IS NULL OR NEW.monthly_total = 0 THEN
    NEW.monthly_total := v_total;
  END IF;
  
  -- Đảm bảo monthly_total không bao giờ NULL
  NEW.monthly_total := COALESCE(NEW.monthly_total, 0.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger mới
CREATE TRIGGER trigger_update_subscription_total
  BEFORE INSERT OR UPDATE ON public.organization_subscriptions
  FOR EACH ROW 
  EXECUTE FUNCTION update_subscription_monthly_total();

COMMENT ON TRIGGER trigger_update_subscription_total ON public.organization_subscriptions IS 
  'Tự động tính monthly_total dựa trên base_price và các add-on charges';

-- ==============================================
-- PHẦN 5: TẠO LẠI TRIGGER TỰ SINH invoice_number
-- ==============================================

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  -- Chỉ tự sinh nếu invoice_number chưa được set
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    v_year := TO_CHAR(COALESCE(NEW.invoice_date, CURRENT_DATE), 'YYYY');
    
    -- Đếm số hóa đơn trong năm hiện tại
    SELECT COUNT(*) + 1 INTO v_count 
    FROM public.invoices 
    WHERE EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM COALESCE(NEW.invoice_date, CURRENT_DATE));
    
    -- Sinh mã hóa đơn: INV-2026-0001, INV-2026-0002, ...
    NEW.invoice_number := 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger mới
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW 
  EXECUTE FUNCTION set_invoice_number();

COMMENT ON TRIGGER trigger_set_invoice_number ON public.invoices IS 
  'Tự động sinh invoice_number theo format INV-YYYY-XXXX';

-- ==============================================
-- PHẦN 6: VALIDATION & VERIFICATION
-- ==============================================

-- Function kiểm tra tính toàn vẹn dữ liệu
CREATE OR REPLACE FUNCTION verify_subscription_invoice_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: monthly_total constraint
  RETURN QUERY
  SELECT 
    'monthly_total_constraint'::TEXT,
    CASE WHEN is_nullable = 'YES' THEN '✅ PASS' ELSE '❌ FAIL' END,
    'Column monthly_total should allow NULL'::TEXT
  FROM information_schema.columns 
  WHERE table_name = 'organization_subscriptions' AND column_name = 'monthly_total';
  
  -- Check 2: invoice_number constraint
  RETURN QUERY
  SELECT 
    'invoice_number_constraint'::TEXT,
    CASE WHEN is_nullable = 'YES' THEN '✅ PASS' ELSE '❌ FAIL' END,
    'Column invoice_number should allow NULL'::TEXT
  FROM information_schema.columns 
  WHERE table_name = 'invoices' AND column_name = 'invoice_number';
  
  -- Check 3: Triggers exist
  RETURN QUERY
  SELECT 
    'subscription_trigger'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    'Trigger trigger_update_subscription_total exists'::TEXT
  FROM information_schema.triggers 
  WHERE trigger_name = 'trigger_update_subscription_total';
  
  RETURN QUERY
  SELECT 
    'invoice_trigger'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    'Trigger trigger_set_invoice_number exists'::TEXT
  FROM information_schema.triggers 
  WHERE trigger_name = 'trigger_set_invoice_number';
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- PHẦN 7: TEST SCRIPT
-- ==============================================

-- Uncomment để test sau khi chạy script này:

/*
-- Test 1: Insert subscription WITHOUT monthly_total (should auto-calculate)
INSERT INTO public.organization_subscriptions (
  organization_id,
  package_id,
  subscription_status,
  billing_cycle,
  subscription_start_date,
  subscription_end_date,
  base_price,
  extra_users_count
) VALUES (
  (SELECT id FROM public.organizations LIMIT 1),
  (SELECT id FROM public.service_packages WHERE package_code = 'professional' LIMIT 1),
  'pending',
  'monthly',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 month',
  99.00,
  2
) RETURNING id, base_price, monthly_total;
-- Expected: monthly_total should be calculated (base_price + 2 * extra_user_price)

-- Test 2: Insert invoice WITHOUT invoice_number (should auto-generate)
INSERT INTO public.invoices (
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
  (SELECT id FROM public.organization_subscriptions LIMIT 1),
  (SELECT organization_id FROM public.organization_subscriptions LIMIT 1),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 month',
  100.00,
  10.00,
  110.00
) RETURNING invoice_number, invoice_date;
-- Expected: invoice_number should be like 'INV-2026-0001'

-- Verify integrity
SELECT * FROM verify_subscription_invoice_integrity();
*/

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

SELECT '✅ Script 036 executed successfully!' AS status,
       'Triggers recreated, constraints fixed' AS details;

-- Verify final state
SELECT * FROM verify_subscription_invoice_integrity();
