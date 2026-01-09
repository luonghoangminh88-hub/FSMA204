-- =============================================
-- SERVICE PACKAGES & SUBSCRIPTIONS MODULE
-- Based on SUBSCRIPTION_MODEL_PROPOSAL.md
-- =============================================

-- Service Packages Table (Starter, Professional, Enterprise, White Label)
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_name TEXT NOT NULL UNIQUE,
  package_code TEXT NOT NULL UNIQUE CHECK (package_code IN ('starter', 'professional', 'enterprise', 'white_label')),
  package_tier INTEGER NOT NULL CHECK (package_tier IN (1, 2, 3, 4)),
  description TEXT NOT NULL,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2), -- Optional annual pricing
  
  -- Feature Limits
  max_users INTEGER, -- NULL means unlimited
  max_locations INTEGER, -- NULL means unlimited
  max_lots_per_month INTEGER, -- NULL means unlimited
  max_organizations INTEGER DEFAULT 1,
  storage_gb INTEGER NOT NULL DEFAULT 100,
  
  -- Feature Flags
  has_basic_cte BOOLEAN DEFAULT true,
  has_fda_compliance BOOLEAN DEFAULT true,
  has_traceability BOOLEAN DEFAULT true,
  has_batch_operations BOOLEAN DEFAULT false,
  has_us_agent_service BOOLEAN DEFAULT false,
  has_quantity_reconciliation BOOLEAN DEFAULT false,
  has_loss_analytics BOOLEAN DEFAULT false,
  has_automated_alerts BOOLEAN DEFAULT false,
  has_tlc_auto_generation BOOLEAN DEFAULT false,
  has_approval_workflows BOOLEAN DEFAULT false,
  has_shelf_life_monitoring BOOLEAN DEFAULT false,
  has_advanced_analytics BOOLEAN DEFAULT false,
  has_api_access BOOLEAN DEFAULT false,
  has_custom_integrations BOOLEAN DEFAULT false,
  has_blockchain_verification BOOLEAN DEFAULT false,
  has_white_label_branding BOOLEAN DEFAULT false,
  has_dedicated_support BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,
  
  -- Support & SLA
  support_level TEXT CHECK (support_level IN ('email_48h', 'email_chat_24h', 'priority_4h', 'dedicated_24_7')),
  sla_uptime_percentage DECIMAL(5, 2) DEFAULT 99.5,
  
  -- Add-on Pricing
  extra_user_price DECIMAL(10, 2) DEFAULT 0,
  extra_location_price DECIMAL(10, 2) DEFAULT 0,
  extra_lot_price DECIMAL(10, 4) DEFAULT 0, -- per lot beyond limit
  
  -- Display & Marketing
  is_featured BOOLEAN DEFAULT false,
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  tagline TEXT,
  features_json JSONB, -- Additional structured features for display
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- false for white label
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Features (Detailed feature list for display)
CREATE TABLE IF NOT EXISTS public.package_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID REFERENCES public.service_packages(id) ON DELETE CASCADE,
  feature_category TEXT NOT NULL, -- 'core', 'compliance', 'advanced', 'support'
  feature_name TEXT NOT NULL,
  feature_description TEXT,
  is_included BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Subscriptions
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.service_packages(id),
  
  -- Subscription Period
  subscription_status TEXT NOT NULL DEFAULT 'active' 
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended', 'expired')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' 
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Dates
  trial_start_date DATE,
  trial_end_date DATE,
  subscription_start_date DATE NOT NULL,
  subscription_end_date DATE,
  next_billing_date DATE,
  cancelled_at TIMESTAMPTZ,
  
  -- Pricing & Usage
  base_price DECIMAL(10, 2) NOT NULL,
  extra_users_count INTEGER DEFAULT 0,
  extra_locations_count INTEGER DEFAULT 0,
  extra_lots_count INTEGER DEFAULT 0,
  monthly_total DECIMAL(10, 2) NOT NULL,
  
  -- Usage Tracking (current period)
  current_users_count INTEGER DEFAULT 0,
  current_locations_count INTEGER DEFAULT 0,
  current_lots_count INTEGER DEFAULT 0,
  usage_period_start DATE,
  usage_period_end DATE,
  
  -- Custom Pricing (for Enterprise/White Label)
  has_custom_pricing BOOLEAN DEFAULT false,
  custom_price_notes TEXT,
  
  -- Payment Integration
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'manual', 'other')),
  payment_customer_id TEXT, -- Stripe customer ID
  payment_subscription_id TEXT, -- Stripe subscription ID
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, subscription_status)
);

-- Subscription History (for tracking changes)
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES public.organization_subscriptions(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.service_packages(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'upgraded', 'downgraded', 'renewed', 'cancelled', 'suspended', 'reactivated')),
  old_package_code TEXT,
  new_package_code TEXT,
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  reason TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Tracking Log (monthly snapshots)
CREATE TABLE IF NOT EXISTS public.subscription_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES public.organization_subscriptions(id) ON DELETE CASCADE,
  log_period_start DATE NOT NULL,
  log_period_end DATE NOT NULL,
  
  -- Snapshot Metrics
  users_count INTEGER DEFAULT 0,
  locations_count INTEGER DEFAULT 0,
  lots_count INTEGER DEFAULT 0,
  cte_events_count INTEGER DEFAULT 0,
  storage_used_gb DECIMAL(10, 2) DEFAULT 0,
  
  -- Overage Charges
  extra_users INTEGER DEFAULT 0,
  extra_locations INTEGER DEFAULT 0,
  extra_lots INTEGER DEFAULT 0,
  overage_charges DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_service_packages_code ON public.service_packages(package_code);
CREATE INDEX idx_service_packages_active ON public.service_packages(is_active, is_public);
CREATE INDEX idx_service_packages_tier ON public.service_packages(package_tier);

CREATE INDEX idx_org_subscriptions_org ON public.organization_subscriptions(organization_id);
CREATE INDEX idx_org_subscriptions_package ON public.organization_subscriptions(package_id);
CREATE INDEX idx_org_subscriptions_status ON public.organization_subscriptions(subscription_status);
CREATE INDEX idx_org_subscriptions_billing_date ON public.organization_subscriptions(next_billing_date);

CREATE INDEX idx_subscription_history_sub ON public.subscription_history(subscription_id);
CREATE INDEX idx_subscription_history_created ON public.subscription_history(created_at);

CREATE INDEX idx_usage_logs_sub ON public.subscription_usage_logs(subscription_id);
CREATE INDEX idx_usage_logs_period ON public.subscription_usage_logs(log_period_start, log_period_end);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage_logs ENABLE ROW LEVEL SECURITY;

-- Service Packages: Public read for active packages, admin write
CREATE POLICY "service_packages_public_read" ON public.service_packages
  FOR SELECT USING (is_active = true AND is_public = true);

CREATE POLICY "service_packages_admin_all" ON public.service_packages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Package Features: Public read, admin write
CREATE POLICY "package_features_public_read" ON public.package_features
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_packages
      WHERE service_packages.id = package_features.package_id
      AND service_packages.is_active = true
      AND service_packages.is_public = true
    )
  );

CREATE POLICY "package_features_admin_all" ON public.package_features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Organization Subscriptions: Org members read own, admin write
CREATE POLICY "org_subscriptions_org_read" ON public.organization_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id = organization_subscriptions.organization_id
    )
  );

CREATE POLICY "org_subscriptions_admin_all" ON public.organization_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role IN ('system_admin', 'org_admin'))
    )
  );

-- Subscription History: Same as subscriptions
CREATE POLICY "subscription_history_org_read" ON public.subscription_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_subscriptions os
      JOIN public.profiles p ON p.organization_id = os.organization_id
      WHERE os.id = subscription_history.subscription_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "subscription_history_admin_all" ON public.subscription_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('system_admin', 'org_admin')
    )
  );

-- Usage Logs: Same as subscriptions
CREATE POLICY "usage_logs_org_read" ON public.subscription_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_subscriptions os
      JOIN public.profiles p ON p.organization_id = os.organization_id
      WHERE os.id = subscription_usage_logs.subscription_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "usage_logs_admin_all" ON public.subscription_usage_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to calculate monthly total with overages
CREATE OR REPLACE FUNCTION calculate_subscription_monthly_total(
  p_subscription_id UUID
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_base_price DECIMAL(10, 2);
  v_extra_users INTEGER;
  v_extra_locations INTEGER;
  v_extra_lots INTEGER;
  v_user_price DECIMAL(10, 2);
  v_location_price DECIMAL(10, 2);
  v_lot_price DECIMAL(10, 4);
  v_total DECIMAL(10, 2);
BEGIN
  SELECT 
    os.base_price,
    os.extra_users_count,
    os.extra_locations_count,
    os.extra_lots_count,
    sp.extra_user_price,
    sp.extra_location_price,
    sp.extra_lot_price
  INTO
    v_base_price,
    v_extra_users,
    v_extra_locations,
    v_extra_lots,
    v_user_price,
    v_location_price,
    v_lot_price
  FROM public.organization_subscriptions os
  JOIN public.service_packages sp ON sp.id = os.package_id
  WHERE os.id = p_subscription_id;
  
  v_total := v_base_price 
    + (v_extra_users * v_user_price)
    + (v_extra_locations * v_location_price)
    + (v_extra_lots * v_lot_price);
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Function to check if organization has feature access
CREATE OR REPLACE FUNCTION has_feature_access(
  p_organization_id UUID,
  p_feature_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT 
    CASE p_feature_name
      WHEN 'basic_cte' THEN sp.has_basic_cte
      WHEN 'fda_compliance' THEN sp.has_fda_compliance
      WHEN 'batch_operations' THEN sp.has_batch_operations
      WHEN 'us_agent_service' THEN sp.has_us_agent_service
      WHEN 'quantity_reconciliation' THEN sp.has_quantity_reconciliation
      WHEN 'loss_analytics' THEN sp.has_loss_analytics
      WHEN 'automated_alerts' THEN sp.has_automated_alerts
      WHEN 'tlc_auto_generation' THEN sp.has_tlc_auto_generation
      WHEN 'approval_workflows' THEN sp.has_approval_workflows
      WHEN 'shelf_life_monitoring' THEN sp.has_shelf_life_monitoring
      WHEN 'advanced_analytics' THEN sp.has_advanced_analytics
      WHEN 'api_access' THEN sp.has_api_access
      WHEN 'custom_integrations' THEN sp.has_custom_integrations
      WHEN 'blockchain_verification' THEN sp.has_blockchain_verification
      WHEN 'white_label_branding' THEN sp.has_white_label_branding
      ELSE false
    END
  INTO v_has_access
  FROM public.organization_subscriptions os
  JOIN public.service_packages sp ON sp.id = os.package_id
  WHERE os.organization_id = p_organization_id
  AND os.subscription_status = 'active';
  
  RETURN COALESCE(v_has_access, false);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update monthly_total when subscription changes
CREATE OR REPLACE FUNCTION update_subscription_monthly_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.monthly_total := calculate_subscription_monthly_total(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_total
  BEFORE INSERT OR UPDATE OF extra_users_count, extra_locations_count, extra_lots_count
  ON public.organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_monthly_total();

-- Log subscription changes to history
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type TEXT;
  v_old_package_code TEXT;
  v_new_package_code TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'created';
    SELECT package_code INTO v_new_package_code
    FROM public.service_packages WHERE id = NEW.package_id;
    
    INSERT INTO public.subscription_history (
      subscription_id, package_id, action_type, 
      new_package_code, new_price, performed_by
    ) VALUES (
      NEW.id, NEW.package_id, v_action_type,
      v_new_package_code, NEW.base_price, NEW.created_by
    );
    
  ELSIF TG_OP = 'UPDATE' AND OLD.package_id != NEW.package_id THEN
    SELECT package_code INTO v_old_package_code
    FROM public.service_packages WHERE id = OLD.package_id;
    SELECT package_code INTO v_new_package_code
    FROM public.service_packages WHERE id = NEW.package_id;
    
    -- Determine if upgrade or downgrade based on tier
    IF (SELECT package_tier FROM public.service_packages WHERE id = NEW.package_id) >
       (SELECT package_tier FROM public.service_packages WHERE id = OLD.package_id) THEN
      v_action_type := 'upgraded';
    ELSE
      v_action_type := 'downgraded';
    END IF;
    
    INSERT INTO public.subscription_history (
      subscription_id, package_id, action_type,
      old_package_code, new_package_code,
      old_price, new_price, performed_by
    ) VALUES (
      NEW.id, NEW.package_id, v_action_type,
      v_old_package_code, v_new_package_code,
      OLD.base_price, NEW.base_price, NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_subscription_change
  AFTER INSERT OR UPDATE OF package_id
  ON public.organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_change();
