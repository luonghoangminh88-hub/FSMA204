-- =============================================
-- VEXIM GLOBAL - INVOICE & PAYMENT SYSTEM
-- Version: 2.0 (Fixed)
-- =============================================

-- =============================================
-- 1. CORE TABLES (BẢNG CƠ SỞ)
-- =============================================

-- Bảng tổ chức/công ty
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

-- Bảng hồ sơ người dùng
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('system_admin', 'org_admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng gói dịch vụ
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng đăng ký dịch vụ
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.service_packages(id),
  subscription_status TEXT DEFAULT 'inactive' 
    CHECK (subscription_status IN ('active', 'inactive', 'trial', 'cancelled', 'past_due')),
  monthly_total DECIMAL(10, 2) NOT NULL,
  subscription_start_date DATE,
  subscription_end_date DATE,
  next_billing_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. INVOICE & PAYMENT SYSTEM
-- =============================================

-- Bảng Hóa đơn
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
  payment_verified_by UUID REFERENCES public.profiles(id),
  payment_verified_at TIMESTAMPTZ,
  
  payment_proof_url TEXT,
  payment_reference TEXT, 
  payment_notes TEXT,
  
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  bank_info JSONB DEFAULT '{
    "bank_name": "Vietcombank",
    "account_number": "1234567890",
    "account_name": "VEXIM GLOBAL",
    "branch": "Ha Noi",
    "swift": "BFTVVNVX"
  }'::jsonb,
  
  admin_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_amounts CHECK (
    subtotal >= 0 AND 
    tax_amount >= 0 AND 
    total_amount >= 0 AND
    total_amount = subtotal + tax_amount
  ),
  CONSTRAINT valid_dates CHECK (due_date >= invoice_date)
);

-- Bảng Giao dịch thanh toán
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  transaction_reference TEXT NOT NULL, 
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'VND' CHECK (currency IN ('VND', 'USD')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'other')),
  
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),
  
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  payment_date DATE NOT NULL,
  payer_name TEXT,
  payer_account TEXT,
  bank_name TEXT,
  
  proof_documents JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nhật ký Email
CREATE TABLE IF NOT EXISTS public.invoice_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('initial', 'reminder_7d', 'reminder_3d', 'overdue', 'final')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to TEXT NOT NULL,
  email_status TEXT DEFAULT 'sent' CHECK (email_status IN ('sent', 'failed', 'bounced')),
  resend_id TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. INDEXES (Tối ưu performance)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id ON public.payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_org_id ON public.payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice_id ON public.invoice_reminders(invoice_id);

-- =============================================
-- 4. FUNCTIONS
-- =============================================

-- Tự động tạo mã hóa đơn
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

-- Tạo hóa đơn từ subscription
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
  v_tax_vnd DECIMAL;
BEGIN
  SELECT os.organization_id, os.monthly_total, sp.package_name
  INTO v_org_id, v_monthly_usd, v_pkg_name
  FROM public.organization_subscriptions os
  JOIN public.service_packages sp ON sp.id = os.package_id
  WHERE os.id = p_subscription_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Subscription not found or has no organization';
  END IF;

  v_subtotal_vnd := v_monthly_usd * p_exchange_rate;
  v_tax_vnd := v_subtotal_vnd * 0.10;

  INSERT INTO public.invoices (
    subscription_id, organization_id, invoice_number,
    invoice_date, due_date, billing_period_start, billing_period_end,
    subtotal, tax_amount, total_amount, total_amount_usd, exchange_rate,
    line_items, status
  ) VALUES (
    p_subscription_id, v_org_id, generate_invoice_number(),
    CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', p_billing_period_start, p_billing_period_end,
    v_subtotal_vnd, v_tax_vnd, (v_subtotal_vnd + v_tax_vnd), v_monthly_usd, p_exchange_rate,
    jsonb_build_array(jsonb_build_object(
      'description', v_pkg_name || ' - Monthly Subscription',
      'quantity', 1, 'unit_price', v_subtotal_vnd, 'amount', v_subtotal_vnd
    )), 'pending'
  ) RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Added send_invoice_reminder function
CREATE OR REPLACE FUNCTION send_invoice_reminder(
  p_invoice_id UUID,
  p_reminder_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_org_email TEXT;
  v_invoice_number TEXT;
BEGIN
  SELECT o.email, i.invoice_number
  INTO v_org_email, v_invoice_number
  FROM public.invoices i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.id = p_invoice_id;

  IF v_org_email IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.invoice_reminders (invoice_id, reminder_type, sent_to)
  VALUES (p_invoice_id, p_reminder_type, v_org_email);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. TRIGGERS (Drop nếu đã tồn tại)
-- =============================================

-- Drop existing triggers before creating new ones
DROP TRIGGER IF EXISTS tr_update_organizations_time ON public.organizations;
DROP TRIGGER IF EXISTS tr_update_profiles_time ON public.profiles;
DROP TRIGGER IF EXISTS tr_update_invoices_time ON public.invoices;
DROP TRIGGER IF EXISTS tr_update_subscriptions_time ON public.organization_subscriptions;
DROP TRIGGER IF EXISTS tr_update_payment_transactions_time ON public.payment_transactions;

-- Create triggers
CREATE TRIGGER tr_update_organizations_time 
  BEFORE UPDATE ON public.organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_update_profiles_time 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_update_invoices_time 
  BEFORE UPDATE ON public.invoices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_update_subscriptions_time 
  BEFORE UPDATE ON public.organization_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_update_payment_transactions_time 
  BEFORE UPDATE ON public.payment_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Added comprehensive RLS policies for security

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "System admins can view all invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "Users can view own organization invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System admins can update all invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admins can insert invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'system_admin'
    )
  );

-- Payment transactions policies
CREATE POLICY "System admins can view all transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "Users can view own organization transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own organization transactions"
  ON public.payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System admins can update all transactions"
  ON public.payment_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'system_admin'
    )
  );

-- Invoice reminders policies (system only)
CREATE POLICY "System admins can manage reminders"
  ON public.invoice_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'system_admin'
    )
  );

-- =============================================
-- 7. HELPER VIEWS
-- =============================================

-- Added helpful views for reporting

CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
  i.id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.status,
  i.total_amount,
  i.currency,
  o.organization_name,
  o.email as organization_email,
  sp.package_name,
  CASE 
    WHEN i.status = 'paid' THEN 'Completed'
    WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' THEN 'Overdue'
    WHEN i.due_date - CURRENT_DATE <= 3 THEN 'Due Soon'
    ELSE 'Pending'
  END as payment_status_display
FROM public.invoices i
JOIN public.organizations o ON o.id = i.organization_id
LEFT JOIN public.organization_subscriptions os ON os.id = i.subscription_id
LEFT JOIN public.service_packages sp ON sp.id = os.package_id;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
