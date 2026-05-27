/**
 * collections.js — Quản lý Bộ Sưu Tập & Yêu Cầu Đăng Tác Phẩm
 *
 * CollectionManager  : Cho phép người dùng tạo thư mục cá nhân và lưu tác phẩm yêu thích
 * SubmissionManager  : Cho phép người dùng gửi yêu cầu đăng tác phẩm để admin duyệt
 *
 * Tất cả dữ liệu lưu trong localStorage (phù hợp demo front-end)
 */

/* ══════════════════════════════════════
   COLLECTION MANAGER — Bộ sưu tập cá nhân
══════════════════════════════════════ */
class CollectionManager {
    constructor() {
        // Key dùng để lưu toàn bộ dữ liệu collections vào localStorage
        this.storageKey = 'artgallery_collections';
    }

    /**
     * Lấy tất cả thư mục của một người dùng
     * Cấu trúc dữ liệu trả về: { "Yêu thích": ["1","3","7"], "Cần xem": ["2"] }
     *
     * @param {string} userId - ID người dùng hiện tại
     * @returns {Object} Object các thư mục { folderName: [artworkId, ...] }
     */
    getUserCollections(userId) {
        // Lấy toàn bộ data, rồi trích phần của userId cụ thể
        // Nếu user chưa có thư mục nào → trả về {} tránh lỗi undefined
        return this._getAll()[userId] || {};
    }

    /**
     * Tạo thư mục mới cho người dùng
     *
     * @param {string} userId - ID người dùng
     * @param {string} name   - Tên thư mục mới (không được để trống hoặc trùng)
     * @returns {{ success: boolean, message: string }}
     */
    createCollection(userId, name) {
        const trimmed = (name || '').trim();

        // Không cho phép tên rỗng hoặc chỉ toàn khoảng trắng
        if (!trimmed) return { success: false, message: 'Tên thư mục không được để trống' };

        const all = this._getAll();

        // Khởi tạo object rỗng cho user nếu chưa có dữ liệu
        if (!all[userId]) all[userId] = {};

        // Kiểm tra trùng tên — mỗi user không được có 2 thư mục cùng tên
        if (all[userId][trimmed]) {
            return { success: false, message: 'Thư mục "' + trimmed + '" đã tồn tại' };
        }

        // Tạo thư mục mới với mảng ID rỗng
        all[userId][trimmed] = [];
        this._save(all);
        return { success: true, message: 'Đã tạo thư mục "' + trimmed + '"' };
    }

    /**
     * Thêm một tác phẩm vào thư mục
     *
     * @param {string}       userId     - ID người dùng
     * @param {string}       folderName - Tên thư mục đích
     * @param {string|number} artworkId - ID tác phẩm cần thêm
     * @returns {{ success: boolean, message: string }}
     */
    addToCollection(userId, folderName, artworkId) {
        const all = this._getAll();

        // Đảm bảo user và folder tồn tại trước khi thêm
        if (!all[userId]) all[userId] = {};
        if (!all[userId][folderName]) all[userId][folderName] = [];

        const folder = all[userId][folderName];
        const sid    = String(artworkId); // Đồng nhất kiểu dữ liệu về string để so sánh

        // Tránh thêm trùng tác phẩm vào cùng một thư mục
        if (folder.includes(sid)) {
            return { success: false, message: 'Tác phẩm đã có trong thư mục này' };
        }

        folder.push(sid);
        this._save(all);
        return { success: true, message: 'Đã thêm vào "' + folderName + '"' };
    }

    /**
     * Xóa một tác phẩm khỏi thư mục (tác phẩm vẫn còn trong gallery)
     *
     * @param {string}       userId     - ID người dùng
     * @param {string}       folderName - Tên thư mục
     * @param {string|number} artworkId - ID tác phẩm cần xóa khỏi thư mục
     * @returns {{ success: boolean }}
     */
    removeFromCollection(userId, folderName, artworkId) {
        const all = this._getAll();

        // Không làm gì nếu user hoặc folder không tồn tại
        if (!all[userId] || !all[userId][folderName]) return { success: false };

        // Lọc bỏ artworkId khỏi mảng (tạo mảng mới không chứa ID đó)
        all[userId][folderName] = all[userId][folderName]
            .filter(id => id !== String(artworkId));

        this._save(all);
        return { success: true };
    }

    /**
     * Xóa hoàn toàn một thư mục (cùng toàn bộ tác phẩm đã lưu trong đó)
     *
     * @param {string} userId - ID người dùng
     * @param {string} name   - Tên thư mục cần xóa
     * @returns {{ success: boolean, message?: string }}
     */
    deleteCollection(userId, name) {
        const all = this._getAll();

        // Không làm gì nếu thư mục không tồn tại
        if (!all[userId] || !all[userId][name]) return { success: false };

        // Xóa key thư mục khỏi object của user
        delete all[userId][name];
        this._save(all);
        return { success: true, message: 'Đã xóa thư mục "' + name + '"' };
    }

    /**
     * Kiểm tra xem tác phẩm có được lưu trong ít nhất một thư mục nào không
     * Dùng để hiển thị icon bookmark đã tô màu trên card gallery
     *
     * @param {string}       userId    - ID người dùng
     * @param {string|number} artworkId - ID tác phẩm
     * @returns {boolean}
     */
    isInAnyCollection(userId, artworkId) {
        const cols = this.getUserCollections(userId);
        // Object.values lấy mảng các mảng ID, .some kiểm tra ít nhất 1 thư mục chứa
        return Object.values(cols).some(ids => ids.includes(String(artworkId)));
    }

    /**
     * Kiểm tra tác phẩm có trong thư mục cụ thể không
     * Dùng trong collection picker để hiển thị trạng thái từng thư mục
     *
     * @param {string}       userId     - ID người dùng
     * @param {string}       folderName - Tên thư mục
     * @param {string|number} artworkId - ID tác phẩm
     * @returns {boolean}
     */
    isInCollection(userId, folderName, artworkId) {
        const cols = this.getUserCollections(userId);
        return !!(cols[folderName] && cols[folderName].includes(String(artworkId)));
    }

    /**
     * Đếm tổng số tác phẩm duy nhất đã lưu (không đếm trùng nếu ở nhiều thư mục)
     * Dùng để hiển thị badge tổng số trên modal bộ sưu tập
     *
     * @param {string} userId - ID người dùng
     * @returns {number}
     */
    getTotalSaved(userId) {
        const cols = this.getUserCollections(userId);
        const ids  = new Set(); // Set tự loại bỏ trùng lặp
        Object.values(cols).forEach(arr => arr.forEach(id => ids.add(id)));
        return ids.size;
    }

    // ─── PRIVATE: Đọc/ghi localStorage ───────────────────────

    /** @private Đọc toàn bộ dữ liệu collections từ localStorage */
    _getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || {};
        } catch {
            // JSON bị lỗi (hiếm gặp) → trả về object rỗng thay vì crash
            return {};
        }
    }

    /** @private Ghi toàn bộ dữ liệu collections vào localStorage */
    _save(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
}


/* ══════════════════════════════════════
   SUBMISSION MANAGER — Yêu cầu đăng tác phẩm
══════════════════════════════════════ */
class SubmissionManager {
    constructor() {
        // Key riêng để lưu danh sách yêu cầu trong localStorage
        this.storageKey = 'artgallery_submissions';
    }

    /**
     * Gửi yêu cầu đăng tác phẩm mới (từ người dùng đã đăng nhập)
     * Trạng thái ban đầu: 'pending' (chờ admin duyệt)
     *
     * @param {Object} data - Thông tin tác phẩm:
     *   { title, artist, style, story, imageUrl, submittedBy }
     *   submittedBy: { id, email, fullName } của người gửi
     * @returns {{ success: boolean, message: string, submission?: Object }}
     */
    submit(data) {
        // Các trường bắt buộc: tiêu đề, nghệ sĩ, URL ảnh
        if (!data.title || !data.artist || !data.imageUrl) {
            return { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' };
        }

        const all = this._getAll();

        // Tạo object yêu cầu với ID duy nhất dựa trên timestamp
        const submission = {
            id:          'sub_' + Date.now(),
            title:       data.title.trim(),
            artist:      data.artist.trim(),
            style:       data.style || 'Sơn dầu',
            story:       (data.story || '').trim(),
            imageUrl:    data.imageUrl.trim(),
            submittedBy: data.submittedBy || null, // Thông tin người gửi (có thể null nếu ẩn danh)
            submittedAt: new Date().toISOString(),
            status:      'pending'  // Trạng thái: pending | approved | rejected
        };

        all.push(submission);
        this._save(all);
        return {
            success: true,
            message: 'Đã gửi yêu cầu! Admin sẽ duyệt trong thời gian sớm nhất.',
            submission
        };
    }

    /** @returns {Array} Toàn bộ yêu cầu (mọi trạng thái) */
    getAll() { return this._getAll(); }

    /** @returns {Array} Chỉ các yêu cầu đang chờ duyệt */
    getPending() { return this._getAll().filter(s => s.status === 'pending'); }

    /**
     * Lọc yêu cầu theo trạng thái
     * @param {string} status - 'pending' | 'approved' | 'rejected'
     * @returns {Array}
     */
    getByStatus(status) { return this._getAll().filter(s => s.status === status); }

    /**
     * Admin cập nhật trạng thái yêu cầu (duyệt hoặc từ chối)
     *
     * @param {string} id     - ID yêu cầu cần cập nhật
     * @param {string} status - Trạng thái mới: 'approved' | 'rejected'
     * @returns {{ success: boolean, submission?: Object, message?: string }}
     */
    updateStatus(id, status) {
        const all = this._getAll();
        const idx = all.findIndex(s => s.id === id);

        // Không tìm thấy yêu cầu theo ID
        if (idx === -1) return { success: false, message: 'Không tìm thấy yêu cầu' };

        // Cập nhật trạng thái và ghi thêm thời điểm duyệt
        all[idx].status     = status;
        all[idx].reviewedAt = new Date().toISOString();
        this._save(all);

        return { success: true, submission: all[idx] };
    }

    // ─── PRIVATE ─────────────────────────────────────────────

    /** @private */
    _getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || [];
        } catch {
            return [];
        }
    }

    /** @private */
    _save(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
}

// Tạo instance toàn cục để dùng chung ở mọi trang
const collections = new CollectionManager();
const submissions  = new SubmissionManager();