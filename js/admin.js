/**
 * admin.js — Logic trang Quản Trị (admin.html)
 * Xử lý: CRUD tác phẩm, thống kê, duyệt yêu cầu đăng tác phẩm từ người dùng
 * Phụ thuộc: api.js, auth.js, collections.js, utils.js (phải load trước)
 */

// Danh sách tác phẩm hiện tại (cache client-side, đồng bộ với API)
var adminArtworks = [];

// ID tác phẩm đang được chỉnh sửa (null = đang ở chế độ thêm mới)
var editingId = null;

/* ══════════════════════════════════════
   KHỞI TẠO KHI TRANG TẢI XONG
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    loadArtworks();        // Tải danh sách tác phẩm từ API
    setupFormHandler();    // Gắn sự kiện submit cho form thêm/sửa
    setupCancelEdit();     // Gắn nút "Hủy chỉnh sửa"
    loadSubmissions();     // Tải danh sách yêu cầu đăng tác phẩm từ localStorage
    setupAdminTabs();      // Khởi tạo điều hướng tab sidebar
});

/* ══════════════════════════════════════
   ĐIỀU HƯỚNG TAB SIDEBAR
══════════════════════════════════════ */

/**
 * Gắn sự kiện click cho các link tab trong sidebar
 * Mỗi link có thuộc tính data-tab để xác định section cần hiển thị
 */
function setupAdminTabs() {
    document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault(); // Ngăn chuyển trang (đây là SPA navigation)
            var tab = this.getAttribute('data-tab');
            switchAdminTab(tab);
        });
    });
}

/**
 * Chuyển đổi giữa tab "Tác phẩm" và tab "Yêu cầu duyệt"
 * Ẩn section không dùng, hiện section đang dùng
 *
 * @param {string} tab - 'artworks' | 'submissions'
 */
function switchAdminTab(tab) {
    // Xóa trạng thái active khỏi tất cả link, rồi đặt lại cho link đang chọn
    document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(l => l.classList.remove('active'));
    var activeLink = document.querySelector('.sidebar-nav-link[data-tab="' + tab + '"]');
    if (activeLink) activeLink.classList.add('active');

    var artworksSection   = document.getElementById('artworks-section');
    var submissionsSection = document.getElementById('submissions-section');

    if (tab === 'submissions') {
        // Hiện tab duyệt yêu cầu, ẩn tab tác phẩm, tải lại dữ liệu mới nhất
        if (artworksSection)   artworksSection.style.display   = 'none';
        if (submissionsSection) submissionsSection.style.display = 'block';
        loadSubmissions();
    } else {
        // Tab mặc định: hiện tác phẩm, ẩn yêu cầu
        if (artworksSection)   artworksSection.style.display   = 'block';
        if (submissionsSection) submissionsSection.style.display = 'none';
    }
}

/* ══════════════════════════════════════
   TẢI & HIỂN THỊ DANH SÁCH TÁC PHẨM
══════════════════════════════════════ */

/**
 * Gọi API để lấy toàn bộ tác phẩm rồi render vào bảng
 * Đồng thời cập nhật thẻ thống kê ở đầu trang
 */
function loadArtworks() {
    showTableLoading(true); // Hiện spinner chờ tải

    API.getArtworks()
        .then(function (data) {
            adminArtworks = data;          // Lưu vào biến cache
            renderTable(adminArtworks);    // Vẽ bảng HTML
            updateStatistics(adminArtworks); // Cập nhật số liệu thống kê
            showTableLoading(false);       // Ẩn spinner
        })
        .catch(function (error) {
            showTableLoading(false);
            showAdminAlert('Không thể tải dữ liệu. Vui lòng thử lại.', 'danger');
            console.error('loadArtworks error:', error);
        });
}

/**
 * Render danh sách tác phẩm thành các hàng trong bảng HTML
 * Mỗi hàng có: ảnh thumbnail, thông tin, nút duyệt/sửa/xóa
 *
 * @param {Array} artworks - Mảng object tác phẩm cần hiển thị
 */
function renderTable(artworks) {
    var tbody = document.getElementById('artworks-tbody');
    if (!tbody) return;

    // Hiển thị thông báo nếu không có tác phẩm nào
    if (artworks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">' +
            '<i class="bi bi-inbox fs-3 d-block mb-2"></i>Chưa có tác phẩm nào</td></tr>';
        return;
    }

    var html = '';
    artworks.forEach(function (artwork) {
        var imgUrl     = getImageUrl(artwork.imageUrl, artwork.id); // Từ utils.js
        // Kiểm tra trạng thái duyệt — hỗ trợ cả 2 cách lưu: status='approved' hoặc approved=true
        var isApproved = artwork.status === 'approved' || artwork.approved === true;
        var statusText = isApproved ? 'approved' : 'pending';

        html += '<tr data-id="' + artwork.id + '">';
        html += '  <td><img src="' + imgUrl + '" class="table-thumbnail" alt="' + (artwork.title || '') + '" onerror="this.src=\'https://picsum.photos/seed/fallback' + artwork.id + '/100/100\'"></td>';
        html += '  <td class="fw-semibold">' + (artwork.title  || 'N/A') + '</td>';
        html += '  <td>' + (artwork.artist || 'N/A') + '</td>';
        html += '  <td><span class="badge bg-secondary">' + (artwork.style || 'N/A') + '</span></td>';
        html += '  <td><i class="bi bi-heart-fill text-danger"></i> ' + (artwork.likes || 0) + '</td>';
        // Nút toggle trạng thái duyệt — màu xanh nếu đã duyệt, xám nếu chờ
        html += '  <td>';
        html += '    <button class="btn btn-sm approve-toggle ' + (isApproved ? 'btn-success' : 'btn-outline-secondary') + '" data-id="' + artwork.id + '" data-status="' + statusText + '">';
        html += '      <i class="bi ' + (isApproved ? 'bi-check-circle-fill' : 'bi-circle') + '"></i> ';
        html += '      ' + (isApproved ? 'Đã duyệt' : 'Chờ duyệt');
        html += '    </button>';
        html += '  </td>';
        // Nút hành động: sửa và xóa
        html += '  <td>';
        html += '    <button class="btn btn-sm btn-outline-primary me-1 btn-edit"   data-id="' + artwork.id + '" title="Chỉnh sửa"><i class="bi bi-pencil-fill"></i></button>';
        html += '    <button class="btn btn-sm btn-outline-danger  btn-delete" data-id="' + artwork.id + '" title="Xóa"><i class="bi bi-trash-fill"></i></button>';
        html += '  </td>';
        html += '</tr>';
    });

    tbody.innerHTML = html;
    setupTableActions(); // Gắn sự kiện click sau khi render HTML
}

/**
 * Gắn sự kiện click cho các nút trong bảng
 * Phải gọi lại sau mỗi lần renderTable vì innerHTML thay thế toàn bộ DOM cũ
 */
function setupTableActions() {
    // Nút sửa: điền dữ liệu tác phẩm vào form
    document.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () { startEdit(this.getAttribute('data-id')); });
    });

    // Nút xóa: xác nhận rồi gọi API xóa
    document.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () { deleteArtwork(this.getAttribute('data-id')); });
    });

    // Nút toggle duyệt: đổi pending ↔ approved
    document.querySelectorAll('.approve-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            toggleApproval(this.getAttribute('data-id'), this.getAttribute('data-status'));
        });
    });
}

/* ══════════════════════════════════════
   XỬ LÝ FORM THÊM / SỬA TÁC PHẨM
══════════════════════════════════════ */

/**
 * Gắn sự kiện submit cho form tác phẩm
 * Tự động phân biệt chế độ: thêm mới (editingId = null) hay cập nhật (editingId có giá trị)
 */
function setupFormHandler() {
    var form = document.getElementById('artwork-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault(); // Ngăn form submit theo cách truyền thống (reload trang)
        clearErrors();      // Xóa lỗi cũ từ lần submit trước (từ utils.js)

        // Thu thập dữ liệu từ các trường input
        var formData = {
            title:    document.getElementById('input-title').value,
            artist:   document.getElementById('input-artist').value,
            style:    document.getElementById('input-style').value,
            story:    document.getElementById('input-story').value,
            imageUrl: document.getElementById('input-imageUrl').value,
            // Checkbox duyệt → lưu status dạng string để nhất quán với API
            status:   document.getElementById('input-approved').checked ? 'approved' : 'pending'
        };

        // Validate form trước khi gửi API (từ utils.js)
        var validation = validateForm(formData);
        if (!validation.valid) {
            // Hiển thị lỗi inline dưới từng trường bị sai
            if (validation.errors.title)    showInlineError('input-title',    validation.errors.title);
            if (validation.errors.artist)   showInlineError('input-artist',   validation.errors.artist);
            if (validation.errors.imageUrl) showInlineError('input-imageUrl', validation.errors.imageUrl);
            return; // Dừng lại, không gửi API
        }

        setSubmitLoading(true); // Vô hiệu hóa nút submit, hiện spinner

        if (editingId) {
            // Chế độ cập nhật: gọi PUT API
            updateArtwork(editingId, formData);
        } else {
            // Chế độ thêm mới: đặt likes = 0 rồi gọi POST API
            formData.likes = 0;
            addArtwork(formData);
        }
    });
}

/** Gắn sự kiện cho nút "Hủy chỉnh sửa" → reset về chế độ thêm mới */
function setupCancelEdit() {
    var cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) cancelBtn.addEventListener('click', resetForm);
}

/* ══════════════════════════════════════
   CÁC THAO TÁC CRUD (Gọi API)
══════════════════════════════════════ */

/**
 * Thêm tác phẩm mới — gọi POST /ArtGallery
 * @param {Object} data - Dữ liệu tác phẩm đã validate
 */
function addArtwork(data) {
    API.createArtwork(data)
        .then(function (created) {
            showAdminAlert('Đã thêm tác phẩm "' + created.title + '" thành công!', 'success');
            resetForm();       // Xóa form về trạng thái ban đầu
            loadArtworks();    // Tải lại bảng để hiện tác phẩm mới
        })
        .catch(function () { showAdminAlert('Lỗi khi thêm tác phẩm.', 'danger'); })
        .finally(function () { setSubmitLoading(false); }); // Luôn bỏ loading dù thành công hay thất bại
}

/**
 * Cập nhật tác phẩm — gọi PUT /ArtGallery/:id
 * @param {string|number} id   - ID tác phẩm cần cập nhật
 * @param {Object}        data - Dữ liệu mới
 */
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

/**
 * Xóa tác phẩm — gọi DELETE /ArtGallery/:id
 * Hỏi xác nhận trước, rồi tạo hiệu ứng fade-out trên hàng trước khi xóa khỏi DOM
 *
 * @param {string|number} id - ID tác phẩm cần xóa
 */
function deleteArtwork(id) {
    // Tìm tên tác phẩm để hiển thị trong hộp xác nhận
    var artwork = adminArtworks.find(a => String(a.id) === String(id));
    var title   = artwork ? artwork.title : 'tác phẩm này';

    // Hỏi xác nhận trước khi xóa — thao tác không thể hoàn tác
    if (!confirm('Bạn có chắc muốn xóa "' + title + '"?')) return;

    // Thêm class fade-out để tạo hiệu ứng mờ dần trên hàng đang bị xóa
    var row = document.querySelector('tr[data-id="' + id + '"]');
    if (row) row.classList.add('fade-out');

    API.deleteArtwork(id)
        .then(function () {
            showAdminAlert('Đã xóa tác phẩm thành công!', 'success');
            // Cập nhật cache client-side (xóa khỏi mảng local)
            adminArtworks = adminArtworks.filter(a => String(a.id) !== String(id));
            renderTable(adminArtworks);
            updateStatistics(adminArtworks);
            // Nếu đang sửa tác phẩm vừa xóa → reset form
            if (String(editingId) === String(id)) resetForm();
        })
        .catch(function () {
            // Nếu xóa thất bại, bỏ hiệu ứng fade-out (giữ nguyên hàng)
            if (row) row.classList.remove('fade-out');
            showAdminAlert('Lỗi khi xóa tác phẩm.', 'danger');
        });
}

/**
 * Đảo ngược trạng thái duyệt của tác phẩm (pending ↔ approved)
 * Gọi PUT API để lưu trạng thái mới lên server
 *
 * @param {string|number} id            - ID tác phẩm
 * @param {string}        currentStatus - Trạng thái hiện tại ('approved' | 'pending')
 */
function toggleApproval(id, currentStatus) {
    var newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    API.updateArtwork(id, { status: newStatus })
        .then(function () {
            showAdminAlert('Đã cập nhật trạng thái!', 'info');
            loadArtworks(); // Tải lại để phản ánh trạng thái mới trên UI
        })
        .catch(function () { showAdminAlert('Lỗi khi cập nhật.', 'danger'); });
}

/**
 * Bắt đầu chỉnh sửa tác phẩm — điền dữ liệu vào form và đổi nhãn nút
 * @param {string|number} id - ID tác phẩm cần sửa
 */
function startEdit(id) {
    var artwork = adminArtworks.find(a => String(a.id) === String(id));
    if (!artwork) return;

    editingId = id; // Đánh dấu chế độ chỉnh sửa

    // Điền dữ liệu tác phẩm vào các trường input
    document.getElementById('input-title').value    = artwork.title    || '';
    document.getElementById('input-artist').value   = artwork.artist   || '';
    document.getElementById('input-style').value    = artwork.style    || 'Sơn dầu';
    document.getElementById('input-story').value    = artwork.story    || '';
    document.getElementById('input-imageUrl').value = artwork.imageUrl || '';
    document.getElementById('input-approved').checked = (artwork.status === 'approved' || artwork.approved === true);

    // Đổi giao diện form sang chế độ "Chỉnh sửa"
    document.getElementById('form-title').innerHTML  = '<i class="bi bi-pencil-square text-warning"></i> Chỉnh sửa tác phẩm';
    document.getElementById('btn-submit').innerHTML  = '<i class="bi bi-save me-1"></i> Cập nhật';
    document.getElementById('btn-cancel-edit').classList.remove('btn-cancel-edit-hidden');

    // Cuộn trang lên form để người dùng thấy
    document.getElementById('artwork-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Reset form về chế độ thêm mới
 * Xóa toàn bộ dữ liệu, đổi lại nhãn nút, ẩn nút Hủy
 */
function resetForm() {
    editingId = null; // Thoát chế độ chỉnh sửa
    document.getElementById('artwork-form').reset();
    document.getElementById('form-title').innerHTML  = '<i class="bi bi-plus-circle text-primary"></i> Thêm tác phẩm mới';
    document.getElementById('btn-submit').innerHTML  = '<i class="bi bi-plus-circle me-1"></i> Thêm tác phẩm';
    document.getElementById('btn-cancel-edit').classList.add('btn-cancel-edit-hidden');
    clearErrors();         // Xóa các thông báo lỗi inline (từ utils.js)
    setSubmitLoading(false); // Đảm bảo nút submit không bị disabled
}

/* ══════════════════════════════════════
   QUẢN LÝ YÊU CẦU ĐĂNG TÁC PHẨM
══════════════════════════════════════ */

/**
 * Tải và hiển thị toàn bộ yêu cầu đăng tác phẩm từ localStorage
 * Cũng cập nhật badge số lượng chờ duyệt trên menu sidebar
 */
function loadSubmissions() {
    var allSubs = submissions.getAll(); // Từ collections.js
    renderSubmissionsTable(allSubs);
    updateSubmissionBadge(submissions.getPending().length);
}

/**
 * Render bảng yêu cầu đăng tác phẩm
 * Hiển thị thông tin người gửi, ngày gửi, trạng thái và nút hành động
 *
 * @param {Array} subs - Mảng object yêu cầu
 */
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
        // Định dạng ngày theo kiểu Việt Nam (dd/mm/yyyy)
        var date   = new Date(sub.submittedAt).toLocaleDateString('vi-VN');

        // Map trạng thái → màu Bootstrap badge và nhãn tiếng Việt
        var statusClass = { pending: 'warning', approved: 'success', rejected: 'danger' }[sub.status] || 'secondary';
        var statusLabel = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối'  }[sub.status] || sub.status;

        html += '<tr>';
        html += '<td><img src="' + imgUrl + '" class="table-thumbnail" alt="" onerror="this.src=\'https://picsum.photos/seed/sub' + sub.id + '/80/80\'"></td>';
        html += '<td class="fw-semibold">' + (sub.title  || 'N/A') + '</td>';
        html += '<td>' + (sub.artist || 'N/A') + '</td>';
        html += '<td><span class="badge bg-secondary">' + (sub.style || '') + '</span></td>';
        // Thông tin người gửi (có thể null nếu ẩn danh)
        html += '<td><small>' + (sub.submittedBy
            ? sub.submittedBy.fullName + '<br><span class="text-muted">' + sub.submittedBy.email + '</span>'
            : 'Ẩn danh') + '</small></td>';
        html += '<td><small>' + date + '</small></td>';
        html += '<td><span class="badge bg-' + statusClass + '">' + statusLabel + '</span></td>';
        html += '<td>';
        // Chỉ hiện nút hành động khi còn chờ duyệt
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

/**
 * Duyệt yêu cầu: tạo tác phẩm thật trên API rồi đánh dấu submission là 'approved'
 * Luồng: Duyệt → POST API tạo artwork → updateStatus('approved') → reload
 *
 * @param {string} id - ID yêu cầu cần duyệt
 */
function approveSubmission(id) {
    var sub = submissions.getAll().find(s => s.id === id);
    if (!sub) return;

    if (!confirm('Duyệt và thêm tác phẩm "' + sub.title + '" vào gallery?')) return;

    // Chuẩn bị dữ liệu tác phẩm từ thông tin yêu cầu
    var artworkData = {
        title:    sub.title,
        artist:   sub.artist,
        style:    sub.style,
        story:    sub.story,
        imageUrl: sub.imageUrl,
        likes:    0,
        status:   'approved'
    };

    // Tạo artwork trên MockAPI trước, sau đó mới cập nhật trạng thái submission
    API.createArtwork(artworkData)
        .then(function (created) {
            submissions.updateStatus(id, 'approved'); // Cập nhật localStorage
            showAdminAlert('Đã duyệt và thêm "' + created.title + '" vào gallery!', 'success');
            loadSubmissions(); // Làm mới bảng yêu cầu
            loadArtworks();    // Làm mới bảng tác phẩm
        })
        .catch(function () {
            showAdminAlert('Lỗi khi thêm tác phẩm vào gallery. Thử lại.', 'danger');
        });
}

/**
 * Từ chối yêu cầu đăng tác phẩm — chỉ cập nhật localStorage, không gọi API
 * @param {string} id - ID yêu cầu cần từ chối
 */
function rejectSubmission(id) {
    var sub = submissions.getAll().find(s => s.id === id);
    if (!sub) return;
    if (!confirm('Từ chối yêu cầu "' + sub.title + '"?')) return;

    submissions.updateStatus(id, 'rejected');
    showAdminAlert('Đã từ chối yêu cầu "' + sub.title + '"', 'warning');
    loadSubmissions(); // Làm mới bảng
}

/**
 * Lọc bảng yêu cầu theo trạng thái
 * Gọi từ các nút filter "Tất cả / Chờ duyệt / Đã duyệt / Từ chối"
 *
 * @param {string} status - 'all' | 'pending' | 'approved' | 'rejected'
 */
function filterSubmissions(status) {
    var all      = submissions.getAll();
    // Nếu status là 'all' thì hiện tất cả, ngược lại lọc theo status
    var filtered = status === 'all' ? all : submissions.getByStatus(status);
    renderSubmissionsTable(filtered);

    // Cập nhật trạng thái active trên các nút filter
    document.querySelectorAll('.sub-filter-btn').forEach(btn => btn.classList.remove('active'));
    var activeBtn = document.querySelector('.sub-filter-btn[data-status="' + status + '"]');
    if (activeBtn) activeBtn.classList.add('active');
}

/**
 * Cập nhật badge số lượng yêu cầu chờ duyệt trên menu sidebar
 * Ẩn badge nếu không có yêu cầu nào đang chờ
 *
 * @param {number} count - Số yêu cầu đang chờ
 */
function updateSubmissionBadge(count) {
    var badge = document.getElementById('submissions-badge');
    if (badge) {
        badge.textContent    = count;
        badge.style.display  = count > 0 ? 'inline-block' : 'none';
    }
}

/* ══════════════════════════════════════
   THỐNG KÊ (Statistics Cards)
══════════════════════════════════════ */

/**
 * Tính toán và cập nhật các thẻ thống kê ở đầu trang dashboard
 * Đếm: tổng tác phẩm, đã duyệt, chờ duyệt, tổng lượt thích, yêu cầu chờ
 *
 * @param {Array} artworks - Danh sách tác phẩm hiện tại
 */
function updateStatistics(artworks) {
    var total      = artworks.length;
    var approved   = artworks.filter(a => a.status === 'approved' || a.approved === true).length;
    var pending    = total - approved;
    // reduce để cộng dồn toàn bộ lượt thích
    var totalLikes = artworks.reduce((sum, a) => sum + (a.likes || 0), 0);
    var pendingSubs = submissions.getPending().length;

    // Hàm nội bộ giúp cập nhật text ngắn gọn
    var set = function (id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set('stat-total',       total);
    set('stat-approved',    approved);
    set('stat-pending',     pending);
    set('stat-likes',       totalLikes.toLocaleString()); // Định dạng số có dấu phân cách
    set('stat-submissions', pendingSubs);
}

/* ══════════════════════════════════════
   HỖ TRỢ GIAO DIỆN (UI Helpers)
══════════════════════════════════════ */

/**
 * Chuyển đổi trạng thái loading của nút Submit
 * Khi đang gửi API: vô hiệu hóa nút + hiện spinner để tránh click nhiều lần
 *
 * @param {boolean} loading - true = bật loading, false = tắt
 */
function setSubmitLoading(loading) {
    var btn = document.getElementById('btn-submit');
    if (!btn) return;

    if (loading) {
        btn.disabled = true;
        // Lưu lại nội dung gốc để khôi phục sau
        btn.setAttribute('data-original-text', btn.innerHTML);
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang xử lý...';
    } else {
        btn.disabled = false;
        var orig = btn.getAttribute('data-original-text');
        if (orig) btn.innerHTML = orig;
    }
}

/**
 * Hiển thị hoặc ẩn spinner chờ tải bảng tác phẩm
 * @param {boolean} show - true = hiện spinner + ẩn bảng, false = ngược lại
 */
function showTableLoading(show) {
    var loader         = document.getElementById('table-loading');
    var tableContainer = document.getElementById('table-container');
    if (loader)         loader.style.display = show ? 'block' : 'none';
    // Class CSS 'table-container-hidden' dùng display:none
    if (tableContainer) tableContainer.classList.toggle('table-container-hidden', show);
}

/**
 * Hiển thị thông báo nổi (toast-style) ở góc phải màn hình
 * Tự động biến mất sau 4 giây
 *
 * @param {string} message - Nội dung thông báo
 * @param {string} type    - 'success' | 'danger' | 'info' | 'warning'
 */
function showAdminAlert(message, type) {
    var container = document.getElementById('admin-alerts');
    if (!container) return;

    // Tạo thẻ alert Bootstrap với nút đóng
    var alertEl = document.createElement('div');
    alertEl.className = 'alert alert-' + type + ' alert-dismissible fade show admin-alert';
    alertEl.setAttribute('role', 'alert');
    alertEl.innerHTML = '<i class="bi ' + getAlertIcon(type) + ' me-2"></i>' + message +
        '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';

    container.appendChild(alertEl);

    // Tự động ẩn sau 4 giây (fade → remove)
    setTimeout(function () {
        if (alertEl && alertEl.parentElement) {
            alertEl.classList.remove('show');
            setTimeout(function () { if (alertEl.parentElement) alertEl.remove(); }, 300);
        }
    }, 4000);
}

/**
 * Trả về class icon Bootstrap phù hợp với loại alert
 * @param {string} type - Loại alert
 * @returns {string} Tên class Bootstrap Icon
 */
function getAlertIcon(type) {
    var map = {
        success: 'bi-check-circle-fill',
        danger:  'bi-exclamation-triangle-fill',
        info:    'bi-info-circle-fill',
        warning: 'bi-exclamation-circle-fill'
    };
    return map[type] || 'bi-info-circle-fill';
}