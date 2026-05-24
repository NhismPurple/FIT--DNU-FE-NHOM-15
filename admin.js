/**
 * admin.js — ArtGallery
 * Logic cho trang quản trị (admin.html)
 * Tính năng:
 *  - CRUD tác phẩm (MockAPI)
 *  - Xét duyệt yêu cầu đăng tác phẩm từ người dùng (localStorage)
 */

/* ── State ── */
let adminArtworks    = [];
let editingId        = null;
let allSubmissions   = [];
let currentSubFilter = 'all';

/* ══════════════════════════════════
   Khởi tạo
══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    setupSidebarTabs();
    loadAdminArtworks();
    loadSubmissions();
    setInterval(loadSubmissions, 30000); // Tự refresh submissions mỗi 30s
});

/* ══════════════════════════════════
   Sidebar tab switching
══════════════════════════════════ */
function setupSidebarTabs() {
    document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            switchAdminTab(this.dataset.tab);
        });
    });
}

function switchAdminTab(tab) {
    const artworksSec    = document.getElementById('artworks-section');
    const submissionsSec = document.getElementById('submissions-section');
    const titleEl        = document.getElementById('admin-page-title');

    if (tab === 'submissions') {
        if (artworksSec)    artworksSec.style.display    = 'none';
        if (submissionsSec) submissionsSec.style.display = 'block';
        if (titleEl) titleEl.innerHTML = '<i class="bi bi-inbox me-2"></i> Yêu cầu duyệt tác phẩm';
        renderSubmissionsTable();
    } else {
        if (artworksSec)    artworksSec.style.display    = 'block';
        if (submissionsSec) submissionsSec.style.display = 'none';
        if (titleEl) titleEl.innerHTML = '<i class="bi bi-speedometer2 me-2"></i> Dashboard';
    }

    document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(l => l.classList.remove('active'));
    const active = document.querySelector(`.sidebar-nav-link[data-tab="${tab}"]`);
    if (active) active.classList.add('active');
}

/* ══════════════════════════════════
   Alert helpers
══════════════════════════════════ */
function showAdminAlert(msg, type = 'success') {
    const container = document.getElementById('admin-alerts');
    if (!container) return;
    const id = 'alert-' + Date.now();
    const icons = { success: 'check-circle-fill', danger: 'x-circle-fill', warning: 'exclamation-triangle-fill', info: 'info-circle-fill' };
    const div = document.createElement('div');
    div.id = id;
    div.className = `alert alert-${type} alert-dismissible fade show`;
    div.innerHTML = `<i class="bi bi-${icons[type] || 'info-circle-fill'} me-2"></i>${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.prepend(div);
    setTimeout(() => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }
    }, 4000);
}

/* ══════════════════════════════════
   Load & render artworks
══════════════════════════════════ */
async function loadAdminArtworks() {
    const tblLoading  = document.getElementById('table-loading');
    const tblContainer= document.getElementById('table-container');
    if (tblLoading)   tblLoading.style.display   = 'flex';
    if (tblContainer) tblContainer.style.display = 'none';

    try {
        adminArtworks = await api.getAll();
        renderArtworksTable();
        updateStats();
    } catch(err) {
        showAdminAlert('Không thể tải danh sách tác phẩm: ' + err.message, 'danger');
    } finally {
        if (tblLoading)   tblLoading.style.display   = 'none';
        if (tblContainer) tblContainer.className     = '';
    }
}

function renderArtworksTable() {
    const tbody = document.getElementById('artworks-tbody');
    if (!tbody) return;

    if (adminArtworks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Chưa có tác phẩm nào</td></tr>`;
        return;
    }

    tbody.innerHTML = adminArtworks.map(a => `
        <tr>
            <td><img src="${escapeHtml(a.imageUrl || '')}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px"
                     onerror="this.src='https://via.placeholder.com/52?text=?'"></td>
            <td style="max-width:180px">${escapeHtml(truncate(a.title || '', 30))}</td>
            <td>${escapeHtml(a.artist || '')}</td>
            <td><span class="badge" style="background:#e0e7ff;color:#3730a3;font-weight:600">${escapeHtml(a.style || '')}</span></td>
            <td><i class="bi bi-heart-fill text-danger me-1"></i>${a.likes || 0}</td>
            <td>
                ${(a.approved === true || a.approved === 'true' || a.approved === undefined)
                    ? `<span class="badge bg-success">Đã duyệt</span>`
                    : `<span class="badge bg-warning text-dark">Ẩn</span>`}
            </td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary" onclick="startEdit('${a.id}')" title="Sửa">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="toggleApprove('${a.id}')" title="Duyệt/Ẩn">
                        <i class="bi bi-toggle-on"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteArtwork('${a.id}')" title="Xóa">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    const total    = adminArtworks.length;
    const approved = adminArtworks.filter(a => a.approved !== false && a.approved !== 'false').length;
    const pending  = adminArtworks.filter(a => a.approved === false || a.approved === 'false').length;
    const likes    = adminArtworks.reduce((sum, a) => sum + (parseInt(a.likes) || 0), 0);
    const subs     = allSubmissions.filter(s => s.status === 'pending').length;

    setText('stat-total',    total);
    setText('stat-approved', approved);
    setText('stat-pending',  pending);
    setText('stat-likes',    likes);
    setText('stat-submissions', subs);

    // Badge sidebar
    const badge = document.getElementById('submissions-badge');
    if (badge) {
        badge.textContent = subs;
        badge.style.display = subs > 0 ? 'inline-flex' : 'none';
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

/* ══════════════════════════════════
   Form thêm / sửa tác phẩm
══════════════════════════════════ */
const artworkForm = document.getElementById('artwork-form');
if (artworkForm) {
    artworkForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveArtwork();
    });
}

document.getElementById('btn-cancel-edit')?.addEventListener('click', cancelEdit);

async function saveArtwork() {
    const title    = document.getElementById('input-title').value.trim();
    const artist   = document.getElementById('input-artist').value.trim();
    const style    = document.getElementById('input-style').value;
    const story    = document.getElementById('input-story').value.trim();
    const imageUrl = document.getElementById('input-imageUrl').value.trim();
    const approved = document.getElementById('input-approved').checked;

    if (!title || !artist || !imageUrl) {
        showAdminAlert('Vui lòng điền đầy đủ các trường bắt buộc', 'warning');
        return;
    }

    const data = { title, artist, style, story, imageUrl, approved, likes: 0 };
    const btn  = document.getElementById('btn-submit');
    btn.disabled = true;

    try {
        if (editingId) {
            const existing = adminArtworks.find(a => a.id == editingId);
            data.likes = existing ? (existing.likes || 0) : 0;
            await api.update(editingId, data);
            showAdminAlert('Đã cập nhật tác phẩm thành công!', 'success');
        } else {
            await api.create(data);
            showAdminAlert('Đã thêm tác phẩm mới thành công!', 'success');
        }
        cancelEdit();
        await loadAdminArtworks();
    } catch(err) {
        showAdminAlert('Lỗi: ' + err.message, 'danger');
    } finally {
        btn.disabled = false;
    }
}

function startEdit(id) {
    const a = adminArtworks.find(a => a.id == id);
    if (!a) return;
    editingId = id;

    document.getElementById('input-title').value    = a.title    || '';
    document.getElementById('input-artist').value   = a.artist   || '';
    document.getElementById('input-style').value    = a.style    || 'Sơn dầu';
    document.getElementById('input-story').value    = a.story    || '';
    document.getElementById('input-imageUrl').value = a.imageUrl || '';
    document.getElementById('input-approved').checked = a.approved !== false && a.approved !== 'false';

    document.getElementById('form-title').innerHTML = `<i class="bi bi-pencil text-warning"></i> Sửa tác phẩm`;
    document.getElementById('btn-submit').innerHTML = `<i class="bi bi-save me-1"></i> Lưu thay đổi`;
    document.getElementById('btn-cancel-edit').style.display = 'inline-flex';

    document.getElementById('form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() {
    editingId = null;
    document.getElementById('artwork-form').reset();
    document.getElementById('input-approved').checked = true;
    document.getElementById('form-title').innerHTML = `<i class="bi bi-plus-circle text-primary"></i> Thêm tác phẩm mới`;
    document.getElementById('btn-submit').innerHTML = `<i class="bi bi-plus-circle me-1"></i> Thêm tác phẩm`;
    document.getElementById('btn-cancel-edit').style.display = 'none';
}

async function toggleApprove(id) {
    const a = adminArtworks.find(a => a.id == id);
    if (!a) return;
    const newApproved = !(a.approved !== false && a.approved !== 'false');
    try {
        await api.update(id, { ...a, approved: newApproved });
        showAdminAlert(newApproved ? 'Đã duyệt tác phẩm' : 'Đã ẩn tác phẩm', 'info');
        await loadAdminArtworks();
    } catch(err) {
        showAdminAlert('Lỗi: ' + err.message, 'danger');
    }
}

async function deleteArtwork(id) {
    const a = adminArtworks.find(a => a.id == id);
    if (!confirm(`Xóa tác phẩm "${a?.title || id}"? Hành động này không thể hoàn tác.`)) return;
    try {
        await api.delete(id);
        showAdminAlert('Đã xóa tác phẩm', 'success');
        await loadAdminArtworks();
    } catch(err) {
        showAdminAlert('Lỗi: ' + err.message, 'danger');
    }
}

/* ══════════════════════════════════
   Submissions — Yêu cầu đăng tác phẩm
══════════════════════════════════ */
function loadSubmissions() {
    allSubmissions = JSON.parse(localStorage.getItem('artgallery_submissions') || '[]');
    updateStats();
    renderSubmissionsTable();
}

function filterSubmissions(status) {
    currentSubFilter = status;
    document.querySelectorAll('.sub-filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.status === status);
    });
    renderSubmissionsTable();
}

function renderSubmissionsTable() {
    const tbody = document.getElementById('submissions-tbody');
    if (!tbody) return;

    let list = allSubmissions;
    if (currentSubFilter !== 'all') {
        list = list.filter(s => s.status === currentSubFilter);
    }

    const pendingCount = allSubmissions.filter(s => s.status === 'pending').length;
    const label = document.getElementById('pending-count-label');
    if (label) label.textContent = pendingCount > 0 ? `(${pendingCount} chờ duyệt)` : '';

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5">
            <i class="bi bi-inbox fs-3 d-block mb-2"></i>
            ${currentSubFilter === 'all' ? 'Chưa có yêu cầu nào' : `Không có yêu cầu "${currentSubFilter}"`}
        </td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(s => {
        const statusBadge = {
            pending:  `<span class="badge bg-warning text-dark"><i class="bi bi-hourglass me-1"></i>Chờ duyệt</span>`,
            approved: `<span class="badge bg-success"><i class="bi bi-check2 me-1"></i>Đã duyệt</span>`,
            rejected: `<span class="badge bg-danger"><i class="bi bi-x me-1"></i>Từ chối</span>`
        }[s.status] || `<span class="badge bg-secondary">${s.status}</span>`;

        const actions = s.status === 'pending' ? `
            <button class="btn btn-sm btn-success" onclick="approveSubmission('${s.id}')" title="Duyệt">
                <i class="bi bi-check-lg me-1"></i> Duyệt
            </button>
            <button class="btn btn-sm btn-danger ms-1" onclick="rejectSubmission('${s.id}')" title="Từ chối">
                <i class="bi bi-x-lg me-1"></i> Từ chối
            </button>` :
            `<button class="btn btn-sm btn-outline-secondary" onclick="deleteSubmission('${s.id}')">
                <i class="bi bi-trash"></i>
            </button>`;

        return `<tr>
            <td><img src="${escapeHtml(s.imageUrl || '')}" class="sub-thumbnail"
                     onerror="this.src='https://via.placeholder.com/52?text=?'" alt=""></td>
            <td style="max-width:150px"><strong>${escapeHtml(truncate(s.title || '', 25))}</strong></td>
            <td>${escapeHtml(s.artist || '')}</td>
            <td><span class="badge" style="background:#e0e7ff;color:#3730a3">${escapeHtml(s.style || '')}</span></td>
            <td style="font-size:.8rem;color:#64748b">${escapeHtml(s.submittedBy || '—')}</td>
            <td style="font-size:.8rem;color:#64748b;white-space:nowrap">${formatDate(s.submittedAt)}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="d-flex gap-1 flex-wrap">${actions}</div>
            </td>
        </tr>`;
    }).join('');
}

async function approveSubmission(subId) {
    const sub = allSubmissions.find(s => s.id === subId);
    if (!sub) return;
    if (!confirm(`Duyệt tác phẩm "${sub.title}" và đăng lên gallery?`)) return;

    try {
        // Đăng lên MockAPI
        await api.create({
            title:    sub.title,
            artist:   sub.artist,
            style:    sub.style,
            story:    sub.story,
            imageUrl: sub.imageUrl,
            approved: true,
            likes:    0
        });

        // Cập nhật trạng thái trong localStorage
        sub.status = 'approved';
        localStorage.setItem('artgallery_submissions', JSON.stringify(allSubmissions));
        loadSubmissions();
        await loadAdminArtworks();
        showAdminAlert(`Đã duyệt và đăng tác phẩm "${sub.title}" lên gallery! 🎨`, 'success');
    } catch(err) {
        showAdminAlert('Lỗi khi duyệt: ' + err.message, 'danger');
    }
}

function rejectSubmission(subId) {
    const sub = allSubmissions.find(s => s.id === subId);
    if (!sub) return;
    const reason = prompt(`Lý do từ chối tác phẩm "${sub.title}" (tùy chọn):`);
    if (reason === null) return; // Người dùng bấm Cancel

    sub.status = 'rejected';
    sub.rejectReason = reason;
    localStorage.setItem('artgallery_submissions', JSON.stringify(allSubmissions));
    loadSubmissions();
    showAdminAlert(`Đã từ chối tác phẩm "${sub.title}"`, 'warning');
}

function deleteSubmission(subId) {
    if (!confirm('Xóa yêu cầu này khỏi danh sách?')) return;
    allSubmissions = allSubmissions.filter(s => s.id !== subId);
    localStorage.setItem('artgallery_submissions', JSON.stringify(allSubmissions));
    loadSubmissions();
    showAdminAlert('Đã xóa yêu cầu', 'info');
}
