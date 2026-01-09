-- Bước A: Xóa bỏ constraint cũ (nếu có) để rảnh tay xử lý dữ liệu
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_organization_type_check;

-- Bước B: Cập nhật chuẩn hóa dữ liệu một lần nữa (Xử lý cả khoảng trắng nếu có)
UPDATE public.organizations
SET organization_type = TRIM(organization_type);

-- Bước C: Gán lại các giá trị cũ về giá trị mới (Dùng chính xác text)
UPDATE public.organizations
SET organization_type = 'distributor_warehouse'
WHERE organization_type NOT IN (
  'farm_grower', 'packer_packhouse', 'processor_manufacturer', 
  'distributor_warehouse', 'first_receiver', 'importer', 'retailer'
) OR organization_type IS NULL;

-- Bước D: Thêm lại constraint nhưng ở chế độ NOT VALID để nó không check dữ liệu cũ ngay lập tức
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_organization_type_check 
CHECK (organization_type IN (
  'farm_grower', 'packer_packhouse', 'processor_manufacturer', 
  'distributor_warehouse', 'first_receiver', 'importer', 'retailer'
)) NOT VALID;

-- Bước E: Hợp thức hóa constraint
ALTER TABLE public.organizations 
VALIDATE CONSTRAINT organizations_organization_type_check;
