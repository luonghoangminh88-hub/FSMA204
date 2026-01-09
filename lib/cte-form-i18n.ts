// CTE Form Field Translations
// Separated for better organization and maintainability

export const cteFormTranslations = {
  en: {
    // Common fields
    "cteForm.harvestDate": "Harvest Date",
    "cteForm.harvestLocation": "Harvest Location",
    "cteForm.fieldName": "Field/Growing Area Name",
    "cteForm.containerName": "Container/Bin Name",
    "cteForm.commodity": "Commodity",
    "cteForm.variety": "Variety",
    "cteForm.quantityHarvested": "Quantity Harvested",
    "cteForm.unitOfMeasure": "Unit of Measure",
    "cteForm.harvesterName": "Harvester Name",
    "cteForm.harvesterPhone": "Harvester Phone",
    "cteForm.weatherConditions": "Weather Conditions",

    // Cooling
    "cteForm.coolingStartDatetime": "Cooling Start Time",
    "cteForm.coolingEndDatetime": "Cooling End Time",
    "cteForm.coolingLocationId": "Cooling Facility",
    "cteForm.coolingMethod": "Cooling Method",
    "cteForm.initialTemperature": "Initial Temperature ({unit})",
    "cteForm.finalTemperature": "Final Temperature ({unit})",
    "cteForm.targetTemperature": "Target Temperature ({unit})",
    "cteForm.quantityCooled": "Quantity Cooled",

    // Initial Packing
    "cteForm.packingDate": "Packing Date",
    "cteForm.packingLocationId": "Packing Facility",
    "cteForm.originalHarvestLocation": "Original Harvest Location",
    "cteForm.fieldGrowingArea": "Field/Growing Area",
    "cteForm.originalHarvestDate": "Original Harvest Date",
    "cteForm.commodityReceived": "Commodity Received",
    "cteForm.varietyReceived": "Variety Received",
    "cteForm.quantityReceived": "Quantity Received",
    "cteForm.quantityPacked": "Quantity Packed",
    "cteForm.lossQuantity": "Loss Quantity",
    "cteForm.lossQuantityDesc": "Auto-calculated from received - packed",
    "cteForm.lossPercentage": "Loss Percentage",
    "cteForm.lossPercentageDesc": "Auto-calculated",
    "cteForm.lossReason": "Loss Reason",
    "cteForm.assignedLotCode": "Assigned Traceability Lot Code",
    "cteForm.productDescription": "Product Description",
    "cteForm.packageType": "Package Type",
    "cteForm.packagesCount": "Number of Packages",

    // First Receiver
    "cteForm.receivedDate": "Date Received",
    "cteForm.receiverLocationId": "Receiver Location",
    "cteForm.vesselName": "Vessel Name",
    "cteForm.vesselRegistration": "Vessel Registration",
    "cteForm.captainName": "Captain Name",
    "cteForm.harvestLocationDescription": "Harvest Location Description",
    "cteForm.species": "Species/Product",
    "cteForm.productForm": "Product Form",

    // Shipping
    "cteForm.shipDate": "Ship Date",
    "cteForm.shippingLocationId": "Shipping Location",
    "cteForm.recipientName": "Recipient Name",
    "cteForm.recipientAddress": "Recipient Address",
    "cteForm.recipientCity": "Recipient City",
    "cteForm.recipientState": "Recipient State",
    "cteForm.recipientPostalCode": "Recipient Postal Code",
    "cteForm.recipientPhone": "Recipient Phone",
    "cteForm.expectedDeliveryDate": "Expected Delivery Date",
    "cteForm.carrierName": "Carrier Name",
    "cteForm.trackingNumber": "Tracking Number",
    "cteForm.transportMethod": "Transport Method",
    "cteForm.transportTemperature": "Transport Temperature ({unit})",
    "cteForm.quantityShipped": "Quantity Shipped",

    // Receiving
    "cteForm.receivingLocationId": "Receiving Location",
    "cteForm.senderName": "Sender Name",
    "cteForm.senderAddress": "Sender Address",
    "cteForm.senderPhone": "Sender Phone",
    "cteForm.productCondition": "Product Condition",
    "cteForm.temperatureAtReceipt": "Temperature at Receipt ({unit})",
    "cteForm.qualityNotes": "Quality Notes",
    "cteForm.poNumber": "PO Number",

    // Transformation
    "cteForm.transformationDate": "Transformation Date",
    "cteForm.transformationLocationId": "Transformation Facility",
    "cteForm.transformationType": "Transformation Type",
    "cteForm.transformationDescription": "Transformation Description",
    "cteForm.inputQuantity": "Input Quantity",
    "cteForm.outputQuantity": "Output Quantity",
    "cteForm.outputUnitOfMeasure": "Output Unit of Measure",
    "cteForm.yieldPercentage": "Yield Percentage",
    "cteForm.yieldPercentageDesc": "Auto-calculated: (output/input) * 100",
    "cteForm.lossQuantityTransform": "Loss Quantity",
    "cteForm.lossQuantityTransformDesc": "Auto-calculated: input - output",
    "cteForm.outputProductDescription": "Output Product Description",
    "cteForm.assignedOutputLotCode": "Assigned Output Lot Code",
    "cteForm.batchCode": "Batch Code",

    // Select options placeholders
    "cteForm.selectLocation": "Select {location}",
    "cteForm.selectUnitOfMeasure": "Select unit of measure",

    // Select option values - Cooling Methods
    "cteForm.coolingMethod.forcedAir": "Forced Air",
    "cteForm.coolingMethod.hydroCooling": "Hydro Cooling",
    "cteForm.coolingMethod.ice": "Ice",
    "cteForm.coolingMethod.vacuumCooling": "Vacuum Cooling",
    "cteForm.coolingMethod.roomCooling": "Room Cooling",

    // Select option values - Transport Methods
    "cteForm.transportMethod.truck": "Truck",
    "cteForm.transportMethod.rail": "Rail",
    "cteForm.transportMethod.air": "Air",
    "cteForm.transportMethod.ship": "Ship",

    // Select option values - Product Forms
    "cteForm.productForm.whole": "Whole",
    "cteForm.productForm.filleted": "Filleted",
    "cteForm.productForm.shucked": "Shucked",
    "cteForm.productForm.other": "Other",

    // Select option values - Product Conditions
    "cteForm.productCondition.excellent": "Excellent",
    "cteForm.productCondition.good": "Good",
    "cteForm.productCondition.acceptable": "Acceptable",
    "cteForm.productCondition.damaged": "Damaged",
    "cteForm.productCondition.rejected": "Rejected",

    // Select option values - Transformation Types
    "cteForm.transformationType.cutting": "Cutting",
    "cteForm.transformationType.cooking": "Cooking",
    "cteForm.transformationType.mixing": "Mixing",
    "cteForm.transformationType.packaging": "Packaging",
    "cteForm.transformationType.processing": "Processing",
    "cteForm.transformationType.manufacturing": "Manufacturing",

    // Form UI
    "cteForm.kdeTitle": "Key Data Elements (KDEs)",
    "cteForm.kdeDesc": "Required fields for {eventType} event",
    "cteForm.requiredCount": "{completed}/{required} Required",
    "cteForm.complianceNote": "All required fields must be completed for FSMA 204 compliance",
    "cteForm.noLocationsAvailable": "No locations available - add locations first",
    "cteForm.submit": "Submit Event",
    "cteForm.submitting": "Submitting...",
    "cteForm.completionProgress": "Completion Progress",

    // Validation messages
    "cteForm.missingFields": "Missing Required Fields",
    "cteForm.fillInFields": "Please fill in: {fields}",
    "cteForm.locationRequired": "Location Required",
    "cteForm.locationRequiredDesc": "Please select a location or add locations to your organization first",
    "cteForm.authRequired": "Authentication Required",
    "cteForm.authRequiredDesc": "Please log in to create CTE events",
    "cteForm.successTitle": "Event Created Successfully",
    "cteForm.successDesc": "{eventType} event has been recorded",
    "cteForm.errorTitle": "Error Creating Event",
    "cteForm.errorDesc": "Failed to create CTE event. Please check all fields and try again.",

    // Partner tracking
    "partner.carrierPartner": "Carrier Partner",
    "partner.recipientPartner": "Recipient Partner",
    "partner.senderPartner": "Sender Partner",
    "partner.vesselOwner": "Vessel Owner",
    "partner.selectPartner": "Select partner",
    "partner.noPartners": "No partners available",
    "partner.addPartner": "Add partner first",

    // Timeline validation
    "timeline.warning": "Timeline Warning",
    "timeline.eventBeforeProduction": "Event date is before lot production date",
    "timeline.receivingBeforeShipping": "Receiving date should be after shipping date",
    "timeline.transformationBeforeInput": "Transformation should occur after all input lot events",
    "timeline.outOfOrder": "Events may be out of chronological order",

    // Expiration alerts
    "expiration.expired": "Expired",
    "expiration.expiringSoon": "Expiring Soon",
    "expiration.expiringMonth": "Expiring This Month",
    "expiration.daysRemaining": "{days} days remaining",
    "expiration.expiredDays": "Expired {days} days ago",
    "expiration.viewExpiring": "View Expiring Lots",
    "expiration.noExpiring": "No expiring lots",

    // TLC
    "tlc.autoGenerate": "Auto-generate TLC",
    "tlc.generating": "Generating...",
    "tlc.formatExample": "Format: ORG-FOOD-LOC-YYYYMMDD-####",
    "tlc.leaveBlankAuto": "Leave blank for automatic generation",

    // Common UI buttons
    "common.select": "Select",
    "common.cancel": "Cancel",

    // Temperature conversions
    "cteForm.temperature.fahrenheit": "°F",
    "cteForm.temperature.celsius": "°C",
    "cteForm.temperature.convertF2C": "Convert to °C",
    "cteForm.temperature.convertC2F": "Convert to °F",
  },
  vi: {
    // Common fields
    "cteForm.harvestDate": "Ngày Thu hoạch",
    "cteForm.harvestLocation": "Địa điểm Thu hoạch",
    "cteForm.fieldName": "Tên Cánh đồng/Vùng Trồng",
    "cteForm.containerName": "Tên Thùng/Ngăn chứa",
    "cteForm.commodity": "Hàng hóa",
    "cteForm.variety": "Giống",
    "cteForm.quantityHarvested": "Số lượng Thu hoạch",
    "cteForm.unitOfMeasure": "Đơn vị Đo lường",
    "cteForm.harvesterName": "Tên Người Thu hoạch",
    "cteForm.harvesterPhone": "Điện thoại Người Thu hoạch",
    "cteForm.weatherConditions": "Điều kiện Thời tiết",

    // Cooling
    "cteForm.coolingStartDatetime": "Thời gian Bắt đầu Làm lạnh",
    "cteForm.coolingEndDatetime": "Thời gian Kết thúc Làm lạnh",
    "cteForm.coolingLocationId": "Cơ sở Làm lạnh",
    "cteForm.coolingMethod": "Phương pháp Làm lạnh",
    "cteForm.initialTemperature": "Nhiệt độ Ban đầu ({unit})",
    "cteForm.finalTemperature": "Nhiệt độ Cuối cùng ({unit})",
    "cteForm.targetTemperature": "Nhiệt độ Mục tiêu ({unit})",
    "cteForm.quantityCooled": "Số lượng Làm lạnh",

    // Initial Packing
    "cteForm.packingDate": "Ngày Đóng gói",
    "cteForm.packingLocationId": "Cơ sở Đóng gói",
    "cteForm.originalHarvestLocation": "Địa điểm Thu hoạch Ban đầu",
    "cteForm.fieldGrowingArea": "Cánh đồng/Vùng Trồng",
    "cteForm.originalHarvestDate": "Ngày Thu hoạch Ban đầu",
    "cteForm.commodityReceived": "Hàng hóa Nhận được",
    "cteForm.varietyReceived": "Giống Nhận được",
    "cteForm.quantityReceived": "Số lượng Nhận được",
    "cteForm.quantityPacked": "Số lượng Đóng gói",
    "cteForm.lossQuantity": "Số lượng Hao hụt",
    "cteForm.lossQuantityDesc": "Tự động tính từ nhận - đóng gói",
    "cteForm.lossPercentage": "Phần trăm Hao hụt",
    "cteForm.lossPercentageDesc": "Tự động tính toán",
    "cteForm.lossReason": "Lý do Hao hụt",
    "cteForm.assignedLotCode": "Mã Lô Truy xuất được Chỉ định",
    "cteForm.productDescription": "Mô tả Sản phẩm",
    "cteForm.packageType": "Loại Bao bì",
    "cteForm.packagesCount": "Số lượng Kiện hàng",

    // First Receiver
    "cteForm.receivedDate": "Ngày Nhận",
    "cteForm.receiverLocationId": "Địa điểm Người nhận",
    "cteForm.vesselName": "Tên Tàu",
    "cteForm.vesselRegistration": "Đăng ký Tàu",
    "cteForm.captainName": "Tên Thuyền trưởng",
    "cteForm.harvestLocationDescription": "Mô tả Địa điểm Thu hoạch",
    "cteForm.species": "Loài/Sản phẩm",
    "cteForm.productForm": "Hình thức Sản phẩm",

    // Shipping
    "cteForm.shipDate": "Ngày Gửi hàng",
    "cteForm.shippingLocationId": "Địa điểm Gửi hàng",
    "cteForm.recipientName": "Tên Người nhận",
    "cteForm.recipientAddress": "Địa chỉ Người nhận",
    "cteForm.recipientCity": "Thành phố Người nhận",
    "cteForm.recipientState": "Tỉnh/Bang Người nhận",
    "cteForm.recipientPostalCode": "Mã bưu điện Người nhận",
    "cteForm.recipientPhone": "Điện thoại Người nhận",
    "cteForm.expectedDeliveryDate": "Ngày Giao hàng Dự kiến",
    "cteForm.carrierName": "Tên Hãng Vận chuyển",
    "cteForm.trackingNumber": "Số Theo dõi",
    "cteForm.transportMethod": "Phương thức Vận chuyển",
    "cteForm.transportTemperature": "Nhiệt độ Vận chuyển ({unit})",
    "cteForm.quantityShipped": "Số lượng Gửi đi",

    // Receiving
    "cteForm.receivingLocationId": "Địa điểm Nhận hàng",
    "cteForm.senderName": "Tên Người gửi",
    "cteForm.senderAddress": "Địa chỉ Người gửi",
    "cteForm.senderPhone": "Điện thoại Người gửi",
    "cteForm.productCondition": "Tình trạng Sản phẩm",
    "cteForm.temperatureAtReceipt": "Nhiệt độ khi Nhận ({unit})",
    "cteForm.qualityNotes": "Ghi chú Chất lượng",
    "cteForm.poNumber": "Số PO",

    // Transformation
    "cteForm.transformationDate": "Ngày Chế biến",
    "cteForm.transformationLocationId": "Cơ sở Chế biến",
    "cteForm.transformationType": "Loại Chế biến",
    "cteForm.transformationDescription": "Mô tả Chế biến",
    "cteForm.inputQuantity": "Số lượng Đầu vào",
    "cteForm.outputQuantity": "Số lượng Đầu ra",
    "cteForm.outputUnitOfMeasure": "Đơn vị Đo lường Đầu ra",
    "cteForm.yieldPercentage": "Phần trăm Hiệu suất",
    "cteForm.yieldPercentageDesc": "Tự động tính: (đầu ra/đầu vào) * 100",
    "cteForm.lossQuantityTransform": "Số lượng Hao hụt",
    "cteForm.lossQuantityTransformDesc": "Tự động tính: đầu vào - đầu ra",
    "cteForm.outputProductDescription": "Mô tả Sản phẩm Đầu ra",
    "cteForm.assignedOutputLotCode": "Mã Lô Đầu ra được Chỉ định",
    "cteForm.batchCode": "Mã Lô sản xuất",

    // Select options placeholders
    "cteForm.selectLocation": "Chọn {location}",
    "cteForm.selectUnitOfMeasure": "Chọn đơn vị đo lường",

    // Select option values - Cooling Methods
    "cteForm.coolingMethod.forcedAir": "Gió cưỡng bức",
    "cteForm.coolingMethod.hydroCooling": "Làm lạnh bằng nước",
    "cteForm.coolingMethod.ice": "Đá",
    "cteForm.coolingMethod.vacuumCooling": "Làm lạnh chân không",
    "cteForm.coolingMethod.roomCooling": "Làm lạnh phòng",

    // Select option values - Transport Methods
    "cteForm.transportMethod.truck": "Xe tải",
    "cteForm.transportMethod.rail": "Đường sắt",
    "cteForm.transportMethod.air": "Hàng không",
    "cteForm.transportMethod.ship": "Tàu biển",

    // Select option values - Product Forms
    "cteForm.productForm.whole": "Nguyên con",
    "cteForm.productForm.filleted": "Phi lê",
    "cteForm.productForm.shucked": "Đã bóc vỏ",
    "cteForm.productForm.other": "Khác",

    // Select option values - Product Conditions
    "cteForm.productCondition.excellent": "Xuất sắc",
    "cteForm.productCondition.good": "Tốt",
    "cteForm.productCondition.acceptable": "Chấp nhận được",
    "cteForm.productCondition.damaged": "Hư hỏng",
    "cteForm.productCondition.rejected": "Từ chối",

    // Select option values - Transformation Types
    "cteForm.transformationType.cutting": "Cắt",
    "cteForm.transformationType.cooking": "Nấu",
    "cteForm.transformationType.mixing": "Trộn",
    "cteForm.transformationType.packaging": "Đóng gói",
    "cteForm.transformationType.processing": "Chế biến",
    "cteForm.transformationType.manufacturing": "Sản xuất",

    // Form UI
    "cteForm.kdeTitle": "Các Yếu tố Dữ liệu Chính (KDE)",
    "cteForm.kdeDesc": "Các trường bắt buộc cho sự kiện {eventType}",
    "cteForm.requiredCount": "{completed}/{required} Bắt buộc",
    "cteForm.complianceNote": "Tất cả các trường bắt buộc phải được hoàn thành để tuân thủ FSMA 204",
    "cteForm.noLocationsAvailable": "Không có địa điểm nào - thêm địa điểm trước",
    "cteForm.submit": "Gửi Sự kiện",
    "cteForm.submitting": "Đang gửi...",
    "cteForm.completionProgress": "Tiến độ hoàn thành",

    // Validation messages
    "cteForm.missingFields": "Thiếu Trường Bắt buộc",
    "cteForm.fillInFields": "Vui lòng điền: {fields}",
    "cteForm.locationRequired": "Yêu cầu Địa điểm",
    "cteForm.locationRequiredDesc": "Vui lòng chọn một địa điểm hoặc thêm địa điểm vào tổ chức của bạn trước",
    "cteForm.authRequired": "Yêu cầu Xác thực",
    "cteForm.authRequiredDesc": "Vui lòng đăng nhập để tạo sự kiện CTE",
    "cteForm.successTitle": "Tạo Sự kiện Thành công",
    "cteForm.successDesc": "Sự kiện {eventType} đã được ghi lại",
    "cteForm.errorTitle": "Lỗi Tạo Sự kiện",
    "cteForm.errorDesc": "Không thể tạo sự kiện CTE. Vui lòng kiểm tra tất cả các trường và thử lại.",

    // Partner tracking
    "partner.carrierPartner": "Đối tác Vận chuyển",
    "partner.recipientPartner": "Đối tác Nhận hàng",
    "partner.senderPartner": "Đối tác Gửi hàng",
    "partner.vesselOwner": "Chủ tàu",
    "partner.selectPartner": "Chọn đối tác",
    "partner.noPartners": "Không có đối tác",
    "partner.addPartner": "Thêm đối tác trước",

    // Timeline validation
    "timeline.warning": "Cảnh báo Thời gian",
    "timeline.eventBeforeProduction": "Ngày sự kiện trước ngày sản xuất lô",
    "timeline.receivingBeforeShipping": "Ngày nhận hàng nên sau ngày gửi hàng",
    "timeline.transformationBeforeInput": "Chế biến nên diễn ra sau tất cả sự kiện lô đầu vào",
    "timeline.outOfOrder": "Các sự kiện có thể không theo thứ tự thời gian",

    // Expiration alerts
    "expiration.expired": "Đã hết hạn",
    "expiration.expiringSoon": "Sắp hết hạn",
    "expiration.expiringMonth": "Hết hạn trong tháng",
    "expiration.daysRemaining": "Còn {days} ngày",
    "expiration.expiredDays": "Đã hết hạn {days} ngày",
    "expiration.viewExpiring": "Xem lô sắp hết hạn",
    "expiration.noExpiring": "Không có lô sắp hết hạn",

    // TLC
    "tlc.autoGenerate": "Tạo TLC tự động",
    "tlc.generating": "Đang tạo...",
    "tlc.formatExample": "Định dạng: ORG-FOOD-LOC-YYYYMMDD-####",
    "tlc.leaveBlankAuto": "Bỏ trống để tạo tự động",

    // Common UI buttons
    "common.select": "Chọn",
    "common.cancel": "Hủy",

    // Temperature conversions
    "cteForm.temperature.fahrenheit": "°F",
    "cteForm.temperature.celsius": "°C",
    "cteForm.temperature.convertF2C": "Chuyển đổi sang °C",
    "cteForm.temperature.convertC2F": "Chuyển đổi sang °F",
  },
}

// Helper function to get translation
export function getCteFormTranslation(locale: "en" | "vi", key: string, replacements?: Record<string, string>): string {
  let translation = cteFormTranslations[locale][key as keyof typeof cteFormTranslations.en] || key

  if (replacements) {
    Object.entries(replacements).forEach(([placeholder, value]) => {
      translation = translation.replace(`{${placeholder}}`, value)
    })
  }

  return translation
}

export const phase2Translations = cteFormTranslations
