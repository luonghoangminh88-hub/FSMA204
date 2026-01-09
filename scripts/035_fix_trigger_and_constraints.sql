-- =============================================
-- FINAL FIX FOR SUBSCRIPTION & INVOICE SYSTEM
-- Resolves: Error 23502 (NOT NULL) and 42703 (Column not found)
-- =============================================

-- STEP 1: ĐẢM BẢO CÁC CỘT CẦN THIẾT TỒN TẠI TRONG ORGANIZATION_SUBSCRIPTIONS
DO $$ 
BEGIN 
    -- Thêm các cột tính toán nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_subscriptions' AND column_name='base_price') THEN
        ALTER TABLE public.organization_subscriptions ADD COLUMN base_price DECIMAL(10, 2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_subscriptions' AND column_name='extra_users_count') THEN
        ALTER TABLE public.organization_subscriptions ADD COLUMN extra_users_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_subscriptions' AND column_name='extra_locations_count') THEN
        ALTER TABLE public.organization_subscriptions ADD COLUMN extra_locations_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_subscriptions' AND column_name='extra_lots_count') THEN
        ALTER TABLE public.organization_subscriptions ADD COLUMN extra_lots_count INTEGER DEFAULT 0;
    END IF;

    -- QUAN TRỌNG: Gỡ bỏ ràng buộc NOT NULL để tránh lỗi 23502 từ phía Backend ORM
    ALTER TABLE public.organization_subscriptions ALTER COLUMN monthly_total DROP NOT NULL;
END $$;

-- STEP 2: CẬP NHẬT TRIGGER TÍNH TOÁN MONTHLY_TOTAL (BẢN CHUẨN)
CREATE OR REPLACE FUNCTION update_subscription_monthly_total()
RETURNS TRIGGER AS $$
DECLARE
  v_user_price DECIMAL(10, 2) := 0;
  v_location_price DECIMAL(10, 2) := 0;
  v_lot_price DECIMAL(10, 4) := 0;
  v_total DECIMAL(10, 2);
BEGIN
  -- Lấy giá cấu hình từ bảng service_packages
  IF NEW.package_id IS NOT NULL THEN
    SELECT 
      COALESCE(extra_user_price, 0), COALESCE(extra_location_price, 0), COALESCE(extra_lot_price, 0)
    INTO v_user_price, v_location_price, v_lot_price
    FROM public.service_packages WHERE id = NEW.package_id;
  END IF;

  -- Tính toán tổng tiền
  v_total := COALESCE(NEW.base_price, 0) 
           + (COALESCE(NEW.extra_users_count, 0) * v_user_price)
           + (COALESCE(NEW.extra_locations_count, 0) * v_location_price)
           + (COALESCE(NEW.extra_lots_count, 0) * v_lot_price);

  -- Gán giá trị, đảm bảo tuyệt đối không NULL
  NEW.monthly_total := COALESCE(NEW.monthly_total, v_total, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscription_total ON public.organization_subscriptions;
CREATE TRIGGER trigger_update_subscription_total
  BEFORE INSERT OR UPDATE ON public.organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_monthly_total();

-- STEP 3: ĐỒNG BỘ CẤU TRÚC BẢNG INVOICES
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='organization_id') THEN
        ALTER TABLE public.invoices ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='billing_period_start') THEN
        ALTER TABLE public.invoices ADD COLUMN billing_period_start DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='billing_period_end') THEN
        ALTER TABLE public.invoices ADD COLUMN billing_period_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month');
    END IF;
    
    -- QUAN TRỌNG: Gỡ bỏ NOT NULL cho invoice_number để Trigger tự sinh số
    ALTER TABLE public.invoices ALTER COLUMN invoice_number DROP NOT NULL;
END $$;

-- STEP 4: TRIGGER TỰ SINH SỐ HÓA ĐƠN (INV-YYYY-XXXX)
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                         LPAD((SELECT COUNT(*) + 1 FROM public.invoices 
                               WHERE EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE))::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invoice_number ON public.invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
