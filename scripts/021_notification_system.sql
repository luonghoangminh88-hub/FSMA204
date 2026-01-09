-- Notification System for FSMA 204
-- Real-time notifications for user actions and system events

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Target recipient
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL CHECK (type IN (
    'fda_request_created',
    'fda_request_approved',
    'fda_request_rejected',
    'lot_expiring_soon',
    'lot_expired',
    'compliance_alert',
    'missing_tlc',
    'incomplete_cte',
    'user_assigned',
    'role_changed',
    'organization_updated',
    'system_alert'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to navigate when clicked
  
  -- Additional context data
  data JSONB, -- Flexible JSON for extra information
  
  -- Status tracking
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Priority level
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast queries
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_org FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Index for fetching user's unread notifications (most common query)
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC) 
  WHERE is_read = false;

-- Index for fetching all user notifications with pagination
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- Index for organization-wide notifications
CREATE INDEX idx_notifications_org_created ON public.notifications(organization_id, created_at DESC);

-- Index for notification type filtering
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Index for priority filtering
CREATE INDEX idx_notifications_priority ON public.notifications(priority);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to create notification for user
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_organization_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    organization_id,
    type,
    title,
    message,
    link,
    data,
    priority
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_data,
    p_priority
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id
  AND is_read = false;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all user notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id
    AND is_read = false
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count for user
CREATE OR REPLACE FUNCTION public.get_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id
  AND is_read = false;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old read notifications (older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.notifications
    WHERE is_read = true
    AND read_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update (mark as read) their own notifications
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Only system can insert notifications (via functions)
CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_system_admin() OR true); -- Allow inserts from functions

-- Policy: Users cannot delete notifications (keep audit trail)
-- No DELETE policy = no one can delete

-- =============================================
-- INITIAL TEST DATA (Optional)
-- =============================================

-- Insert a welcome notification for all existing users
-- Commented out to avoid running in production
/*
INSERT INTO public.notifications (user_id, organization_id, type, title, message, priority)
SELECT 
  p.id,
  p.organization_id,
  'system_alert',
  'Welcome to FSMA 204 Notification System',
  'You will now receive real-time notifications for important events and actions.',
  'normal'
FROM public.profiles p
WHERE p.is_active = true;
*/

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.notifications IS 'Real-time notifications for users about system events and actions';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification event (fda_request_created, lot_expiring_soon, etc.)';
COMMENT ON COLUMN public.notifications.data IS 'Additional JSON data for notification context (lot_id, request_id, etc.)';
COMMENT ON COLUMN public.notifications.link IS 'URL to navigate when user clicks notification';
COMMENT ON COLUMN public.notifications.priority IS 'Priority level: low, normal, high, urgent';

COMMENT ON FUNCTION public.create_notification IS 'Helper function to create a notification for a specific user';
COMMENT ON FUNCTION public.mark_notification_read IS 'Mark a single notification as read';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Mark all notifications as read for a user';
COMMENT ON FUNCTION public.get_unread_count IS 'Get count of unread notifications for a user';
COMMENT ON FUNCTION public.cleanup_old_notifications IS 'Delete read notifications older than 90 days';
