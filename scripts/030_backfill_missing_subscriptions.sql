-- =============================================
-- FIX SCRIPT 041: SỬA LỖI CỘT USERNAME & HOÀN TẤT GÁN GÓI
-- Mục tiêu: Cấp quyền system_admin qua email và gán gói cho Default Org
-- =============================================

DO $$
DECLARE
    v_starter_id UUID;
    v_org RECORD;
    v_sub_id UUID;
    v_starter_price DECIMAL(10,2) := 199.00;
    v_admin_email TEXT := 'hocluongvan88@gmail.com'; 
BEGIN
    -- 1. THIẾT LẬP QUYỀN SYSTEM ADMIN CHO USER (Sử dụng email thay vì username)
    -- Kiểm tra sự tồn tại của user trước khi update để tránh lỗi
    IF EXISTS (SELECT 1 FROM public.profiles WHERE email = v_admin_email) THEN
        UPDATE public.profiles 
        SET role = 'system_admin' 
        WHERE email = v_admin_email;
        RAISE NOTICE 'Đã cập nhật quyền system_admin cho: %', v_admin_email;
    ELSE
        RAISE NOTICE 'Không tìm thấy profile với email: %. Hãy kiểm tra lại email đăng ký.', v_admin_email;
    END IF;

    -- 2. LẤY ID GÓI STARTER
    SELECT id INTO v_starter_id FROM public.service_packages WHERE package_code = 'starter' LIMIT 1;

    -- 3. TẮT TRIGGER TẠM THỜI ĐỂ ÉP DỮ LIỆU
    ALTER TABLE public.organization_subscriptions DISABLE TRIGGER trigger_update_subscription_total;

    -- 4. DUYỆT TẤT CẢ ORG (Bao gồm cả Default Organization)
    FOR v_org IN 
        SELECT id, name FROM public.organizations WHERE is_active = true
    LOOP
        -- Nếu chưa có gói active thì tạo mới
        IF NOT EXISTS (
            SELECT 1 FROM public.organization_subscriptions 
            WHERE organization_id = v_org.id AND subscription_status = 'active'
        ) THEN
            v_sub_id := gen_random_uuid();
            
            INSERT INTO public.organization_subscriptions (
                id, organization_id, package_id, subscription_status, billing_cycle,
                subscription_start_date, next_billing_date, usage_period_start, usage_period_end,
                base_price, monthly_total, current_users_count, 
                current_locations_count, current_lots_count, created_at, updated_at
            ) VALUES (
                v_sub_id, v_org.id, v_starter_id, 'active', 'monthly',
                CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month',
                v_starter_price, v_starter_price, 0, 0, 0, NOW(), NOW()
            );
        END IF;

        -- 5. ĐỒNG BỘ DỮ LIỆU TÀI NGUYÊN
        UPDATE public.organization_subscriptions
        SET 
            current_users_count = (SELECT COUNT(*) FROM public.profiles WHERE organization_id = v_org.id AND is_active = true),
            current_locations_count = (SELECT COUNT(*) FROM public.locations WHERE organization_id = v_org.id AND is_active = true),
            updated_at = NOW()
        WHERE organization_id = v_org.id AND subscription_status = 'active';
    END LOOP;

    -- 6. BẬT LẠI TRIGGER
    ALTER TABLE public.organization_subscriptions ENABLE TRIGGER trigger_update_subscription_total;
END $$;

-- KIỂM TRA TRẠNG THÁI (Bỏ cột username bị lỗi)
SELECT 
    p.email, 
    p.role as "Quyền hạn",
    o.name as "Công ty",
    os.subscription_status as "Gói dịch vụ",
    os.monthly_total as "Giá"
FROM public.profiles p
JOIN public.organizations o ON p.organization_id = o.id
LEFT JOIN public.organization_subscriptions os ON o.id = os.organization_id
WHERE p.email = 'hocluongvan88@gmail.com' OR p.role = 'system_admin'
OR o.name = 'Default Organization';
