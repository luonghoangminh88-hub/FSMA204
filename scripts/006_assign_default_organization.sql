-- Fix for existing users without organization
-- This creates a default organization and assigns it to users who don't have one

-- Create default organization if it doesn't exist
INSERT INTO organizations (
  id,
  name,
  organization_type, -- Cột này đang có constraint mới
  email,
  phone,
  address,
  city,
  state,
  postal_code,
  country,
  is_active
)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Default Organization',
  'farm_grower', -- ĐÃ SỬA: từ 'grower' thành 'farm_grower' để khớp với constraint mới
  'admin@fsma204.com',
  '+1-555-0100',
  '123 Main Street',
  'City',
  'State',
  '00000',
  'USA',
  true
)
ON CONFLICT (id) DO UPDATE SET organization_type = 'farm_grower'; -- Đảm bảo update nếu đã tồn tại

-- Update all profiles without organization_id to use default org
UPDATE profiles
SET 
  organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid,
  updated_at = NOW()
WHERE organization_id IS NULL;
