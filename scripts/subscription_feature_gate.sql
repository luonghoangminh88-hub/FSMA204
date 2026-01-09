-- =============================================
-- FILE: subscription_feature_gate.sql
-- MỤC TIÊU: Quản lý gói cước và kiểm tra quyền truy cập tính năng (Feature Gating)
-- =============================================

-- 1. TRUY VẤN KIỂM TRA CHI TIẾT CÁC GÓI HIỆN TẠI
SELECT 
    package_name AS "Tên gói",
    package_code AS "Mã gói",
    package_tier AS "Cấp độ",
    price_monthly AS "Giá tháng",
    max_users AS "User tối đa",
    max_locations AS "Địa điểm tối đa",
    storage_gb AS "Dung lượng (GB)",
    has_batch_operations AS "Thao tác lô",
    has_advanced_analytics AS "Phân tích nâng cao",
    support_level AS "Mức hỗ trợ"
FROM public.service_packages
ORDER BY package_tier ASC;

-- 2. HÀM KIỂM TRA QUYỀN TRUY CẬP TÍNH NĂNG (FEATURE GATE FUNCTION)
-- Vì tên tham số đã thay đổi, cần xóa hàm cũ trước khi tạo mới
DROP FUNCTION IF EXISTS public.has_feature_access(uuid, text);

CREATE OR REPLACE FUNCTION public.has_feature_access(
    p_organization_id UUID,
    p_feature_column_name TEXT
) 
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN;
    v_query TEXT;
BEGIN
    -- Tạo câu lệnh động để kiểm tra cột tính năng tương ứng trong gói cước của Org
    v_query := format(
        'SELECT sp.%I FROM public.organization_subscriptions os ' ||
        'JOIN public.service_packages sp ON os.package_id = sp.id ' ||
        'WHERE os.organization_id = %L AND os.subscription_status = %L LIMIT 1',
        p_feature_column_name, p_organization_id, 'active'
    );

    EXECUTE v_query INTO v_has_access;
    
    RETURN COALESCE(v_has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. BÁO CÁO TỔNG HỢP QUYỀN HẠN CÁC CÔNG TY
SELECT 
    o.name as "Công ty",
    sp.package_code as "Gói hiện tại",
    public.has_feature_access(o.id, 'has_api_access') as "Quyền dùng API",
    public.has_feature_access(o.id, 'has_batch_operations') as "Quyền thao tác lô",
    public.has_feature_access(o.id, 'has_white_label_branding') as "Quyền White Label"
FROM public.organizations o
JOIN public.organization_subscriptions os ON o.id = os.organization_id
JOIN public.service_packages sp ON os.package_id = sp.id
WHERE os.subscription_status = 'active';
