/**
 * main.js — Logic trang Gallery Công Khai (index.html)
 * Xử lý: hiển thị tác phẩm, lọc, tìm kiếm, chatbot,
 *        bookmark vào bộ sưu tập cá nhân, gửi yêu cầu đăng tác phẩm
 * Phụ thuộc: api.js, auth.js, collections.js, utils.js, jQuery (CDN)
 */

// ─── BIẾN TOÀN CỤC ───────────────────────────────────────────────────────────

var allArtworks              = [];    // Cache toàn bộ tác phẩm tải từ API
var currentFilter            = 'all'; // Bộ lọc phong cách đang chọn ('all' = tất cả)
var currentSearch            = '';    // Từ khóa tìm kiếm hiện tại
var collectionPickerArtworkId = null; // ID tác phẩm đang được bookmark (dùng cho collection picker)

/* ══════════════════════════════════════
   KHỞI TẠO KHI TRANG TẢI XONG
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    loadGallery();           // Tải tác phẩm từ API và render gallery
    setupFilterButtons();    // Gắn sự kiện lọc theo phong cách
    setupSearch();           // Gắn sự kiện tìm kiếm realtime
    setupChatbot();          // Khởi tạo widget chatbot
    setupCollectionsModal(); // Gắn nút mở modal "Bộ sưu tập của tôi"
    setupSubmitModal();      // Gắn nút mở modal "Đăng tác phẩm"
    updateNavUserUI();       // Cập nhật giao diện navbar theo trạng thái đăng nhập
    initThemeSwitcher();     // Khởi tạo nút chuyển đổi sáng/tối
});

/* ══════════════════════════════════════
   TẢI & RENDER GALLERY
══════════════════════════════════════ */

/**
 * Gọi API để lấy toàn bộ tác phẩm, sau đó áp dụng bộ lọc và render
 */
function loadGallery() {
    showLoading(true);
    hideError();

    API.getArtworks()
        .then(function (data) {
            allArtworks = data; // Lưu vào cache để filter/search không cần gọi lại API
            applyFiltersAndRender();
            showLoading(false);
        })
        .catch(function (error) {
            showLoading(false);
            showError('Không thể tải tác phẩm. Vui lòng thử lại sau.');
            console.error('Load gallery error:', error);
        });
}

/**
 * Áp dụng lần lượt các bộ lọc đang hoạt động rồi render kết quả
 * Thứ tự lọc: duyệt → phong cách → tìm kiếm
 */
function applyFiltersAndRender() {
    var result = filterApproved(allArtworks);                          // Bước 1: Chỉ lấy tác phẩm đã duyệt
    if (currentFilter !== 'all') result = filterByStyle(result, currentFilter); // Bước 2: Lọc phong cách
    if (currentSearch.trim() !== '') result = searchArtworks(result, currentSearch); // Bước 3: Tìm kiếm
    renderArtworks(result);
    updateSearchInfo(result.length);
}

/**
 * Lọc chỉ lấy tác phẩm đã được admin duyệt
 * Hỗ trợ 2 cách lưu trạng thái: status='approved' hoặc approved=true (tương thích API cũ)
 */
function filterApproved(artworks) {
    return artworks.filter(a => a.status === 'approved' || a.approved === true);
}

/**
 * Lọc tác phẩm theo phong cách nghệ thuật
 * @param {Array}  artworks - Danh sách tác phẩm đầu vào
 * @param {string} style    - Phong cách cần lọc ('Sơn dầu', 'Màu nước', ...)
 */
function filterByStyle(artworks, style) {
    if (!style || style === 'all') return artworks;
    return artworks.filter(a => a.style === style);
}

/**
 * Tìm kiếm tác phẩm theo từ khóa (không phân biệt chữ hoa/thường)
 * Tìm trong: tiêu đề, tên nghệ sĩ, phong cách
 *
 * @param {Array}  artworks - Danh sách đầu vào
 * @param {string} query    - Từ khóa tìm kiếm
 */
function searchArtworks(artworks, query) {
    var q = query.toLowerCase().trim();
    if (!q) return artworks;
    return artworks.filter(function (a) {
        return (a.title  || '').toLowerCase().includes(q) ||
               (a.artist || '').toLowerCase().includes(q) ||
               (a.style  || '').toLowerCase().includes(q);
    });
}

/**
 * Render danh sách tác phẩm thành lưới card HTML
 * Mỗi card có: ảnh, tên, nghệ sĩ, nút like, nút bookmark
 *
 * @param {Array} data - Mảng tác phẩm sau khi đã lọc
 */
function renderArtworks(data) {
    var container = document.getElementById('gallery-grid');
    if (!container) return;

    // Lấy thông tin user để kiểm tra trạng thái bookmark
    var user   = auth.getCurrentUser();
    var userId = user ? user.id : null;

    // Hiển thị thông báo khi không có kết quả
    if (data.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5">' +
            '<i class="bi bi-palette fs-1 text-gold"></i>' +
            '<p class="mt-3 text-muted-light">Không tìm thấy tác phẩm nào.</p>' +
            '</div>';
        return;
    }

    // Build HTML bằng string concatenation (không dùng template engine)
    var html = '';
    data.forEach(function (artwork) {
        var imgUrl      = getImageUrl(artwork.imageUrl, artwork.id); // Từ utils.js
        var isBookmarked = userId ? collections.isInAnyCollection(userId, artwork.id) : false;

        html += '<div class="col-6 col-sm-6 col-md-4 col-lg-4 col-xl-3 mb-4 artwork-card-wrapper" data-style="' + (artwork.style || '') + '">';
        html += '  <div class="card artwork-card h-100">';
        html += '    <div class="card-img-wrapper" style="cursor:pointer" onclick="openArtworkModal(\'' + artwork.id + '\')">';
        html += '      <img src="' + imgUrl + '" class="card-img-top" alt="' + (artwork.title || '') + '" loading="lazy" onerror="this.src=\'https://picsum.photos/seed/fallback' + artwork.id + '/600/800\'">';
        html += '      <div class="card-img-overlay-gradient"></div>';
        html += '      <span class="style-badge">' + (artwork.style || 'N/A') + '</span>';
        html += '    </div>';
        html += '    <div class="card-body">';
        html += '      <h5 class="card-title" style="cursor:pointer" onclick="openArtworkModal(\'' + artwork.id + '\')">' + (artwork.title || 'Untitled') + '</h5>';
        html += '      <p class="card-artist"><i class="bi bi-person-fill"></i> ' + (artwork.artist || 'Unknown') + '</p>';
        html += '      <div class="card-footer-info">';
        // Nút like — dùng jQuery cho hiệu ứng pulse
        html += '        <button class="btn-like" data-id="' + artwork.id + '" data-likes="' + (artwork.likes || 0) + '">';
        html += '          <i class="bi bi-heart-fill"></i>';
        html += '          <span class="like-count">' + (artwork.likes || 0) + '</span>';
        html += '        </button>';
        // Nút bookmark — đổi icon tùy theo trạng thái đã lưu chưa
        html += '        <button class="btn-bookmark ' + (isBookmarked ? 'bookmarked' : '') + '" data-id="' + artwork.id + '" title="' + (isBookmarked ? 'Đã lưu' : 'Lưu vào bộ sưu tập') + '">';
        html += '          <i class="bi bi-bookmark' + (isBookmarked ? '-fill' : '') + '"></i>';
        html += '        </button>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    });

    container.innerHTML = html;

    // Hiệu ứng xuất hiện lần lượt (staggered fade-in) cho từng card
    var cards = container.querySelectorAll('.artwork-card-wrapper');
    cards.forEach(function (card, i) {
        // Mỗi card delay thêm 50ms so với card trước → cảm giác cascade
        setTimeout(function () { card.classList.add('visible'); }, i * 50);
    });

    setupLikeButtons();     // Gắn sự kiện sau khi DOM mới được render
    setupBookmarkButtons();
}

/* ══════════════════════════════════════
   BOOKMARK / BỘ SƯU TẬP CÁ NHÂN
══════════════════════════════════════ */

/** Gắn sự kiện click cho tất cả nút bookmark trên các card */
function setupBookmarkButtons() {
    document.querySelectorAll('.btn-bookmark').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation(); // Ngăn click lan lên card (tránh mở modal)
            var id = this.getAttribute('data-id');
            handleBookmarkClick(id, this);
        });
    });
}

/**
 * Xử lý click nút bookmark:
 * - Chưa đăng nhập → hiện toast nhắc đăng nhập
 * - Đã đăng nhập  → mở collection picker để chọn thư mục
 */
function handleBookmarkClick(artworkId, btnEl) {
    if (!auth.isUserLoggedIn()) {
        showToast('Vui lòng đăng nhập để lưu tác phẩm', 'warning');
        return;
    }
    collectionPickerArtworkId = artworkId;
    openCollectionPicker(artworkId, btnEl);
}

/**
 * Mở dropdown "collection picker" ngay bên dưới nút bookmark đã click
 * Hiển thị danh sách thư mục hiện có + ô tạo thư mục mới
 *
 * @param {string} artworkId - ID tác phẩm cần bookmark
 * @param {Element} anchorEl - Nút bookmark (dùng để định vị dropdown)
 */
function openCollectionPicker(artworkId, anchorEl) {
    // Xóa picker cũ nếu đang mở (tránh chồng nhiều picker)
    var existing = document.getElementById('collection-picker');
    if (existing) existing.remove();

    var user            = auth.getCurrentUser();
    var userCollections = collections.getUserCollections(user.id);
    var folderNames     = Object.keys(userCollections);

    // Tạo container picker
    var picker       = document.createElement('div');
    picker.id        = 'collection-picker';
    picker.className = 'collection-picker';

    // Header với nút đóng
    var headerHtml = '<div class="cp-header"><span><i class="bi bi-bookmark-plus me-1"></i> Lưu vào thư mục</span>' +
        '<button class="cp-close" onclick="closeCollectionPicker()"><i class="bi bi-x"></i></button></div>';

    // Danh sách thư mục — mỗi thư mục là 1 nút toggle
    var foldersHtml = '';
    if (folderNames.length === 0) {
        foldersHtml = '<p class="cp-empty">Chưa có thư mục nào. Tạo thư mục mới bên dưới.</p>';
    } else {
        folderNames.forEach(function (name) {
            var inFolder = collections.isInCollection(user.id, name, artworkId);
            foldersHtml += '<button class="cp-folder-btn ' + (inFolder ? 'in-folder' : '') + '" onclick="toggleArtworkInFolder(\'' + name + '\')">' +
                '<i class="bi bi-folder' + (inFolder ? '-fill' : '') + '"></i> ' + name +
                (inFolder ? ' <i class="bi bi-check2 ms-auto"></i>' : '') +
                '</button>';
        });
    }

    // Ô tạo thư mục mới
    var createHtml = '<div class="cp-create">' +
        '<input type="text" id="cp-new-folder-input" class="cp-input" placeholder="Tên thư mục mới..." maxlength="40">' +
        '<button class="cp-create-btn" onclick="createFolderFromPicker()"><i class="bi bi-plus-lg"></i></button>' +
        '</div>';

    picker.innerHTML = headerHtml + '<div class="cp-folders">' + foldersHtml + '</div>' + createHtml;

    // Gắn vào body và định vị ngay bên dưới nút bookmark
    document.body.appendChild(picker);
    var rect    = anchorEl.getBoundingClientRect();
    var scrollY = window.scrollY || window.pageYOffset;
    picker.style.top  = (rect.bottom + scrollY + 8) + 'px';
    // Đảm bảo picker không tràn ra ngoài màn hình bên phải
    picker.style.left = Math.min(rect.left, window.innerWidth - 230) + 'px';

    // Đóng picker khi click ra ngoài (setTimeout 50ms để bỏ qua click hiện tại)
    setTimeout(function () {
        document.addEventListener('click', closePikerOnOutside);
    }, 50);
}

/** Đóng picker nếu click xảy ra bên ngoài picker */
function closePikerOnOutside(e) {
    var picker = document.getElementById('collection-picker');
    if (picker && !picker.contains(e.target)) {
        closeCollectionPicker();
    }
}

/** Xóa picker khỏi DOM và gỡ event listener */
function closeCollectionPicker() {
    var picker = document.getElementById('collection-picker');
    if (picker) picker.remove();
    document.removeEventListener('click', closePikerOnOutside);
}

/**
 * Toggle tác phẩm vào/ra khỏi một thư mục khi click trong picker
 * - Nếu đã có → xóa khỏi thư mục
 * - Nếu chưa có → thêm vào thư mục
 *
 * @param {string} folderName - Tên thư mục đích
 */
function toggleArtworkInFolder(folderName) {
    var user = auth.getCurrentUser();
    var id   = collectionPickerArtworkId;
    if (!user || !id) return;

    if (collections.isInCollection(user.id, folderName, id)) {
        collections.removeFromCollection(user.id, folderName, id);
        showToast('Đã xóa khỏi "' + folderName + '"', 'info');
    } else {
        var result = collections.addToCollection(user.id, folderName, id);
        showToast(result.message, result.success ? 'success' : 'warning');
    }

    // Đồng bộ icon bookmark trên card gallery (fill/unfill)
    var anchorEl = document.querySelector('.btn-bookmark[data-id="' + id + '"]');
    if (anchorEl) {
        var isBookmarked = collections.isInAnyCollection(user.id, id);
        anchorEl.classList.toggle('bookmarked', isBookmarked);
        anchorEl.querySelector('i').className = 'bi bi-bookmark' + (isBookmarked ? '-fill' : '');
    }

    // Render lại picker để phản ánh trạng thái mới
    if (anchorEl) openCollectionPicker(id, anchorEl);
}

/**
 * Tạo thư mục mới từ ô input trong picker, sau đó tự động thêm tác phẩm vào đó
 */
function createFolderFromPicker() {
    var input = document.getElementById('cp-new-folder-input');
    if (!input) return;
    var name = input.value.trim();
    var user = auth.getCurrentUser();
    if (!user) return;

    var result = collections.createCollection(user.id, name);
    if (!result.success) { showToast(result.message, 'warning'); return; }

    // Tự động thêm tác phẩm đang xem vào thư mục vừa tạo
    if (collectionPickerArtworkId) {
        collections.addToCollection(user.id, name, collectionPickerArtworkId);
    }
    showToast('Đã tạo & thêm vào "' + name + '"', 'success');

    // Cập nhật icon bookmark trên card
    var anchorEl = document.querySelector('.btn-bookmark[data-id="' + collectionPickerArtworkId + '"]');
    if (anchorEl) {
        anchorEl.classList.add('bookmarked');
        anchorEl.querySelector('i').className = 'bi bi-bookmark-fill';
        openCollectionPicker(collectionPickerArtworkId, anchorEl); // Render lại picker
    }
}

/* ══════════════════════════════════════
   MODAL BỘ SƯU TẬP CÁ NHÂN
══════════════════════════════════════ */

/** Gắn sự kiện mở modal "Bộ sưu tập của tôi" */
function setupCollectionsModal() {
    var openBtn = document.getElementById('btn-my-collections');
    if (openBtn) {
        openBtn.addEventListener('click', function (e) {
            e.preventDefault();
            openMyCollectionsModal();
        });
    }
}

/** Kiểm tra đăng nhập rồi mở modal bộ sưu tập */
function openMyCollectionsModal() {
    if (!auth.isUserLoggedIn()) {
        showToast('Vui lòng đăng nhập để xem bộ sưu tập', 'warning');
        return;
    }
    renderCollectionsModal();
    var modal = new bootstrap.Modal(document.getElementById('collectionsModal'));
    modal.show();
}

/**
 * Render nội dung modal bộ sưu tập:
 * - Cột trái: danh sách thư mục
 * - Cột phải: lưới tác phẩm trong thư mục đang chọn
 *
 * @param {string} [activeFolder] - Tên thư mục đang được chọn (undefined = chưa chọn)
 */
function renderCollectionsModal(activeFolder) {
    var user            = auth.getCurrentUser();
    var userCollections = collections.getUserCollections(user.id);
    var folderNames     = Object.keys(userCollections);

    var sidebarEl = document.getElementById('cm-folders-list');
    var contentEl = document.getElementById('cm-folder-content');
    var badgeEl   = document.getElementById('cm-total-badge');

    // Cập nhật tổng số tác phẩm đã lưu (không trùng lặp)
    if (badgeEl) badgeEl.textContent = collections.getTotalSaved(user.id);

    // ── Sidebar: danh sách thư mục ──
    if (sidebarEl) {
        if (folderNames.length === 0) {
            sidebarEl.innerHTML = '<p class="cm-empty-hint">Chưa có thư mục nào.<br>Nhấn <strong>+</strong> để tạo.</p>';
        } else {
            sidebarEl.innerHTML = folderNames.map(function (name) {
                var count    = userCollections[name].length;
                var isActive = name === activeFolder;
                return '<button class="cm-folder-item ' + (isActive ? 'active' : '') + '" onclick="renderCollectionsModal(\'' + name + '\')">' +
                    '<i class="bi bi-folder' + (isActive ? '-fill' : '') + ' me-2"></i>' +
                    '<span class="cm-folder-name">' + name + '</span>' +
                    '<span class="cm-folder-count">' + count + '</span>' +
                    '<button class="cm-del-folder" title="Xóa thư mục" onclick="deleteFolderFromModal(event, \'' + name + '\')">' +
                    '<i class="bi bi-trash3"></i></button>' +
                    '</button>';
            }).join('');
        }
    }

    // ── Content: tác phẩm trong thư mục đang chọn ──
    if (contentEl) {
        if (!activeFolder || !userCollections[activeFolder]) {
            // Chưa chọn thư mục → hiện hướng dẫn
            if (folderNames.length === 0) {
                contentEl.innerHTML = '<div class="cm-empty"><i class="bi bi-bookmark-star fs-1"></i><p>Bắt đầu lưu tác phẩm yêu thích vào thư mục!</p></div>';
            } else {
                contentEl.innerHTML = '<div class="cm-empty"><i class="bi bi-folder2-open fs-1"></i><p>Chọn một thư mục bên trái để xem.</p></div>';
            }
            return;
        }

        // Lấy danh sách tác phẩm tương ứng với ID đã lưu trong thư mục
        var ids              = userCollections[activeFolder];
        var artworksInFolder = allArtworks.filter(a => ids.includes(String(a.id)));

        if (artworksInFolder.length === 0) {
            contentEl.innerHTML = '<div class="cm-empty"><i class="bi bi-inbox fs-1"></i><p>Thư mục này chưa có tác phẩm nào.</p></div>';
            return;
        }

        // Render lưới tác phẩm nhỏ trong modal
        contentEl.innerHTML = '<div class="cm-grid">' + artworksInFolder.map(function (a) {
            var imgUrl = getImageUrl(a.imageUrl, a.id);
            return '<div class="cm-card">' +
                '<img src="' + imgUrl + '" alt="' + (a.title || '') + '" onerror="this.src=\'https://picsum.photos/seed/fb' + a.id + '/300/400\'" onclick="openArtworkModal(\'' + a.id + '\')">' +
                '<div class="cm-card-info">' +
                '<span class="cm-card-title">' + (a.title  || 'Untitled') + '</span>' +
                '<span class="cm-card-artist">' + (a.artist || '') + '</span>' +
                '</div>' +
                '<button class="cm-remove-btn" title="Xóa khỏi thư mục" onclick="removeFromFolderModal(\'' + activeFolder + '\', \'' + a.id + '\')">' +
                '<i class="bi bi-x-circle-fill"></i></button>' +
                '</div>';
        }).join('') + '</div>';
    }
}

/**
 * Xóa toàn bộ thư mục (hỏi xác nhận trước)
 * e.stopPropagation() để tránh click lan lên nút thư mục cha
 */
function deleteFolderFromModal(e, folderName) {
    e.stopPropagation();
    if (!confirm('Xóa thư mục "' + folderName + '"? (Tác phẩm sẽ không bị xóa khỏi gallery)')) return;
    var user = auth.getCurrentUser();
    collections.deleteCollection(user.id, folderName);
    renderCollectionsModal(); // Render lại toàn bộ modal (không có folder nào active)
    showToast('Đã xóa thư mục "' + folderName + '"', 'info');
}

/**
 * Xóa tác phẩm khỏi thư mục từ bên trong modal
 * Đồng bộ lại icon bookmark trên card gallery ngoài modal
 */
function removeFromFolderModal(folderName, artworkId) {
    var user = auth.getCurrentUser();
    collections.removeFromCollection(user.id, folderName, artworkId);

    // Cập nhật icon bookmark trên card ngoài gallery (nếu còn visible)
    var cardBtn = document.querySelector('.btn-bookmark[data-id="' + artworkId + '"]');
    if (cardBtn) {
        var isStillBookmarked = collections.isInAnyCollection(user.id, artworkId);
        cardBtn.classList.toggle('bookmarked', isStillBookmarked);
        cardBtn.querySelector('i').className = 'bi bi-bookmark' + (isStillBookmarked ? '-fill' : '');
    }

    renderCollectionsModal(folderName); // Giữ nguyên thư mục đang xem
}

/** Tạo thư mục mới từ ô input trong modal bộ sưu tập */
function createCollectionFromModal() {
    var input = document.getElementById('cm-new-folder-input');
    if (!input) return;
    var name   = input.value.trim();
    var user   = auth.getCurrentUser();
    var result = collections.createCollection(user.id, name);
    if (result.success) {
        input.value = '';
        renderCollectionsModal(name); // Chuyển sang thư mục vừa tạo
        showToast(result.message, 'success');
    } else {
        showToast(result.message, 'warning');
    }
}

/* ══════════════════════════════════════
   MODAL GỬI YÊU CẦU ĐĂNG TÁC PHẨM
══════════════════════════════════════ */

/** Gắn nút mở modal và sự kiện submit form */
function setupSubmitModal() {
    var openBtn = document.getElementById('btn-submit-artwork');
    if (openBtn) {
        openBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (!auth.isUserLoggedIn()) {
                showToast('Vui lòng đăng nhập để đăng tác phẩm', 'warning');
                return;
            }
            var modal = new bootstrap.Modal(document.getElementById('submitArtworkModal'));
            modal.show();
        });
    }

    var form = document.getElementById('submit-artwork-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            handleArtworkSubmit();
        });
    }
}

/**
 * Xử lý gửi yêu cầu đăng tác phẩm
 * Thu thập dữ liệu form → gọi submissions.submit() → hiện kết quả → đóng modal
 */
function handleArtworkSubmit() {
    var user = auth.getCurrentUser();
    if (!user) return;

    var data = {
        title:       document.getElementById('sub-title').value,
        artist:      document.getElementById('sub-artist').value,
        style:       document.getElementById('sub-style').value,
        story:       document.getElementById('sub-story').value,
        imageUrl:    document.getElementById('sub-imageUrl').value,
        submittedBy: { id: user.id, email: user.email, fullName: user.fullName }
    };

    var result    = submissions.submit(data); // Lưu vào localStorage qua collections.js
    var feedbackEl = document.getElementById('submit-feedback');

    if (feedbackEl) {
        // Hiển thị kết quả thành công/thất bại
        feedbackEl.className   = 'alert ' + (result.success ? 'alert-success' : 'alert-danger') + ' mt-3';
        feedbackEl.textContent = result.message;
        feedbackEl.style.display = 'block';
    }

    if (result.success) {
        document.getElementById('submit-artwork-form').reset();
        // Tự đóng modal sau 2.5 giây
        setTimeout(function () {
            if (feedbackEl) feedbackEl.style.display = 'none';
            bootstrap.Modal.getInstance(document.getElementById('submitArtworkModal')).hide();
        }, 2500);
    }
}

/* ══════════════════════════════════════
   GIAO DIỆN NAVBAR THEO TRẠNG THÁI ĐĂNG NHẬP
══════════════════════════════════════ */

/**
 * Cập nhật navbar dựa trên trạng thái đăng nhập:
 * - Chưa đăng nhập: hiện link "Đăng nhập", ẩn menu user và các tính năng cần auth
 * - Đã đăng nhập:   hiện tên user, ẩn link "Đăng nhập", hiện các tính năng
 */
function updateNavUserUI() {
    var userMenu       = document.getElementById('user-menu');
    var loginLink      = document.getElementById('login-link');
    var collectionsBtn = document.getElementById('nav-collections-item');
    var submitBtn      = document.getElementById('nav-submit-item');

    if (auth.isUserLoggedIn()) {
        var user    = auth.getCurrentUser();
        var nameEl  = document.getElementById('user-display-name');
        var emailEl = document.getElementById('user-email-display');
        if (nameEl)  nameEl.textContent  = user.fullName || user.email;
        if (emailEl) emailEl.textContent = user.email;
        if (userMenu)       userMenu.style.display       = 'block';
        if (loginLink)      loginLink.style.display      = 'none';
        if (collectionsBtn) collectionsBtn.style.display = 'block';
        if (submitBtn)      submitBtn.style.display      = 'block';
    } else {
        if (userMenu)       userMenu.style.display       = 'none';
        if (loginLink)      loginLink.style.display      = 'block';
        if (collectionsBtn) collectionsBtn.style.display = 'none';
        if (submitBtn)      submitBtn.style.display      = 'none';
    }
}

/** Đăng xuất người dùng và tải lại trang để reset UI */
function logoutUser() {
    auth.logoutUser();
    location.reload();
}

/* ══════════════════════════════════════
   CHẾ ĐỘ SÁNG / TỐI
══════════════════════════════════════ */
function getSavedTheme() {
    return localStorage.getItem('artgallery-theme');
}

function getPreferredTheme() {
    var saved = getSavedTheme();
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeToggleLabel(theme) {
    var button = document.getElementById('theme-toggle');
    if (!button) return;
    if (theme === 'dark') {
        button.innerHTML = '<i class="bi bi-sun-fill"></i> Sáng';
        button.title = 'Chuyển sang chế độ sáng';
    } else {
        button.innerHTML = '<i class="bi bi-moon-stars-fill"></i> Tối';
        button.title = 'Chuyển sang chế độ tối';
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('artgallery-theme', theme);
    updateThemeToggleLabel(theme);
}

function initThemeSwitcher() {
    var button = document.getElementById('theme-toggle');
    if (!button) return;
    button.addEventListener('click', function (event) {
        event.preventDefault();
        var current = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });
    applyTheme(getPreferredTheme());
}

/* ══════════════════════════════════════
   TOAST NOTIFICATION (Thông báo nổi)
══════════════════════════════════════ */

/**
 * Hiển thị thông báo nhỏ ở góc dưới phải màn hình
 * Tự động biến mất sau 3 giây
 *
 * @param {string} message - Nội dung thông báo
 * @param {string} type    - 'success' | 'warning' | 'danger' | 'info'
 */
function showToast(message, type) {
    type = type || 'info';

    // Map kiểu → icon Bootstrap và màu border trái
    var iconMap  = { success: 'check-circle-fill', warning: 'exclamation-triangle-fill', danger: 'x-circle-fill', info: 'info-circle-fill' };
    var colorMap = { success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6' };

    var toast = document.createElement('div');
    toast.className = 'gallery-toast';
    // Inline style để toast hoạt động độc lập, không phụ thuộc CSS file
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#1e293b;color:#fff;' +
        'padding:.75rem 1.25rem;border-radius:12px;display:flex;align-items:center;gap:.6rem;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);font-size:.9rem;min-width:220px;max-width:340px;' +
        'border-left:4px solid ' + colorMap[type] + ';animation:slideInToast .3s ease;';
    toast.innerHTML = '<i class="bi bi-' + (iconMap[type] || 'info-circle-fill') + '" style="color:' + colorMap[type] + ';font-size:1.1rem;flex-shrink:0"></i>' +
        '<span>' + message + '</span>';

    document.body.appendChild(toast);

    // Sau 3 giây: fade-out rồi xóa khỏi DOM
    setTimeout(function () {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all .3s ease';
        setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
}

/* ══════════════════════════════════════
   TÌM KIẾM REALTIME
══════════════════════════════════════ */

/**
 * Gắn sự kiện cho ô tìm kiếm:
 * - Nhập text: debounce 300ms rồi filter & render
 * - Nhấn nút X: xóa tìm kiếm, reset gallery
 */
function setupSearch() {
    var searchInput = document.getElementById('search-input');
    var clearBtn    = document.getElementById('search-clear');
    if (!searchInput) return;

    var debounceTimer = null; // Timer để debounce (tránh gọi render liên tục khi gõ nhanh)

    searchInput.addEventListener('input', function () {
        var value     = searchInput.value;
        currentSearch = value;

        // Hiện/ẩn nút X tùy theo ô có nội dung không
        if (clearBtn) clearBtn.style.display = value.length > 0 ? 'block' : 'none';

        // Debounce: đợi 300ms sau khi ngừng gõ mới thực hiện filter
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            var grid = document.getElementById('gallery-grid');
            grid.classList.add('fade-transition'); // CSS transition mờ dần
            setTimeout(function () {
                applyFiltersAndRender();
                grid.classList.remove('fade-transition');
            }, 200);
        }, 300);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            searchInput.value = '';
            currentSearch     = '';
            clearBtn.style.display = 'none';
            applyFiltersAndRender();
            searchInput.focus(); // Giữ focus sau khi xóa để UX mượt
        });
    }
}

/**
 * Hiển thị thông tin kết quả tìm kiếm bên dưới ô search
 * Chỉ hiện khi đang có từ khóa tìm kiếm
 *
 * @param {number} count - Số tác phẩm tìm được
 */
function updateSearchInfo(count) {
    var infoEl = document.getElementById('search-results-info');
    if (!infoEl) return;
    if (currentSearch.trim() !== '') {
        infoEl.innerHTML = 'Tìm thấy <span class="highlight">' + count + '</span> tác phẩm cho "' + currentSearch + '"';
    } else {
        infoEl.innerHTML = ''; // Ẩn khi không tìm kiếm
    }
}

/* ══════════════════════════════════════
   BỘ LỌC PHONG CÁCH
══════════════════════════════════════ */

/**
 * Gắn sự kiện click cho các nút lọc phong cách
 * Dùng event delegation: lắng nghe trên container thay vì từng nút
 */
function setupFilterButtons() {
    var filterContainer = document.getElementById('filter-bar');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', function (e) {
        // Tìm nút filter gần nhất được click (hỗ trợ click vào icon bên trong nút)
        var btn = e.target.closest('.filter-btn');
        if (!btn) return;

        currentFilter = btn.getAttribute('data-style');

        // Cập nhật trạng thái active: xóa rồi đặt lại
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Hiệu ứng fade khi chuyển bộ lọc
        var grid = document.getElementById('gallery-grid');
        grid.classList.add('fade-transition');
        setTimeout(function () {
            applyFiltersAndRender();
            grid.classList.remove('fade-transition');
        }, 250);
    });
}

/* ══════════════════════════════════════
   NÚT THÍCH (LIKE)
══════════════════════════════════════ */

/** Gắn sự kiện click cho tất cả nút like trên gallery hiện tại */
function setupLikeButtons() {
    document.querySelectorAll('.btn-like').forEach(btn => btn.addEventListener('click', handleLikeClick));
}

/**
 * Xử lý click nút like:
 * 1. Tăng count trên UI ngay lập tức (optimistic update — UX mượt)
 * 2. Gọi API PUT để lưu lên server
 * 3. Nếu API thất bại → rollback về số cũ
 *
 * @param {Event} e - Click event
 */
function handleLikeClick(e) {
    var btn          = e.currentTarget;
    var id           = btn.getAttribute('data-id');
    var currentLikes = parseInt(btn.getAttribute('data-likes'), 10) || 0;
    var newLikes     = currentLikes + 1;
    var countSpan    = btn.querySelector('.like-count');

    // Cập nhật UI ngay (không đợi API) → cảm giác phản hồi tức thì
    countSpan.textContent = newLikes;
    btn.setAttribute('data-likes', newLikes);

    // Hiệu ứng pulse dùng jQuery (đây là chỗ duy nhất dùng jQuery trong dự án)
    $(btn).addClass('liked-pulse');
    setTimeout(function () { $(btn).removeClass('liked-pulse'); }, 600);

    // Gọi API để lưu lên server
    API.updateArtwork(id, { likes: newLikes })
        .then(function (updated) {
            // Đồng bộ cache local với giá trị server trả về
            for (var i = 0; i < allArtworks.length; i++) {
                if (String(allArtworks[i].id) === String(id)) {
                    allArtworks[i].likes = updated.likes || newLikes;
                    break;
                }
            }
        })
        .catch(function () {
            // API thất bại → rollback về số cũ trên UI
            countSpan.textContent = currentLikes;
            btn.setAttribute('data-likes', currentLikes);
        });
}

/* ══════════════════════════════════════
   MODAL CHI TIẾT TÁC PHẨM
══════════════════════════════════════ */

/**
 * Mở modal xem chi tiết tác phẩm
 * Điền thông tin từ cache allArtworks (không cần gọi API thêm)
 *
 * @param {string|number} id - ID tác phẩm cần xem
 */
function openArtworkModal(id) {
    var artwork = allArtworks.find(a => String(a.id) === String(id));
    if (!artwork) return;

    // Điền thông tin vào các element trong modal
    document.getElementById('modal-img').src               = getImageUrl(artwork.imageUrl, artwork.id);
    document.getElementById('modal-title').textContent     = artwork.title  || 'Untitled';
    document.getElementById('modal-artist').textContent    = artwork.artist || 'Unknown';
    document.getElementById('modal-style').textContent     = artwork.style  || 'N/A';
    document.getElementById('modal-likes').textContent     = artwork.likes  || 0;

    // Ẩn phần "Cốt truyện" nếu tác phẩm không có story
    var storyEl      = document.getElementById('modal-story');
    var storyHeading = storyEl ? storyEl.previousElementSibling : null;
    if (storyEl) {
        if (artwork.story) {
            storyEl.textContent  = artwork.story;
            storyEl.style.display = 'block';
            if (storyHeading) storyHeading.style.display = 'block';
        } else {
            storyEl.style.display  = 'none';
            if (storyHeading) storyHeading.style.display = 'none';
        }
    }

    new bootstrap.Modal(document.getElementById('artworkModal')).show();
}

/* ══════════════════════════════════════
   TIỆN ÍCH GIAO DIỆN
══════════════════════════════════════ */

/**
 * Hiển thị hoặc ẩn spinner loading và lưới gallery
 * @param {boolean} show - true = đang tải, false = tải xong
 */
function showLoading(show) {
    var loader  = document.getElementById('loading-spinner');
    var gallery = document.getElementById('gallery-grid');
    if (loader)  loader.style.display  = show ? 'flex' : 'none';
    if (gallery) gallery.style.display = show ? 'none' : '';
}

/** Hiển thị banner lỗi bên trên gallery */
function showError(message) {
    var errorBanner = document.getElementById('error-banner');
    if (errorBanner) { errorBanner.textContent = message; errorBanner.style.display = 'block'; }
}

/** Ẩn banner lỗi */
function hideError() {
    var errorBanner = document.getElementById('error-banner');
    if (errorBanner) errorBanner.style.display = 'none';
}

/* ══════════════════════════════════════
   CHATBOT
══════════════════════════════════════ */

/**
 * Khởi tạo chatbot hỏi đáp đơn giản (rule-based, không dùng AI API)
 * Gắn sự kiện toggle, gửi tin nhắn, phím Enter
 */
function setupChatbot() {
    var widget  = document.getElementById('chatbot-widget');
    var toggler = document.getElementById('chatbot-toggler');
    var closeBtn = document.getElementById('chatbot-close');
    var sendBtn = document.getElementById('chatbot-send');
    var inputEl = document.getElementById('chatbot-input');
    var bodyEl  = document.getElementById('chatbot-body');
    if (!widget) return;

    /** Mở/đóng cửa sổ chat */
    function toggleChat() {
        widget.classList.toggle('open');
        if (widget.classList.contains('open') && inputEl) inputEl.focus();
    }

    if (toggler)  toggler.addEventListener('click', toggleChat);
    if (closeBtn) closeBtn.addEventListener('click', toggleChat);

    /**
     * Thêm tin nhắn vào cửa sổ chat
     * @param {string}  text   - Nội dung tin nhắn
     * @param {boolean} isUser - true = người dùng gửi, false = bot trả lời
     */
    function addMessage(text, isUser) {
        var msgDiv       = document.createElement('div');
        msgDiv.className = 'chat-msg ' + (isUser ? 'user-msg' : 'bot-msg');
        msgDiv.textContent = text;
        bodyEl.appendChild(msgDiv);
        bodyEl.scrollTop = bodyEl.scrollHeight; // Cuộn xuống tin nhắn mới nhất
    }

    /**
     * Xử lý tin nhắn người dùng gửi
     * Dùng keyword matching đơn giản để tìm câu trả lời phù hợp
     */
    function processMessage() {
        var text = inputEl.value.trim();
        if (!text) return;

        addMessage(text, true); // Hiện tin nhắn người dùng
        inputEl.value = '';     // Xóa ô nhập sau khi gửi

        // Delay 250ms để giả lập bot "đang gõ"
        setTimeout(function () {
            var q = text.toLowerCase();
            var response = 'Cảm ơn bạn! Hãy sử dụng thanh tìm kiếm phía trên để tìm tác phẩm nghệ thuật nhé.';

            // Phân tích từ khóa để chọn câu trả lời phù hợp
            if      (q.includes('bộ sưu tập') || q.includes('lưu'))           response = 'Bạn có thể lưu tác phẩm yêu thích bằng cách nhấn biểu tượng 🔖 trên mỗi thẻ tác phẩm!';
            else if (q.includes('đăng') || q.includes('tải lên') || q.includes('upload')) response = 'Bạn muốn đăng tác phẩm? Nhấn "Đăng tác phẩm" trên thanh điều hướng (cần đăng nhập trước).';
            else if (q.includes('giá') || q.includes('mua'))                   response = 'ArtGallery hiện tập trung triển lãm trực tuyến. Chức năng mua bán sẽ sớm ra mắt!';
            else if (q.includes('chào') || q.includes('hello') || q.includes('hi')) response = 'Chào bạn! Chúc bạn thưởng thức nghệ thuật vui vẻ 🎨';
            else if (q.includes('liên hệ'))                                    response = 'Liên hệ qua email: contact@artgallery.vn';

            addMessage(response, false); // Hiện câu trả lời của bot
        }, 250);
    }

    if (sendBtn) sendBtn.addEventListener('click', processMessage);
    // Cho phép gửi bằng phím Enter (thuận tiện hơn trên desktop)
    if (inputEl) inputEl.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') processMessage();
    });
}