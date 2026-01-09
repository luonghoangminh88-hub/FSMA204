-- =============================================
-- FILE: subscription_guardrails.sql
-- DÀNH CHO: System Admin
-- MỤC TIÊU: Quản lý gói cước và thiết lập hạn mức tự động (Guardrails)
-- =============================================

-- 1. TRUY VẤN TỔNG QUAN DANH SÁCH GÓI (Tự động cập nhật khi thêm gói mới)
SELECT 
    package_code as "Mã gói", 
    package_name as "Tên gói", 
    price_monthly as "Giá tháng", 
    max_users as "User tối đa", 
    (SELECT count(*) FROM public.organization_subscriptions os WHERE os.package_id = sp.id AND os.subscription_status = 'active') as "Số khách hàng đang dùng"
FROM public.service_packages sp
ORDER BY package_tier;

-- 2. TRUY VẤN CHI TIẾT SỬ DỤNG CỦA TỪNG CÔNG TY (Theo dõi vi phạm hạn mức)
SELECT 
    o.name as "Tên công ty",
    sp.package_name as "Gói đang dùng",
    os.current_users_count || ' / ' || COALESCE(sp.max_users::text, '∞') as "Sử dụng User",
    os.current_locations_count || ' / ' || COALESCE(sp.max_locations::text, '∞') as "Sử dụng Địa điểm",
    CASE 
        WHEN sp.max_users IS NOT NULL AND os.current_users_count >= sp.max_users THEN 'CẢNH BÁO: Đầy User'
        WHEN sp.max_locations IS NOT NULL AND os.current_locations_count >= sp.max_locations THEN 'CẢNH BÁO: Đầy Địa điểm'
        ELSE 'Bình thường'
    END as "Trạng thái hạn mức"
FROM public.organizations o
JOIN public.organization_subscriptions os ON o.id = os.organization_id
JOIN public.service_packages sp ON os.package_id = sp.id
WHERE os.subscription_status = 'active';

-- 3. HÀM KIỂM TRA HẠN MỨC (GUARDRAIL FUNCTION)
-- Hàm này sẽ chặn hành động INSERT nếu vi phạm số lượng tối đa của gói
CREATE OR REPLACE FUNCTION public.fn_check_subscription_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_max_allowed INTEGER;
    v_current_count INTEGER;
    v_package_name TEXT;
BEGIN
    -- Kiểm tra giới hạn cho bảng Profiles (Users)
    IF (TG_TABLE_NAME = 'profiles') THEN
        SELECT sp.max_users, os.current_users_count, sp.package_name
        INTO v_max_allowed, v_current_count, v_package_name
        FROM public.organization_subscriptions os
        JOIN public.service_packages sp ON os.package_id = sp.id
        WHERE os.organization_id = NEW.organization_id AND os.subscription_status = 'active';

        IF v_max_allowed IS NOT NULL AND v_current_count >= v_max_allowed THEN
            RAISE EXCEPTION 'Vượt quá giới hạn người dùng. Gói % chỉ cho phép tối đa % người dùng.', v_package_name, v_max_allowed;
        END IF;
    END IF;

    -- Kiểm tra giới hạn cho bảng Locations (Địa điểm)
    IF (TG_TABLE_NAME = 'locations') THEN
        SELECT sp.max_locations, os.current_locations_count, sp.package_name
        INTO v_max_allowed, v_current_count, v_package_name
        FROM public.organization_subscriptions os
        JOIN public.service_packages sp ON os.package_id = sp.id
        WHERE os.organization_id = NEW.organization_id AND os.subscription_status = 'active';

        IF v_max_allowed IS NOT NULL AND v_current_count >= v_max_allowed THEN
            RAISE EXCEPTION 'Vượt quá giới hạn địa điểm. Gói % chỉ cho phép tối đa % địa điểm.', v_package_name, v_max_allowed;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CÀI ĐẶT TRIGGER CHẶN (BEFORE INSERT)
DROP TRIGGER IF EXISTS tr_limit_check_profiles ON public.profiles;
CREATE TRIGGER tr_limit_check_profiles
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_check_subscription_limits();

DROP TRIGGER IF EXISTS tr_limit_check_locations ON public.locations;
CREATE TRIGGER tr_limit_check_locations
BEFORE INSERT ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.fn_check_subscription_limits();
