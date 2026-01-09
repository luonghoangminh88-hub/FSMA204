const fs = require('fs');
const path = require('path');

const OLD_FILE_PATH = path.join(__dirname, 'old_translations.json');
const NEW_FILE_PATH = path.join(__dirname, 'public/locales/vi/translation.json');

try {
    const oldRaw = fs.readFileSync(OLD_FILE_PATH, 'utf8');

    // 1. Tìm khối dữ liệu của tiếng Việt trong object translations
    // Script này tìm nội dung giữa vi: { và }
    const viMatch = oldRaw.match(/vi:\s*{([\s\S]*?)}/);
    
    if (!viMatch) {
        throw new Error("Không tìm thấy khối dữ liệu 'vi: {}' trong file cũ.");
    }

    // 2. Chuyển đổi khối text đó thành object
    // Thêm {} bao quanh và dùng eval để biến thành Object JS thực thụ
    let viData;
    try {
        viData = eval('({' + viMatch[1] + '})');
    } catch (e) {
        throw new Error("Cú pháp trong khối 'vi' không hợp lệ. Hãy kiểm tra dấu phẩy hoặc nháy đơn.");
    }

    const newData = JSON.parse(fs.readFileSync(NEW_FILE_PATH, 'utf8'));

    let count = 0;
    let missingCount = 0;

    // 3. Hợp nhất vào file mới
    Object.keys(newData).forEach(key => {
        if (viData[key] && viData[key].trim() !== "") {
            newData[key] = viData[key];
            count++;
        } else {
            if (newData[key] === "") missingCount++;
        }
    });

    // 4. Lưu lại
    fs.writeFileSync(NEW_FILE_PATH, JSON.stringify(newData, null, 2), 'utf8');

    console.log(`\n--- KẾT QUẢ ---`);
    console.log(`✅ Đã cứu được: ${count} nội dung cũ.`);
    console.log(`⚠️  Còn trống: ${missingCount} nội dung mới chưa dịch.`);
    console.log(`📂 Cập nhật thành công: ${NEW_FILE_PATH}`);

} catch (error) {
    console.error("❌ Lỗi:", error.message);
}