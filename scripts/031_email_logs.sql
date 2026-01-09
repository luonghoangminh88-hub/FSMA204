-- Email Logs System for VEXIM GLOBAL FSMA 204
-- Track all emails sent through the system

-- =============================================
-- EMAIL LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Email details
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL DEFAULT 'noreply@veximglobal.com',
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN (
    'welcome',
    'password_reset',
    'fda_renewal_reminder',
    'fda_expiration_alert',
    'lot_expiration_warning',
    'recall_notification',
    'compliance_alert',
    'report_ready',
    'user_invitation',
    'organization_update'
  )),
  
  -- Recipient context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- Email content
  email_data JSONB, -- Template variables used
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'vi')),
  
  -- Delivery tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  resend_id TEXT, -- Resend API email ID
  error_message TEXT,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT fk_email_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_email_org FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_email_logs_user ON public.email_logs(user_id, created_at DESC);
CREATE INDEX idx_email_logs_org ON public.email_logs(organization_id, created_at DESC);
CREATE INDEX idx_email_logs_status ON public.email_logs(status, created_at DESC);
CREATE INDEX idx_email_logs_template ON public.email_logs(template_type, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own email logs
CREATE POLICY "email_logs_select_own" ON public.email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all email logs
CREATE POLICY "email_logs_select_admin" ON public.email_logs
  FOR SELECT
  USING (public.is_system_admin());

-- Policy: System can insert email logs
CREATE POLICY "email_logs_insert_system" ON public.email_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can update email logs (status updates)
CREATE POLICY "email_logs_update_system" ON public.email_logs
  FOR UPDATE
  USING (true);

-- =============================================
-- HELPER FUNCTION
-- =============================================

-- Function to log email attempt
CREATE OR REPLACE FUNCTION public.log_email(
  p_to_email TEXT,
  p_subject TEXT,
  p_template_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_email_data JSONB DEFAULT NULL,
  p_language TEXT DEFAULT 'en'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.email_logs (
    to_email,
    subject,
    template_type,
    user_id,
    organization_id,
    email_data,
    language,
    status
  ) VALUES (
    p_to_email,
    p_subject,
    p_template_type,
    p_user_id,
    p_organization_id,
    p_email_data,
    p_language,
    'pending'
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update email status
CREATE OR REPLACE FUNCTION public.update_email_status(
  p_log_id UUID,
  p_status TEXT,
  p_resend_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.email_logs
  SET 
    status = p_status,
    resend_id = COALESCE(p_resend_id, resend_id),
    error_message = p_error_message,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END
  WHERE id = p_log_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.email_logs IS 'Track all emails sent through the VEXIM GLOBAL system';
COMMENT ON FUNCTION public.log_email IS 'Log an email sending attempt';
COMMENT ON FUNCTION public.update_email_status IS 'Update email delivery status';
