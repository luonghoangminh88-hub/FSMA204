-- =============================================
-- HỆ THỐNG TỰ ĐỘNG GÁN GÓI VÀ THEO DÕI TÀI NGUYÊN
-- Phiên bản đã sửa lỗi Not-Null và Schema Mapping
-- =============================================

-- PART 1: TỰ ĐỘNG TẠO SUBSCRIPTION KHI CÓ ORG MỚI
CREATE OR REPLACE FUNCTION auto_create_starter_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_starter_package_id UUID;
  v_starter_price DECIMAL(10, 2);
BEGIN
  -- Lấy thông tin gói Starter (Sử dụng COALESCE để tránh lỗi NULL)
  SELECT id, COALESCE(price_monthly, 0) 
  INTO v_starter_package_id, v_starter_price
  FROM public.service_packages 
  WHERE package_code = 'starter' 
  AND is_active = true
  LIMIT 1;
  
  IF v_starter_package_id IS NOT NULL THEN
    INSERT INTO public.organization_subscriptions (
      id,
      organization_id,
      package_id,
      subscription_status,
      billing_cycle,
      subscription_start_date,
      next_billing_date,
      usage_period_start,
      usage_period_end,
      base_price,
      monthly_total, -- Đã sửa: Đảm bảo điền giá trị này
      current_users_count,
      current_locations_count,
      current_lots_count,
      extra_users_count,
      extra_locations_count,
      extra_lots_count,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      v_starter_package_id,
      'active',
      'monthly',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 month',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 month',
      v_starter_price,
      v_starter_price, -- Điền v_starter_price vào monthly_total
      0, 0, 0, 0, 0, 0,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Đã tự động tạo gói Starter cho tổ chức: %', NEW.name;
  ELSE
    RAISE WARNING 'Không tìm thấy gói Starter trong hệ thống!';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate Trigger
DROP TRIGGER IF EXISTS trigger_auto_create_starter_subscription ON public.organizations;
CREATE TRIGGER trigger_auto_create_starter_subscription
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_starter_subscription();

-- PART 2: TỰ ĐỘNG CẬP NHẬT SỐ LƯỢNG USER (PROFILES)
CREATE OR REPLACE FUNCTION update_subscription_user_count()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_count INTEGER;
BEGIN
  v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;
  
  IF v_org_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Đếm số user active trong profiles
  SELECT COUNT(*) INTO v_count
  FROM public.profiles
  WHERE organization_id = v_org_id AND is_active = true;

  UPDATE public.organization_subscriptions
  SET current_users_count = v_count, updated_at = NOW()
  WHERE organization_id = v_org_id AND subscription_status = 'active';
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_count ON public.profiles;
CREATE TRIGGER trigger_update_user_count
  AFTER INSERT OR UPDATE OF is_active, organization_id OR DELETE
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_subscription_user_count();

-- PART 3: TỰ ĐỘNG CẬP NHẬT SỐ LƯỢNG ĐỊA ĐIỂM
CREATE OR REPLACE FUNCTION update_subscription_location_count()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_count INTEGER;
BEGIN
  v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;
  
  SELECT COUNT(*) INTO v_count
  FROM public.locations
  WHERE organization_id = v_org_id AND is_active = true;

  UPDATE public.organization_subscriptions
  SET current_locations_count = v_count, updated_at = NOW()
  WHERE organization_id = v_org_id AND subscription_status = 'active';
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_location_count ON public.locations;
CREATE TRIGGER trigger_update_location_count
  AFTER INSERT OR UPDATE OF is_active OR DELETE
  ON public.locations
  FOR EACH ROW EXECUTE FUNCTION update_subscription_location_count();

-- PART 4: ĐỒNG BỘ DỮ LIỆU BAN ĐẦU (INITIAL SYNC)
DO $$
DECLARE
  v_org RECORD;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    UPDATE public.organization_subscriptions os
    SET 
      current_users_count = (SELECT COUNT(*) FROM profiles WHERE organization_id = v_org.id AND is_active = true),
      current_locations_count = (SELECT COUNT(*) FROM locations WHERE organization_id = v_org.id AND is_active = true),
      updated_at = NOW()
    WHERE organization_id = v_org.id AND subscription_status = 'active';
  END LOOP;
END;
$$;
