/**
 * api.js — Module gọi API trung tâm
 * Tập trung toàn bộ các lệnh gọi MockAPI (GET/POST/PUT/DELETE)
 * Gắn vào window.API để dùng chung toàn bộ ứng dụng
 */

// Địa chỉ gốc của API (MockAPI endpoint)
const API_BASE = 'https://69fa35c8c509a40d3aa4125a.mockapi.io/api/v1';

// Gán object API vào window để các file JS khác (main.js, admin.js) có thể gọi
window.API = {

    /**
     * Lấy danh sách tất cả tác phẩm
     * Phương thức: GET /ArtGallery
     * @returns {Promise<Array>} Mảng các object tác phẩm
     */
    getArtworks: function () {
        // Gọi fetch đến endpoint danh sách tác phẩm
        return fetch(API_BASE + '/ArtGallery')
            .then(function (response) {
                // Nếu server trả về lỗi HTTP (4xx, 5xx), ném lỗi để .catch bắt
                if (!response.ok) {
                    throw new Error('Lỗi tải danh sách tác phẩm: ' + response.status);
                }
                // Chuyển body JSON thành object JavaScript
                return response.json();
            })
            .catch(function (error) {
                // Ghi lỗi ra console để dễ debug
                console.error('API.getArtworks error:', error);
                // Ném lại để caller biết có lỗi và xử lý (hiển thị thông báo...)
                throw error;
            });
    },

    /**
     * Lấy thông tin một tác phẩm theo ID
     * Phương thức: GET /ArtGallery/:id
     * @param {string|number} id - ID của tác phẩm cần lấy
     * @returns {Promise<Object>} Object tác phẩm
     */
    getArtwork: function (id) {
        return fetch(API_BASE + '/ArtGallery/' + id)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Lỗi tải tác phẩm ' + id + ': ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.getArtwork error:', error);
                throw error;
            });
    },

    /**
     * Tạo mới một tác phẩm
     * Phương thức: POST /ArtGallery
     * @param {Object} data - Dữ liệu tác phẩm cần tạo (title, artist, style, ...)
     * @returns {Promise<Object>} Object tác phẩm vừa được tạo (có ID do server cấp)
     */
    createArtwork: function (data) {
        return fetch(API_BASE + '/ArtGallery', {
            method: 'POST',
            // Báo cho server biết body là JSON
            headers: { 'Content-Type': 'application/json' },
            // Chuyển object JS thành chuỗi JSON để gửi lên server
            body: JSON.stringify(data)
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Lỗi tạo tác phẩm: ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.createArtwork error:', error);
                throw error;
            });
    },

    /**
     * Cập nhật thông tin một tác phẩm đã có
     * Phương thức: PUT /ArtGallery/:id
     * @param {string|number} id - ID tác phẩm cần cập nhật
     * @param {Object} data - Các trường cần cập nhật (không cần gửi toàn bộ)
     * @returns {Promise<Object>} Object tác phẩm sau khi cập nhật
     */
    updateArtwork: function (id, data) {
        return fetch(API_BASE + '/ArtGallery/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Lỗi cập nhật tác phẩm ' + id + ': ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.updateArtwork error:', error);
                throw error;
            });
    },

    /**
     * Xóa một tác phẩm theo ID
     * Phương thức: DELETE /ArtGallery/:id
     * @param {string|number} id - ID tác phẩm cần xóa
     * @returns {Promise<Object>} Object xác nhận từ server
     */
    deleteArtwork: function (id) {
        return fetch(API_BASE + '/ArtGallery/' + id, {
            method: 'DELETE'
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Lỗi xóa tác phẩm ' + id + ': ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.deleteArtwork error:', error);
                throw error;
            });
    },

    /**
     * Lấy danh sách nghệ sĩ (endpoint phụ)
     * Phương thức: GET /artists
     * @returns {Promise<Array>} Mảng các object nghệ sĩ
     */
    getArtists: function () {
        return fetch(API_BASE + '/artists')
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Lỗi tải danh sách nghệ sĩ: ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.getArtists error:', error);
                throw error;
            });
    }
};