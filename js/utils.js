/**
 * utils.js — Các hàm tiện ích dùng chung
 * Bao gồm: định dạng tiền tệ, kiểm tra URL, validate form, hiển thị lỗi inline
 * Không phụ thuộc vào thư viện nào, dùng được ở mọi trang
 */

/**
 * Định dạng số thành chuỗi tiền Việt Nam Đồng (VND)
 * Ví dụ: 1200000 → "1.200.000 ₫"
 *
 * @param {number} number - Giá trị số cần định dạng
 * @returns {string} Chuỗi đã định dạng, hoặc "0 ₫" nếu giá trị không hợp lệ
 */
function formatPrice(number) {
    // Trả về mặc định nếu giá trị null, undefined, hoặc không phải số
    if (number === null || number === undefined || isNaN(number)) {
        return '0 ₫';
    }
    // Dùng regex để chèn dấu chấm mỗi 3 chữ số từ phải sang trái
    // \B: không phải đầu chuỗi, (?=(\d{3})+(?!\d)): phía sau có bội số của 3 chữ số
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
}

/**
 * Kiểm tra xem một chuỗi có phải là URL hợp lệ không
 * Chỉ chấp nhận giao thức http:// và https://
 *
 * @param {string} str - Chuỗi cần kiểm tra
 * @returns {boolean} true nếu là URL hợp lệ, false nếu không
 */
function isValidUrl(str) {
    // Loại nhanh nếu null/undefined/không phải string
    if (!str || typeof str !== 'string') return false;
    try {
        // Dùng constructor URL để parse — sẽ throw nếu URL không hợp lệ
        var url = new URL(str);
        // Chỉ cho phép http và https, không cho file:// hay ftp://
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        // URL không parse được → không hợp lệ
        return false;
    }
}

/**
 * Kiểm tra (validate) toàn bộ form thêm/sửa tác phẩm
 * Trả về danh sách lỗi theo từng trường để hiển thị inline
 *
 * @param {Object} formData - Object chứa dữ liệu form:
 *   { title, artist, style, price, imageUrl }
 * @returns {{ valid: boolean, errors: Object }}
 *   errors là object dạng { fieldName: "Thông báo lỗi" }
 *   Nếu không có lỗi, errors là {} và valid = true
 */
function validateForm(formData) {
    var errors = {};

    // Kiểm tra tiêu đề: không được bỏ trống hoặc chỉ toàn khoảng trắng
    if (!formData.title || formData.title.trim() === '') {
        errors.title = 'Tiêu đề không được để trống';
    }

    // Kiểm tra tên nghệ sĩ
    if (!formData.artist || formData.artist.trim() === '') {
        errors.artist = 'Tên nghệ sĩ không được để trống';
    }

    // Kiểm tra URL ảnh: bỏ trống hoặc định dạng sai đều báo lỗi
    if (!formData.imageUrl || formData.imageUrl.trim() === '') {
        errors.imageUrl = 'URL hình ảnh không được để trống';
    } else if (!isValidUrl(formData.imageUrl)) {
        errors.imageUrl = 'URL hình ảnh không hợp lệ';
    }

    return {
        valid: Object.keys(errors).length === 0, // Không có lỗi nào → hợp lệ
        errors: errors
    };
}

/**
 * Hiển thị thông báo lỗi ngay bên dưới một trường input
 * Thêm class 'is-invalid' để tô đỏ viền và tạo thẻ lỗi nếu chưa có
 *
 * @param {string} fieldId - ID của thẻ input cần hiển thị lỗi
 * @param {string} message - Nội dung thông báo lỗi
 */
function showInlineError(fieldId, message) {
    var field = document.getElementById(fieldId);
    if (!field) return; // Không làm gì nếu không tìm thấy phần tử

    // Tô đỏ viền input (Bootstrap validation class)
    field.classList.add('is-invalid');

    // Tránh tạo nhiều thẻ lỗi trùng nhau — cập nhật nội dung nếu đã có
    var existingError = field.parentElement.querySelector('.inline-error');
    if (existingError) {
        existingError.textContent = message;
        return;
    }

    // Tạo thẻ div hiển thị lỗi và chèn vào ngay sau input
    var errorEl = document.createElement('div');
    errorEl.className = 'inline-error';
    errorEl.textContent = message;
    field.parentElement.appendChild(errorEl);
}

/**
 * Xóa toàn bộ thông báo lỗi inline và trạng thái 'is-invalid'
 * Gọi trước khi validate lại form (để tránh lỗi chồng lỗi)
 */
function clearErrors() {
    // Xóa tất cả các thẻ thông báo lỗi đang hiển thị
    var errors = document.querySelectorAll('.inline-error');
    for (var i = 0; i < errors.length; i++) {
        errors[i].remove();
    }

    // Xóa viền đỏ khỏi tất cả các trường input
    var invalidFields = document.querySelectorAll('.is-invalid');
    for (var j = 0; j < invalidFields.length; j++) {
        invalidFields[j].classList.remove('is-invalid');
    }
}

/**
 * Tạo URL ảnh giữ chỗ (placeholder) từ picsum.photos
 * Dùng seed để mỗi tác phẩm có ảnh khác nhau nhưng nhất quán
 *
 * @param {string|number} seed   - Seed để tạo ảnh nhất quán (thường là ID tác phẩm)
 * @param {number}        width  - Chiều rộng ảnh (mặc định 600px)
 * @param {number}        height - Chiều cao ảnh (mặc định 800px)
 * @returns {string} URL ảnh placeholder
 */
function getPlaceholderImage(seed, width, height) {
    return 'https://picsum.photos/seed/art' + seed + '/' + (width || 600) + '/' + (height || 800);
}

/**
 * Lấy URL ảnh hiển thị — ưu tiên URL thật, fallback về placeholder
 * Lọc bỏ URL mẫu/demo không dùng được ('ibb.co/example')
 *
 * @param {string}       imageUrl - URL ảnh gốc từ dữ liệu API
 * @param {string|number} id      - ID tác phẩm dùng làm seed cho placeholder
 * @returns {string} URL ảnh sẽ được dùng trong thẻ <img>
 */
function getImageUrl(imageUrl, id) {
    // Chỉ dùng URL gốc nếu: tồn tại, không phải URL mẫu, và là URL hợp lệ
    if (imageUrl && imageUrl.indexOf('ibb.co/example') === -1 && isValidUrl(imageUrl)) {
        return imageUrl;
    }
    // Ngược lại dùng ảnh placeholder từ picsum.photos
    return getPlaceholderImage(id, 600, 800);
}