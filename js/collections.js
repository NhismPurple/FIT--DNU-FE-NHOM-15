/**
 * collections.js — User Collections & Artwork Submission Manager
 * - CollectionManager: personal artwork folders stored in localStorage
 * - SubmissionManager: user artwork submission requests for admin review
 */

/* ══════════════════════════════════════
   COLLECTION MANAGER
══════════════════════════════════════ */
class CollectionManager {
    constructor() {
        this.storageKey = 'artgallery_collections';
    }

    /** Get all collections (object of { folderName: [artworkId, ...] }) for a user */
    getUserCollections(userId) {
        return this._getAll()[userId] || {};
    }

    /** Create a new named folder */
    createCollection(userId, name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return { success: false, message: 'Tên thư mục không được để trống' };
        const all = this._getAll();
        if (!all[userId]) all[userId] = {};
        if (all[userId][trimmed]) return { success: false, message: 'Thư mục "' + trimmed + '" đã tồn tại' };
        all[userId][trimmed] = [];
        this._save(all);
        return { success: true, message: 'Đã tạo thư mục "' + trimmed + '"' };
    }

    /** Add an artwork id to a collection folder */
    addToCollection(userId, folderName, artworkId) {
        const all = this._getAll();
        if (!all[userId]) all[userId] = {};
        if (!all[userId][folderName]) all[userId][folderName] = [];
        const folder = all[userId][folderName];
        const sid = String(artworkId);
        if (folder.includes(sid)) return { success: false, message: 'Tác phẩm đã có trong thư mục này' };
        folder.push(sid);
        this._save(all);
        return { success: true, message: 'Đã thêm vào "' + folderName + '"' };
    }

    /** Remove artwork from a collection */
    removeFromCollection(userId, folderName, artworkId) {
        const all = this._getAll();
        if (!all[userId] || !all[userId][folderName]) return { success: false };
        all[userId][folderName] = all[userId][folderName].filter(id => id !== String(artworkId));
        this._save(all);
        return { success: true };
    }

    /** Delete an entire folder */
    deleteCollection(userId, name) {
        const all = this._getAll();
        if (!all[userId] || !all[userId][name]) return { success: false };
        delete all[userId][name];
        this._save(all);
        return { success: true, message: 'Đã xóa thư mục "' + name + '"' };
    }

    /** True if artwork is saved in at least one folder */
    isInAnyCollection(userId, artworkId) {
        const cols = this.getUserCollections(userId);
        return Object.values(cols).some(ids => ids.includes(String(artworkId)));
    }

    /** True if artwork is in a specific folder */
    isInCollection(userId, folderName, artworkId) {
        const cols = this.getUserCollections(userId);
        return !!(cols[folderName] && cols[folderName].includes(String(artworkId)));
    }

    /** Total number of saved artworks across all folders (deduplicated) */
    getTotalSaved(userId) {
        const cols = this.getUserCollections(userId);
        const ids = new Set();
        Object.values(cols).forEach(arr => arr.forEach(id => ids.add(id)));
        return ids.size;
    }

    _getAll() {
        try { return JSON.parse(localStorage.getItem(this.storageKey)) || {}; } catch { return {}; }
    }
    _save(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
}


/* ══════════════════════════════════════
   SUBMISSION MANAGER
══════════════════════════════════════ */
class SubmissionManager {
    constructor() {
        this.storageKey = 'artgallery_submissions';
    }

    /**
     * Submit a new artwork request from a user
     * @param {Object} data - { title, artist, style, story, imageUrl, submittedBy }
     */
    submit(data) {
        if (!data.title || !data.artist || !data.imageUrl) {
            return { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' };
        }
        const all = this._getAll();
        const submission = {
            id: 'sub_' + Date.now(),
            title: data.title.trim(),
            artist: data.artist.trim(),
            style: data.style || 'Sơn dầu',
            story: (data.story || '').trim(),
            imageUrl: data.imageUrl.trim(),
            submittedBy: data.submittedBy || null, // { id, email, fullName }
            submittedAt: new Date().toISOString(),
            status: 'pending'   // pending | approved | rejected
        };
        all.push(submission);
        this._save(all);
        return { success: true, message: 'Đã gửi yêu cầu! Admin sẽ duyệt trong thời gian sớm nhất.', submission };
    }

    getAll() { return this._getAll(); }

    getPending() { return this._getAll().filter(s => s.status === 'pending'); }

    getByStatus(status) { return this._getAll().filter(s => s.status === status); }

    /** Update status: 'approved' | 'rejected' */
    updateStatus(id, status) {
        const all = this._getAll();
        const idx = all.findIndex(s => s.id === id);
        if (idx === -1) return { success: false, message: 'Không tìm thấy yêu cầu' };
        all[idx].status = status;
        all[idx].reviewedAt = new Date().toISOString();
        this._save(all);
        return { success: true, submission: all[idx] };
    }

    _getAll() {
        try { return JSON.parse(localStorage.getItem(this.storageKey)) || []; } catch { return []; }
    }
    _save(data) { localStorage.setItem(this.storageKey, JSON.stringify(data)); }
}

// Global instances
const collections = new CollectionManager();
const submissions = new SubmissionManager();