/**
 * utils.js — ArtGallery
 * Các hàm tiện ích dùng chung
 */

/**
 * Hiển thị toast thông báo góc phải
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 */
function showToast(message, type = 'success') {
    const colors = {
        success: '#22c55e',
        error:   '#ef4444',
        warning: '#f59e0b',
        info:    '#3b82f6'
    };
    const icons = {
        success: 'bi-check-circle-fill',
        error:   'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info:    'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed; top:1.25rem; right:1.25rem; z-index:9999;
        background:#1e293b; color:#f1f5f9;
        border-left: 4px solid ${colors[type]};
        padding:.75rem 1.1rem; border-radius:10px;
        box-shadow:0 8px 24px rgba(0,0,0,.35);
        font-size:.88rem; font-family:'DM Sans',sans-serif;
        display:flex; align-items:center; gap:.6rem;
        max-width:320px; animation:slideInToast .3s ease;
    `;
    toast.innerHTML = `<i class="bi ${icons[type]}" style="color:${colors[type]};font-size:1rem;flex-shrink:0"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

/**
 * Format ngày ISO thành dd/mm/yyyy HH:MM
 */
function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Cắt ngắn chuỗi nếu quá dài
 */
function truncate(str, max = 40) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
}

/**
 * Escape HTML để tránh XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/**
 * Tạo slug từ chuỗi (dùng cho ID)
 */
function slugId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Debounce — delay gọi hàm
 */
function debounce(fn, delay = 300) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
    };
}
