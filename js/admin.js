/**
 * admin.js — Logic for admin.html (Admin Panel)
 * Artwork CRUD operations, table rendering, form handling, statistics
 */

var adminArtworks = [];
var editingId = null; // Track if we're editing an artwork

/**
 * Initialize the admin panel
 */
document.addEventListener('DOMContentLoaded', function () {
    loadArtworks();
    setupFormHandler();
    setupCancelEdit();
});

/**
 * Load all artworks from API and render table + stats
 */
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

/**
 * Render the artworks table
 * @param {Array} artworks - Array of artwork objects
 */
function renderTable(artworks) {
    var tbody = document.getElementById('artworks-tbody');
    if (!tbody) return;

    if (artworks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">' +
            '<i class="bi bi-inbox fs-3 d-block mb-2"></i>Chưa có tác phẩm nào</td></tr>';
        return;
    }

    var html = '';
    for (var i = 0; i < artworks.length; i++) {
        var artwork = artworks[i];
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
        html += '    <button class="btn btn-sm btn-outline-primary me-1 btn-edit" data-id="' + artwork.id + '" title="Chỉnh sửa">';
        html += '      <i class="bi bi-pencil-fill"></i>';
        html += '    </button>';
        html += '    <button class="btn btn-sm btn-outline-danger btn-delete" data-id="' + artwork.id + '" title="Xóa">';
        html += '      <i class="bi bi-trash-fill"></i>';
        html += '    </button>';
        html += '  </td>';
        html += '</tr>';
    }

    tbody.innerHTML = html;

    // Attach event listeners for edit, delete, and approve buttons
    setupTableActions();
}

/**
 * Set up event listeners for table action buttons
 */
function setupTableActions() {
    // Edit buttons
    var editBtns = document.querySelectorAll('.btn-edit');
    for (var i = 0; i < editBtns.length; i++) {
        editBtns[i].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            startEdit(id);
        });
    }

    // Delete buttons
    var deleteBtns = document.querySelectorAll('.btn-delete');
    for (var j = 0; j < deleteBtns.length; j++) {
        deleteBtns[j].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            deleteArtwork(id);
        });
    }

    // Approve toggle buttons
    var approveBtns = document.querySelectorAll('.approve-toggle');
    for (var k = 0; k < approveBtns.length; k++) {
        approveBtns[k].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var currentStatus = this.getAttribute('data-status');
            toggleApproval(id, currentStatus);
        });
    }
}

/**
 * Set up the add/edit form handler
 */
function setupFormHandler() {
    var form = document.getElementById('artwork-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearErrors();

        // Collect form data
        var formData = {
            title: document.getElementById('input-title').value,
            artist: document.getElementById('input-artist').value,
            style: document.getElementById('input-style').value,
            story: document.getElementById('input-story').value,
            imageUrl: document.getElementById('input-imageUrl').value,
            status: document.getElementById('input-approved').checked ? 'approved' : 'pending'
        };

        // Validate
        var validation = validateForm(formData);

        if (!validation.valid) {
            // Show errors
            if (validation.errors.title) showInlineError('input-title', validation.errors.title);
            if (validation.errors.artist) showInlineError('input-artist', validation.errors.artist);
            if (validation.errors.imageUrl) showInlineError('input-imageUrl', validation.errors.imageUrl);
            return;
        }


        // Show loading on submit button
        setSubmitLoading(true);

        if (editingId) {
            // Update existing artwork
            updateArtwork(editingId, formData);
        } else {
            // Add new artwork
            formData.likes = 0;
            addArtwork(formData);
        }
    });
}

/**
 * Set up cancel edit button
 */
function setupCancelEdit() {
    var cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            resetForm();
        });
    }
}

/**
 * Add a new artwork via POST
 * @param {Object} data - Artwork data
 */
function addArtwork(data) {
    API.createArtwork(data)
        .then(function (created) {
            showAdminAlert('Đã thêm tác phẩm "' + created.title + '" thành công!', 'success');
            resetForm();
            loadArtworks();
        })
        .catch(function (error) {
            showAdminAlert('Lỗi khi thêm tác phẩm. Vui lòng thử lại.', 'danger');
            console.error('addArtwork error:', error);
        })
        .finally(function () {
            setSubmitLoading(false);
        });
}

/**
 * Update an existing artwork via PUT
 * @param {string|number} id
 * @param {Object} data - Updated fields
 */
function updateArtwork(id, data) {
    API.updateArtwork(id, data)
        .then(function (updated) {
            showAdminAlert('Đã cập nhật tác phẩm "' + updated.title + '" thành công!', 'success');
            resetForm();
            loadArtworks();
        })
        .catch(function (error) {
            showAdminAlert('Lỗi khi cập nhật tác phẩm. Vui lòng thử lại.', 'danger');
            console.error('updateArtwork error:', error);
        })
        .finally(function () {
            setSubmitLoading(false);
        });
}

/**
 * Delete an artwork after confirmation
 * @param {string|number} id
 */
function deleteArtwork(id) {
    // Find artwork title for confirmation message
    var artwork = null;
    for (var i = 0; i < adminArtworks.length; i++) {
        if (String(adminArtworks[i].id) === String(id)) {
            artwork = adminArtworks[i];
            break;
        }
    }

    var title = artwork ? artwork.title : 'tác phẩm này';
    if (!confirm('Bạn có chắc chắn muốn xóa "' + title + '"?')) {
        return;
    }

    // Optimistic removal from DOM
    var row = document.querySelector('tr[data-id="' + id + '"]');
    if (row) {
        row.classList.add('fade-out');
    }

    API.deleteArtwork(id)
        .then(function () {
            showAdminAlert('Đã xóa tác phẩm thành công!', 'success');
            // Remove from local data
            adminArtworks = adminArtworks.filter(function (a) {
                return String(a.id) !== String(id);
            });
            renderTable(adminArtworks);
            updateStatistics(adminArtworks);

            // If we were editing this artwork, reset form
            if (String(editingId) === String(id)) {
                resetForm();
            }
        })
        .catch(function (error) {
            if (row) row.classList.remove('fade-out');
            showAdminAlert('Lỗi khi xóa tác phẩm. Vui lòng thử lại.', 'danger');
            console.error('deleteArtwork error:', error);
        });
}

/**
 * Toggle artwork approved/pending status
 * @param {string|number} id
 * @param {string} currentStatus - 'approved' or 'pending'
 */
function toggleApproval(id, currentStatus) {
    var newStatus = currentStatus === 'approved' ? 'pending' : 'approved';

    API.updateArtwork(id, { status: newStatus })
        .then(function () {
            showAdminAlert('Đã cập nhật trạng thái duyệt!', 'info');
            loadArtworks();
        })
        .catch(function (error) {
            showAdminAlert('Lỗi khi cập nhật trạng thái.', 'danger');
            console.error('toggleApproval error:', error);
        });
}

/**
 * Start editing an artwork — populate form with existing data
 * @param {string|number} id
 */
function startEdit(id) {
    var artwork = null;
    for (var i = 0; i < adminArtworks.length; i++) {
        if (String(adminArtworks[i].id) === String(id)) {
            artwork = adminArtworks[i];
            break;
        }
    }

    if (!artwork) return;

    editingId = id;

    document.getElementById('input-title').value = artwork.title || '';
    document.getElementById('input-artist').value = artwork.artist || '';
    document.getElementById('input-style').value = artwork.style || 'Sơn dầu';
    document.getElementById('input-story').value = artwork.story || '';

    document.getElementById('input-imageUrl').value = artwork.imageUrl || '';
    document.getElementById('input-approved').checked = (artwork.status === 'approved' || artwork.approved === true);

    // Update form UI
    document.getElementById('form-title').textContent = 'Chỉnh sửa tác phẩm';
    document.getElementById('btn-submit').innerHTML = '<i class="bi bi-save me-1"></i> Cập nhật';
    document.getElementById('btn-cancel-edit').classList.remove('btn-cancel-edit-hidden');

    // Scroll to form
    document.getElementById('artwork-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Reset the form back to "add" mode
 */
function resetForm() {
    editingId = null;
    document.getElementById('artwork-form').reset();
    document.getElementById('form-title').textContent = 'Thêm tác phẩm mới';
    document.getElementById('btn-submit').innerHTML = '<i class="bi bi-plus-circle me-1"></i> Thêm tác phẩm';
    document.getElementById('btn-cancel-edit').classList.add('btn-cancel-edit-hidden');
    clearErrors();
    setSubmitLoading(false);
}

/**
 * Update statistics cards
 * @param {Array} artworks
 */
function updateStatistics(artworks) {
    var total = artworks.length;
    var approved = 0;
    var pending = 0;
    var totalLikes = 0;

    for (var i = 0; i < artworks.length; i++) {
        if (artworks[i].status === 'approved' || artworks[i].approved === true) {
            approved++;
        } else {
            pending++;
        }
        totalLikes += (artworks[i].likes || 0);
    }

    var statTotal = document.getElementById('stat-total');
    var statApproved = document.getElementById('stat-approved');
    var statPending = document.getElementById('stat-pending');
    var statLikes = document.getElementById('stat-likes');

    if (statTotal) statTotal.textContent = total;
    if (statApproved) statApproved.textContent = approved;
    if (statPending) statPending.textContent = pending;
    if (statLikes) statLikes.textContent = totalLikes.toLocaleString();
}

/**
 * Toggle loading state on submit button
 * @param {boolean} loading
 */
function setSubmitLoading(loading) {
    var btn = document.getElementById('btn-submit');
    if (!btn) return;

    if (loading) {
        btn.disabled = true;
        btn.setAttribute('data-original-text', btn.innerHTML);
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Đang xử lý...';
    } else {
        btn.disabled = false;
        var original = btn.getAttribute('data-original-text');
        if (original) {
            btn.innerHTML = original;
        }
    }
}

/**
 * Show or hide the table loading state
 * @param {boolean} show
 */
function showTableLoading(show) {
    var loader = document.getElementById('table-loading');
    var tableContainer = document.getElementById('table-container');
    if (loader) loader.style.display = show ? 'block' : 'none';
    if (tableContainer) {
        if (show) {
            tableContainer.classList.add('table-container-hidden');
        } else {
            tableContainer.classList.remove('table-container-hidden');
        }
    }
}

/**
 * Show an alert notification in the admin panel
 * @param {string} message
 * @param {string} type - Bootstrap alert type (success, danger, info, warning)
 */
function showAdminAlert(message, type) {
    var container = document.getElementById('admin-alerts');
    if (!container) return;

    var alertEl = document.createElement('div');
    alertEl.className = 'alert alert-' + type + ' alert-dismissible fade show admin-alert';
    alertEl.setAttribute('role', 'alert');
    alertEl.innerHTML = '<i class="bi ' + getAlertIcon(type) + ' me-2"></i>' + message +
        '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';

    container.appendChild(alertEl);

    // Auto dismiss after 4 seconds
    setTimeout(function () {
        if (alertEl && alertEl.parentElement) {
            alertEl.classList.remove('show');
            setTimeout(function () {
                if (alertEl.parentElement) alertEl.remove();
            }, 300);
        }
    }, 4000);
}

/**
 * Get the Bootstrap icon class for an alert type
 * @param {string} type
 * @returns {string}
 */
function getAlertIcon(type) {
    if (type === 'success') return 'bi-check-circle-fill';
    if (type === 'danger') return 'bi-exclamation-triangle-fill';
    if (type === 'info') return 'bi-info-circle-fill';
    if (type === 'warning') return 'bi-exclamation-circle-fill';
    return 'bi-info-circle-fill';
}
