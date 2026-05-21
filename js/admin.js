/**
 * admin.js — Admin Panel Logic
 * Includes: Artwork CRUD, Statistics, and Submission Review
 */

var adminArtworks = [];
var editingId = null;

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    loadArtworks();
    setupFormHandler();
    setupCancelEdit();
    loadSubmissions();
    setupAdminTabs();
});

/* ══════════════════════════════════════
   TAB NAVIGATION
══════════════════════════════════════ */
function setupAdminTabs() {
    document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var tab = this.getAttribute('data-tab');
            switchAdminTab(tab);
        });
    });
}

function switchAdminTab(tab) {
    // Update sidebar active link
    document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(l => l.classList.remove('active'));
    var activeLink = document.querySelector('.sidebar-nav-link[data-tab="' + tab + '"]');
    if (activeLink) activeLink.classList.add('active');

    // Show/hide sections
    var artworksSection = document.getElementById('artworks-section');
    var submissionsSection = document.getElementById('submissions-section');

    if (tab === 'submissions') {
        if (artworksSection) artworksSection.style.display = 'none';
        if (submissionsSection) submissionsSection.style.display = 'block';
        loadSubmissions();
    } else {
        if (artworksSection) artworksSection.style.display = 'block';
        if (submissionsSection) submissionsSection.style.display = 'none';
    }
}

/* ══════════════════════════════════════
   ARTWORKS (existing CRUD)
══════════════════════════════════════ */
function loadArtworks() {
    showTableLoading(true);
    API.getArtworks()
        .then(function (data) {
            adminArtworks = data;
            renderTable(adminArtworks);
            updateStatistics(adminArtworks);
            showTableLoading(false);
        })
        .catch(function (error) {
            showTableLoading(false);
            showAdminAlert('Không thể tải dữ liệu. Vui lòng thử lại.', 'danger');
            console.error('loadArtworks error:', error);
        });
}

function renderTable(artworks) {
    var tbody = document.getElementById('artworks-tbody');
    if (!tbody) return;

    if (artworks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">' +
            '<i class="bi bi-inbox fs-3 d-block mb-2"></i>Chưa có tác phẩm nào</td></tr>';
        return;
    }

    var html = '';
    artworks.forEach(function (artwork) {
        var imgUrl = getImageUrl(artwork.imageUrl, artwork.id);
        var isApproved = artwork.status === 'approved' || artwork.approved === true;
        var statusText = isApproved ? 'approved' : 'pending';

        html += '<tr data-id="' + artwork.id + '">';
        html += '  <td><img src="' + imgUrl + '" class="table-thumbnail" alt="' + (artwork.title || '') + '" onerror="this.src=\'https://picsum.photos/seed/fallback' + artwork.id + '/100/100\'"></td>';
        html += '  <td class="fw-semibold">' + (artwork.title || 'N/A') + '</td>';
        html += '  <td>' + (artwork.artist || 'N/A') + '</td>';
        html += '  <td><span class="badge bg-secondary">' + (artwork.style || 'N/A') + '</span></td>';
        html += '  <td><i class="bi bi-heart-fill text-danger"></i> ' + (artwork.likes || 0) + '</td>';
        html += '  <td>';
        html += '    <button class="btn btn-sm approve-toggle ' + (isApproved ? 'btn-success' : 'btn-outline-secondary') + '" data-id="' + artwork.id + '" data-status="' + statusText + '">';
        html += '      <i class="bi ' + (isApproved ? 'bi-check-circle-fill' : 'bi-circle') + '"></i> ';
        html += '      ' + (isApproved ? 'Đã duyệt' : 'Chờ duyệt');
        html += '    </button>';
        html += '  </td>';
        html += '  <td>';
        html += '    <button class="btn btn-sm btn-outline-primary me-1 btn-edit" data-id="' + artwork.id + '" title="Chỉnh sửa"><i class="bi bi-pencil-fill"></i></button>';
        html += '    <button class="btn btn-sm btn-outline-danger btn-delete" data-id="' + artwork.id + '" title="Xóa"><i class="bi bi-trash-fill"></i></button>';
        html += '  </td>';
        html += '</tr>';
    });

    tbody.innerHTML = html;
    setupTableActions();
}

function setupTableActions() {
    document.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () { startEdit(this.getAttribute('data-id')); });
    });
    document.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () { deleteArtwork(this.getAttribute('data-id')); });
    });
    document.querySelectorAll('.approve-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            toggleApproval(this.getAttribute('data-id'), this.getAttribute('data-status'));
        });
    });
}

function setupFormHandler() {
    var form = document.getElementById('artwork-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearErrors();
        var formData = {
            title: document.getElementById('input-title').value,
            artist: document.getElementById('input-artist').value,
            style: document.getElementById('input-style').value,
            story: document.getElementById('input-story').value,
            imageUrl: document.getElementById('input-imageUrl').value,
            status: document.getElementById('input-approved').checked ? 'approved' : 'pending'
        };
        var validation = validateForm(formData);
        if (!validation.valid) {
            if (validation.errors.title) showInlineError('input-title', validation.errors.title);
            if (validation.errors.artist) showInlineError('input-artist', validation.errors.artist);
            if (validation.errors.imageUrl) showInlineError('input-imageUrl', validation.errors.imageUrl);
            return;
        }
        setSubmitLoading(true);
        if (editingId) {
            updateArtwork(editingId, formData);
        } else {
            formData.likes = 0;
            addArtwork(formData);
        }
    });
}

function setupCancelEdit() {
    var cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) cancelBtn.addEventListener('click', resetForm);
}

function addArtwork(data) {
    API.createArtwork(data)
        .then(function (created) {
            showAdminAlert('Đã thêm tác phẩm "' + created.title + '" thành công!', 'success');
            resetForm();
            loadArtworks();
        })
        .catch(function () { showAdminAlert('Lỗi khi thêm tác phẩm.', 'danger'); })
        .finally(function () { setSubmitLoading(false); });
}

function updateArtwork(id, data) {
    API.updateArtwork(id, data)
        .then(function (updated) {
            showAdminAlert('Đã cập nhật "' + updated.title + '" thành công!', 'success');
            resetForm();
            loadArtworks();
        })
        .catch(function () { showAdminAlert('Lỗi khi cập nhật.', 'danger'); })
        .finally(function () { setSubmitLoading(false); });
}

function deleteArtwork(id) {
    var artwork = adminArtworks.find(a => String(a.id) === String(id));
    var title = artwork ? artwork.title : 'tác phẩm này';
    if (!confirm('Bạn có chắc muốn xóa "' + title + '"?')) return;

    var row = document.querySelector('tr[data-id="' + id + '"]');
    if (row) row.classList.add('fade-out');

    API.deleteArtwork(id)
        .then(function () {
            showAdminAlert('Đã xóa tác phẩm thành công!', 'success');
            adminArtworks = adminArtworks.filter(a => String(a.id) !== String(id));
            renderTable(adminArtworks);
            updateStatistics(adminArtworks);
            if (String(editingId) === String(id)) resetForm();
        })
        .catch(function () {
            if (row) row.classList.remove('fade-out');
            showAdminAlert('Lỗi khi xóa tác phẩm.', 'danger');
        });
}

function toggleApproval(id, currentStatus) {
    var newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    API.updateArtwork(id, { status: newStatus })
        .then(function () { showAdminAlert('Đã cập nhật trạng thái!', 'info'); loadArtworks(); })
        .catch(function () { showAdminAlert('Lỗi khi cập nhật.', 'danger'); });
}

function startEdit(id) {
    var artwork = adminArtworks.find(a => String(a.id) === String(id));
    if (!artwork) return;
    editingId = id;

    document.getElementById('input-title').value = artwork.title || '';
    document.getElementById('input-artist').value = artwork.artist || '';
    document.getElementById('input-style').value = artwork.style || 'Sơn dầu';
    document.getElementById('input-story').value = artwork.story || '';
    document.getElementById('input-imageUrl').value = artwork.imageUrl || '';
    document.getElementById('input-approved').checked = (artwork.status === 'approved' || artwork.approved === true);

    document.getElementById('form-title').innerHTML = '<i class="bi bi-pencil-square text-warning"></i> Chỉnh sửa tác phẩm';
    document.getElementById('btn-submit').innerHTML = '<i class="bi bi-save me-1"></i> Cập nhật';
    document.getElementById('btn-cancel-edit').classList.remove('btn-cancel-edit-hidden');
    document.getElementById('artwork-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
    editingId = null;
    document.getElementById('artwork-form').reset();
    document.getElementById('form-title').innerHTML = '<i class="bi bi-plus-circle text-primary"></i> Thêm tác phẩm mới';
    document.getElementById('btn-submit').innerHTML = '<i class="bi bi-plus-circle me-1"></i> Thêm tác phẩm';
    document.getElementById('btn-cancel-edit').classList.add('btn-cancel-edit-hidden');
    clearErrors();
    setSubmitLoading(false);
}

/* ══════════════════════════════════════
   SUBMISSIONS
══════════════════════════════════════ */
function loadSubmissions() {
    var allSubs = submissions.getAll();
    renderSubmissionsTable(allSubs);
    updateSubmissionBadge(submissions.getPending().length);
}

function renderSubmissionsTable(subs) {
    var tbody = document.getElementById('submissions-tbody');
    if (!tbody) return;

    if (subs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">' +
            '<i class="bi bi-inbox fs-3 d-block mb-2"></i>Chưa có yêu cầu nào</td></tr>';
        return;
    }

    var html = '';
    subs.forEach(function (sub) {
        var imgUrl = getImageUrl(sub.imageUrl, sub.id);
        var date = new Date(sub.submittedAt).toLocaleDateString('vi-VN');
        var statusClass = { pending: 'warning', approved: 'success', rejected: 'danger' }[sub.status] || 'secondary';
        var statusLabel = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }[sub.status] || sub.status;

        html += '<tr>';
        html += '<td><img src="' + imgUrl + '" class="table-thumbnail" alt="" onerror="this.src=\'https://picsum.photos/seed/sub' + sub.id + '/80/80\'"></td>';
        html += '<td class="fw-semibold">' + (sub.title || 'N/A') + '</td>';
        html += '<td>' + (sub.artist || 'N/A') + '</td>';
        html += '<td><span class="badge bg-secondary">' + (sub.style || '') + '</span></td>';
        html += '<td><small>' + (sub.submittedBy ? sub.submittedBy.fullName + '<br><span class="text-muted">' + sub.submittedBy.email + '</span>' : 'Ẩn danh') + '</small></td>';
        html += '<td><small>' + date + '</small></td>';
        html += '<td><span class="badge bg-' + statusClass + '">' + statusLabel + '</span></td>';
        html += '<td>';
        if (sub.status === 'pending') {
            html += '<button class="btn btn-sm btn-success me-1" onclick="approveSubmission(\'' + sub.id + '\')" title="Duyệt">' +
                '<i class="bi bi-check-lg"></i> Duyệt</button>';
            html += '<button class="btn btn-sm btn-outline-danger" onclick="rejectSubmission(\'' + sub.id + '\')" title="Từ chối">' +
                '<i class="bi bi-x-lg"></i> Từ chối</button>';
        } else if (sub.status === 'approved') {
            html += '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Đã duyệt</span>';
        } else {
            html += '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Đã từ chối</span>';
        }
        html += '</td>';
        html += '</tr>';
    });
    tbody.innerHTML = html;
}

function approveSubmission(id) {
    var sub = submissions.getAll().find(s => s.id === id);
    if (!sub) return;

    if (!confirm('Duyệt và thêm tác phẩm "' + sub.title + '" vào gallery?')) return;

    // Create artwork via API
    var artworkData = {
        title: sub.title,
        artist: sub.artist,
        style: sub.style,
        story: sub.story,
        imageUrl: sub.imageUrl,
        likes: 0,
        status: 'approved'
    };

    API.createArtwork(artworkData)
        .then(function (created) {
            submissions.updateStatus(id, 'approved');
            showAdminAlert('Đã duyệt và thêm "' + created.title + '" vào gallery!', 'success');
            loadSubmissions();
            loadArtworks(); // Refresh artworks table too
        })
        .catch(function () {
            showAdminAlert('Lỗi khi thêm tác phẩm vào gallery. Thử lại.', 'danger');
        });
}

function rejectSubmission(id) {
    var sub = submissions.getAll().find(s => s.id === id);
    if (!sub) return;
    if (!confirm('Từ chối yêu cầu "' + sub.title + '"?')) return;

    submissions.updateStatus(id, 'rejected');
    showAdminAlert('Đã từ chối yêu cầu "' + sub.title + '"', 'warning');
    loadSubmissions();
}

function filterSubmissions(status) {
    var all = submissions.getAll();
    var filtered = status === 'all' ? all : submissions.getByStatus(status);
    renderSubmissionsTable(filtered);

    // Update filter button active state
    document.querySelectorAll('.sub-filter-btn').forEach(btn => btn.classList.remove('active'));
    var activeBtn = document.querySelector('.sub-filter-btn[data-status="' + status + '"]');
    if (activeBtn) activeBtn.classList.add('active');
}

function updateSubmissionBadge(count) {
    var badge = document.getElementById('submissions-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/* ══════════════════════════════════════
   STATISTICS
══════════════════════════════════════ */
function updateStatistics(artworks) {
    var total = artworks.length;
    var approved = artworks.filter(a => a.status === 'approved' || a.approved === true).length;
    var pending = total - approved;
    var totalLikes = artworks.reduce((sum, a) => sum + (a.likes || 0), 0);
    var pendingSubs = submissions.getPending().length;

    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-total', total);
    set('stat-approved', approved);
    set('stat-pending', pending);
    set('stat-likes', totalLikes.toLocaleString());
    set('stat-submissions', pendingSubs);
}

/* ══════════════════════════════════════
   UI HELPERS
══════════════════════════════════════ */
function setSubmitLoading(loading) {
    var btn = document.getElementById('btn-submit');
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.setAttribute('data-original-text', btn.innerHTML);
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang xử lý...';
    } else {
        btn.disabled = false;
        var orig = btn.getAttribute('data-original-text');
        if (orig) btn.innerHTML = orig;
    }
}

function showTableLoading(show) {
    var loader = document.getElementById('table-loading');
    var tableContainer = document.getElementById('table-container');
    if (loader) loader.style.display = show ? 'block' : 'none';
    if (tableContainer) tableContainer.classList.toggle('table-container-hidden', show);
}

function showAdminAlert(message, type) {
    var container = document.getElementById('admin-alerts');
    if (!container) return;
    var alertEl = document.createElement('div');
    alertEl.className = 'alert alert-' + type + ' alert-dismissible fade show admin-alert';
    alertEl.setAttribute('role', 'alert');
    alertEl.innerHTML = '<i class="bi ' + getAlertIcon(type) + ' me-2"></i>' + message +
        '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
    container.appendChild(alertEl);
    setTimeout(function () {
        if (alertEl && alertEl.parentElement) {
            alertEl.classList.remove('show');
            setTimeout(function () { if (alertEl.parentElement) alertEl.remove(); }, 300);
        }
    }, 4000);
}

function getAlertIcon(type) {
    var map = { success: 'bi-check-circle-fill', danger: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill', warning: 'bi-exclamation-circle-fill' };
    return map[type] || 'bi-info-circle-fill';
}