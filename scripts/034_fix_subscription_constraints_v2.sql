-- =============================================
-- 1. REPAIR & CORE TABLES (FORCE REPAIR FOR ERROR 23502)
-- =============================================

-- Bước 1: Xóa các View phụ thuộc (Bắt buộc để sửa cấu trúc bảng)
DROP VIEW IF EXISTS pending_subscriptions;
DROP VIEW IF EXISTS active_subscriptions;

-- Bước 2: Đảm bảo bảng cơ sở tồn tại
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_name TEXT NOT NULL,
  tax_code TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bước 3: FORCE FIX LỖI 23502 (NOT NULL CONSTRAINT)
-- Thực hiện thay đổi cấu trúc bảng một cách cưỡng bách
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name='organization_subscriptions') THEN
        -- 1. Tạm thời cho phép NULL để tránh lỗi khi đang sửa
        ALTER TABLE public.organization_subscriptions ALTER COLUMN monthly_total DROP NOT NULL;
        
        -- 2. Thiết lập giá trị mặc định là 0.00 cho các bản ghi mới
        ALTER TABLE public.organization_subscriptions ALTER COLUMN monthly_total SET DEFAULT 0.00;
        
        -- 3. Cập nhật tất cả các dòng đang bị NULL về 0.00
        UPDATE public.organization_subscriptions SET monthly_total = 0.00 WHERE monthly_total IS NULL;
        
        -- 4. Áp dụng lại ràng buộc NOT NULL sau khi đã có Default và dữ liệu sạch
        ALTER TABLE public.organization_subscriptions ALTER COLUMN monthly_total SET NOT NULL;
    END IF;

    -- Bổ sung các cột thiếu cho service_packages nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_packages' AND column_name='package_code') THEN
        ALTER TABLE public.service_packages ADD COLUMN package_code TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_packages' AND column_name='package_tier') THEN
        ALTER TABLE public.service_packages ADD COLUMN package_tier INTEGER DEFAULT 1;
    END IF;
END $$;

-- Tạo bảng đăng ký (Sử dụng cấu trúc chuẩn có Default)
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.service_packages(id),
  subscription_status TEXT DEFAULT 'pending',
  monthly_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  subscription_start_date DATE,
  subscription_end_date DATE,
  next_billing_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. INVOICE & PAYMENT SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES public.organization_subscriptions(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL, 
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 10.00, 
  tax_amount DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'VND' CHECK (currency IN ('VND', 'USD')),
  total_amount_usd DECIMAL(10, 2),
  exchange_rate DECIMAL(10, 2) DEFAULT 25000.00,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'cash', 'other')),
  paid_at TIMESTAMPTZ,
  payment_proof_url TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  bank_info JSONB DEFAULT '{
    "bank_name": "Vietcombank",
    "account_number": "1234567890",
    "account_name": "VEXIM GLOBAL",
    "branch": "Ha Noi",
    "swift": "BFTVVNVX"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_amounts CHECK (total_amount = subtotal + tax_amount)
);

-- =============================================
-- 3. RECREATE VIEWS & FUNCTIONS
-- =============================================

CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  os.*,
  sp.package_name,
  sp.package_code,
  sp.package_tier,
  o.organization_name
FROM organization_subscriptions os
JOIN service_packages sp ON sp.id = os.package_id
JOIN organizations o ON o.id = os.organization_id
WHERE os.subscription_status = 'active';

CREATE OR REPLACE VIEW pending_subscriptions AS
SELECT 
  os.*,
  sp.package_name,
  sp.package_code,
  o.organization_name,
  i.invoice_number,
  i.total_amount as invoice_amount,
  i.status as invoice_status
FROM organization_subscriptions os
JOIN service_packages sp ON sp.id = os.package_id
JOIN organizations o ON o.id = os.organization_id
LEFT JOIN invoices i ON i.subscription_id = os.id
WHERE os.subscription_status IN ('pending', 'pending_upgrade', 'pending_downgrade');

-- Hàm tạo số hóa đơn
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count FROM public.invoices WHERE TO_CHAR(invoice_date, 'YYYY') = v_year;
  RETURN 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Hàm tạo hóa đơn từ subscription
CREATE OR REPLACE FUNCTION create_subscription_invoice(
  p_subscription_id UUID,
  p_billing_period_start DATE,
  p_billing_period_end DATE,
  p_exchange_rate DECIMAL DEFAULT 25000.00
) RETURNS UUID AS $$
DECLARE
  v_invoice_id UUID;
  v_org_id UUID;
  v_monthly_usd DECIMAL;
  v_pkg_name TEXT;
  v_subtotal_vnd DECIMAL;
BEGIN
  SELECT os.organization_id, os.monthly_total, sp.package_name
  INTO v_org_id, v_monthly_usd, v_pkg_name
  FROM public.organization_subscriptions os
  JOIN public.service_packages sp ON sp.id = os.package_id
  WHERE os.id = p_subscription_id;

  IF v_monthly_usd = 0 OR v_monthly_usd IS NULL THEN
     SELECT price_monthly INTO v_monthly_usd FROM public.service_packages sp
     JOIN public.organization_subscriptions os ON os.package_id = sp.id
     WHERE os.id = p_subscription_id;
  END IF;

  v_subtotal_vnd := COALESCE(v_monthly_usd, 0) * p_exchange_rate;

  INSERT INTO public.invoices (
    subscription_id, organization_id, invoice_number,
    invoice_date, due_date, billing_period_start, billing_period_end,
    subtotal, tax_amount, total_amount, total_amount_usd, exchange_rate,
    line_items, status
  ) VALUES (
    p_subscription_id, v_org_id, generate_invoice_number(),
    CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', p_billing_period_start, p_billing_period_end,
    v_subtotal_vnd, v_subtotal_vnd * 0.1, v_subtotal_vnd * 1.1, v_monthly_usd, p_exchange_rate,
    jsonb_build_array(jsonb_build_object('description', v_pkg_name, 'amount', v_subtotal_vnd)), 'pending'
  ) RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;
