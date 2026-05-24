/**
 * api.js — ArtGallery
 * Tất cả các lời gọi tới MockAPI
 */

const API_BASE = 'https://69fa35c8c509a40d3aa4125a.mockapi.io/api/v1/ArtGallery';

const api = {
    /** Lấy tất cả tác phẩm */
    async getAll() {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error('Không thể tải danh sách tác phẩm');
        return res.json();
    },

    /** Lấy một tác phẩm theo id */
    async getById(id) {
        const res = await fetch(`${API_BASE}/${id}`);
        if (!res.ok) throw new Error('Không tìm thấy tác phẩm');
        return res.json();
    },

    /** Thêm tác phẩm mới */
    async create(data) {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Không thể thêm tác phẩm');
        return res.json();
    },

    /** Cập nhật tác phẩm */
    async update(id, data) {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Không thể cập nhật tác phẩm');
        return res.json();
    },

    /** Xóa tác phẩm */
    async delete(id) {
        const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Không thể xóa tác phẩm');
        return res.json();
    }
};
