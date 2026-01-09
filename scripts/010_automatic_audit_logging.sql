-- =============================================
-- AUTOMATIC AUDIT LOGGING
-- Phase 1: Priority 1 - Critical Implementation
-- =============================================

-- Enhanced audit log function that captures all changes
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_org_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user from session
  current_user_id := auth.uid();
  
  -- Get user's organization
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = current_user_id;
  
  -- Log the change
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data,
      created_at
    ) VALUES (
      user_org_id,
      current_user_id,
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL,
      NOW()
    );
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data,
      created_at
    ) VALUES (
      user_org_id,
      current_user_id,
      'update',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data,
      created_at
    ) VALUES (
      user_org_id,
      current_user_id,
      'create',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to all CTE tables
DROP TRIGGER IF EXISTS audit_cte_events ON public.cte_events;
CREATE TRIGGER audit_cte_events
  AFTER INSERT OR UPDATE OR DELETE ON public.cte_events
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_cte_harvesting ON public.cte_harvesting;
CREATE TRIGGER audit_cte_harvesting
  AFTER INSERT OR UPDATE OR DELETE ON public.cte_harvesting
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_cte_cooling ON public.cte_cooling;
CREATE TRIGGER audit_cte_cooling
  AFTER INSERT OR UPDATE OR DELETE ON public.cte_cooling
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_cte_initial_packing ON public.cte_initial_packing;
CREATE TRIGGER audit_cte_initial_packing
  AFTER INSERT OR UPDATE OR DELETE ON public.cte_initial_packing
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_cte_first_receiver ON public.cte_first_receiver;
CREATE TRIGGER audit_cte_first_receiver
  AFTER INSERT OR UPDATE OR DELETE ON public.cte_first_receiver
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_cte_shipping ON public.cte_shipping;
CREATE TRIGGER audit_cte_shipping
  AFTER INSERT OR UPDATE OR DELETE ON public.cte_shipping
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_cte_receiving ON public.cte_receiving;
CREATE TRIGGER audit_cte_receiving
  AFTER INSERT OR UPDATE OR DELETE ON public.cte_receiving
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_cte_transformation ON public.cte_transformation;
CREATE TRIGGER audit_cte_transformation
  AFTER INSERT OR UPDATE OR DELETE ON public.cte_transformation
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Audit traceability lots
DROP TRIGGER IF EXISTS audit_lots ON public.traceability_lots;
CREATE TRIGGER audit_lots
  AFTER INSERT OR UPDATE OR DELETE ON public.traceability_lots
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Audit inventory changes
DROP TRIGGER IF EXISTS audit_inventory ON public.lot_inventory;
CREATE TRIGGER audit_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.lot_inventory
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

COMMENT ON FUNCTION audit_log_changes IS 'Automatically logs all changes to critical tables with old and new data in JSONB format';
