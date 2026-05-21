/**
 * main.js — Logic for index.html (Public Gallery)
 * Includes: gallery display, filters, search, chatbot,
 *           user collections (bookmark folders), artwork submission
 */

var allArtworks = [];
var currentFilter = 'all';
var currentSearch = '';
var collectionPickerArtworkId = null; // artwork being bookmarked

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    loadGallery();
    setupFilterButtons();
    setupSearch();
    setupChatbot();
    setupCollectionsModal();
    setupSubmitModal();
    updateNavUserUI();
});

/* ══════════════════════════════════════
   GALLERY LOAD & RENDER
══════════════════════════════════════ */
function loadGallery() {
    showLoading(true);
    hideError();

    API.getArtworks()
        .then(function (data) {
            allArtworks = data;
            applyFiltersAndRender();
            showLoading(false);
        })
        .catch(function (error) {
            showLoading(false);
            showError('Không thể tải tác phẩm. Vui lòng thử lại sau.');
            console.error('Load gallery error:', error);
        });
}

function applyFiltersAndRender() {
    var result = filterApproved(allArtworks);
    if (currentFilter !== 'all') result = filterByStyle(result, currentFilter);
    if (currentSearch.trim() !== '') result = searchArtworks(result, currentSearch);
    renderArtworks(result);
    updateSearchInfo(result.length);
}

function filterApproved(artworks) {
    return artworks.filter(a => a.status === 'approved' || a.approved === true);
}

function filterByStyle(artworks, style) {
    if (!style || style === 'all') return artworks;
    return artworks.filter(a => a.style === style);
}

function searchArtworks(artworks, query) {
    var q = query.toLowerCase().trim();
    if (!q) return artworks;
    return artworks.filter(function (a) {
        return (a.title || '').toLowerCase().includes(q) ||
               (a.artist || '').toLowerCase().includes(q) ||
               (a.style || '').toLowerCase().includes(q);
    });
}

function renderArtworks(data) {
    var container = document.getElementById('gallery-grid');
    if (!container) return;

    var user = auth.getCurrentUser();
    var userId = user ? user.id : null;

    if (data.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5">' +
            '<i class="bi bi-palette fs-1 text-gold"></i>' +
            '<p class="mt-3 text-muted-light">Không tìm thấy tác phẩm nào.</p>' +
            '</div>';
        return;
    }

    var html = '';
    data.forEach(function (artwork) {
        var imgUrl = getImageUrl(artwork.imageUrl, artwork.id);
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
        html += '        <button class="btn-like" data-id="' + artwork.id + '" data-likes="' + (artwork.likes || 0) + '">';
        html += '          <i class="bi bi-heart-fill"></i>';
        html += '          <span class="like-count">' + (artwork.likes || 0) + '</span>';
        html += '        </button>';
        html += '        <button class="btn-bookmark ' + (isBookmarked ? 'bookmarked' : '') + '" data-id="' + artwork.id + '" title="' + (isBookmarked ? 'Đã lưu' : 'Lưu vào bộ sưu tập') + '">';
        html += '          <i class="bi bi-bookmark' + (isBookmarked ? '-fill' : '') + '"></i>';
        html += '        </button>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    });

    container.innerHTML = html;

    // Staggered fade-in
    var cards = container.querySelectorAll('.artwork-card-wrapper');
    cards.forEach(function (card, i) {
        setTimeout(function () { card.classList.add('visible'); }, i * 50);
    });

    setupLikeButtons();
    setupBookmarkButtons();
}

/* ══════════════════════════════════════
   BOOKMARK / COLLECTION PICKER
══════════════════════════════════════ */
function setupBookmarkButtons() {
    document.querySelectorAll('.btn-bookmark').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var id = this.getAttribute('data-id');
            handleBookmarkClick(id, this);
        });
    });
}

function handleBookmarkClick(artworkId, btnEl) {
    if (!auth.isUserLoggedIn()) {
        showToast('Vui lòng đăng nhập để lưu tác phẩm', 'warning');
        return;
    }
    collectionPickerArtworkId = artworkId;
    openCollectionPicker(artworkId, btnEl);
}

function openCollectionPicker(artworkId, anchorEl) {
    // Remove any existing picker
    var existing = document.getElementById('collection-picker');
    if (existing) existing.remove();

    var user = auth.getCurrentUser();
    var userCollections = collections.getUserCollections(user.id);
    var folderNames = Object.keys(userCollections);

    var picker = document.createElement('div');
    picker.id = 'collection-picker';
    picker.className = 'collection-picker';

    var headerHtml = '<div class="cp-header"><span><i class="bi bi-bookmark-plus me-1"></i> Lưu vào thư mục</span>' +
        '<button class="cp-close" onclick="closeCollectionPicker()"><i class="bi bi-x"></i></button></div>';

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

    var createHtml = '<div class="cp-create">' +
        '<input type="text" id="cp-new-folder-input" class="cp-input" placeholder="Tên thư mục mới..." maxlength="40">' +
        '<button class="cp-create-btn" onclick="createFolderFromPicker()"><i class="bi bi-plus-lg"></i></button>' +
        '</div>';

    picker.innerHTML = headerHtml + '<div class="cp-folders">' + foldersHtml + '</div>' + createHtml;

    // Position near anchor
    document.body.appendChild(picker);
    var rect = anchorEl.getBoundingClientRect();
    var scrollY = window.scrollY || window.pageYOffset;
    picker.style.top = (rect.bottom + scrollY + 8) + 'px';
    picker.style.left = Math.min(rect.left, window.innerWidth - 230) + 'px';

    // Close on outside click
    setTimeout(function () {
        document.addEventListener('click', closePikerOnOutside);
    }, 50);
}

function closePikerOnOutside(e) {
    var picker = document.getElementById('collection-picker');
    if (picker && !picker.contains(e.target)) {
        closeCollectionPicker();
    }
}

function closeCollectionPicker() {
    var picker = document.getElementById('collection-picker');
    if (picker) picker.remove();
    document.removeEventListener('click', closePikerOnOutside);
}

function toggleArtworkInFolder(folderName) {
    var user = auth.getCurrentUser();
    var id = collectionPickerArtworkId;
    if (!user || !id) return;

    if (collections.isInCollection(user.id, folderName, id)) {
        collections.removeFromCollection(user.id, folderName, id);
        showToast('Đã xóa khỏi "' + folderName + '"', 'info');
    } else {
        var result = collections.addToCollection(user.id, folderName, id);
        showToast(result.message, result.success ? 'success' : 'warning');
    }

    // Refresh picker and card bookmark icon
    var anchorEl = document.querySelector('.btn-bookmark[data-id="' + id + '"]');
    if (anchorEl) {
        var isBookmarked = collections.isInAnyCollection(user.id, id);
        anchorEl.classList.toggle('bookmarked', isBookmarked);
        anchorEl.querySelector('i').className = 'bi bi-bookmark' + (isBookmarked ? '-fill' : '');
    }

    // Re-render picker
    if (anchorEl) openCollectionPicker(id, anchorEl);
}

function createFolderFromPicker() {
    var input = document.getElementById('cp-new-folder-input');
    if (!input) return;
    var name = input.value.trim();
    var user = auth.getCurrentUser();
    if (!user) return;

    var result = collections.createCollection(user.id, name);
    if (!result.success) { showToast(result.message, 'warning'); return; }

    // Auto-add current artwork to new folder
    if (collectionPickerArtworkId) {
        collections.addToCollection(user.id, name, collectionPickerArtworkId);
    }
    showToast('Đã tạo & thêm vào "' + name + '"', 'success');

    var anchorEl = document.querySelector('.btn-bookmark[data-id="' + collectionPickerArtworkId + '"]');
    if (anchorEl) {
        anchorEl.classList.add('bookmarked');
        anchorEl.querySelector('i').className = 'bi bi-bookmark-fill';
        openCollectionPicker(collectionPickerArtworkId, anchorEl);
    }
}

/* ══════════════════════════════════════
   COLLECTIONS MODAL (My Collections)
══════════════════════════════════════ */
function setupCollectionsModal() {
    var openBtn = document.getElementById('btn-my-collections');
    if (openBtn) {
        openBtn.addEventListener('click', function (e) {
            e.preventDefault();
            openMyCollectionsModal();
        });
    }
}

function openMyCollectionsModal() {
    if (!auth.isUserLoggedIn()) {
        showToast('Vui lòng đăng nhập để xem bộ sưu tập', 'warning');
        return;
    }
    renderCollectionsModal();
    var modal = new bootstrap.Modal(document.getElementById('collectionsModal'));
    modal.show();
}

function renderCollectionsModal(activeFolder) {
    var user = auth.getCurrentUser();
    var userCollections = collections.getUserCollections(user.id);
    var folderNames = Object.keys(userCollections);

    var sidebarEl = document.getElementById('cm-folders-list');
    var contentEl = document.getElementById('cm-folder-content');
    var badgeEl = document.getElementById('cm-total-badge');

    if (badgeEl) badgeEl.textContent = collections.getTotalSaved(user.id);

    // Sidebar folders
    if (sidebarEl) {
        if (folderNames.length === 0) {
            sidebarEl.innerHTML = '<p class="cm-empty-hint">Chưa có thư mục nào.<br>Nhấn <strong>+</strong> để tạo.</p>';
        } else {
            sidebarEl.innerHTML = folderNames.map(function (name) {
                var count = userCollections[name].length;
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

    // Content area
    if (contentEl) {
        if (!activeFolder || !userCollections[activeFolder]) {
            if (folderNames.length === 0) {
                contentEl.innerHTML = '<div class="cm-empty"><i class="bi bi-bookmark-star fs-1"></i><p>Bắt đầu lưu tác phẩm yêu thích vào thư mục!</p></div>';
            } else {
                contentEl.innerHTML = '<div class="cm-empty"><i class="bi bi-folder2-open fs-1"></i><p>Chọn một thư mục bên trái để xem.</p></div>';
            }
            return;
        }

        var ids = userCollections[activeFolder];
        var artworksInFolder = allArtworks.filter(a => ids.includes(String(a.id)));

        if (artworksInFolder.length === 0) {
            contentEl.innerHTML = '<div class="cm-empty"><i class="bi bi-inbox fs-1"></i><p>Thư mục này chưa có tác phẩm nào.</p></div>';
            return;
        }

        contentEl.innerHTML = '<div class="cm-grid">' + artworksInFolder.map(function (a) {
            var imgUrl = getImageUrl(a.imageUrl, a.id);
            return '<div class="cm-card">' +
                '<img src="' + imgUrl + '" alt="' + (a.title || '') + '" onerror="this.src=\'https://picsum.photos/seed/fb' + a.id + '/300/400\'" onclick="openArtworkModal(\'' + a.id + '\')">' +
                '<div class="cm-card-info">' +
                '<span class="cm-card-title">' + (a.title || 'Untitled') + '</span>' +
                '<span class="cm-card-artist">' + (a.artist || '') + '</span>' +
                '</div>' +
                '<button class="cm-remove-btn" title="Xóa khỏi thư mục" onclick="removeFromFolderModal(\'' + activeFolder + '\', \'' + a.id + '\')">' +
                '<i class="bi bi-x-circle-fill"></i></button>' +
                '</div>';
        }).join('') + '</div>';
    }
}

function deleteFolderFromModal(e, folderName) {
    e.stopPropagation();
    if (!confirm('Xóa thư mục "' + folderName + '"? (Tác phẩm sẽ không bị xóa khỏi gallery)')) return;
    var user = auth.getCurrentUser();
    collections.deleteCollection(user.id, folderName);
    renderCollectionsModal();
    showToast('Đã xóa thư mục "' + folderName + '"', 'info');
}

function removeFromFolderModal(folderName, artworkId) {
    var user = auth.getCurrentUser();
    collections.removeFromCollection(user.id, folderName, artworkId);

    // Update card icon in gallery
    var cardBtn = document.querySelector('.btn-bookmark[data-id="' + artworkId + '"]');
    if (cardBtn) {
        var isStillBookmarked = collections.isInAnyCollection(user.id, artworkId);
        cardBtn.classList.toggle('bookmarked', isStillBookmarked);
        cardBtn.querySelector('i').className = 'bi bi-bookmark' + (isStillBookmarked ? '-fill' : '');
    }
    renderCollectionsModal(folderName);
}

function createCollectionFromModal() {
    var input = document.getElementById('cm-new-folder-input');
    if (!input) return;
    var name = input.value.trim();
    var user = auth.getCurrentUser();
    var result = collections.createCollection(user.id, name);
    if (result.success) {
        input.value = '';
        renderCollectionsModal(name);
        showToast(result.message, 'success');
    } else {
        showToast(result.message, 'warning');
    }
}

/* ══════════════════════════════════════
   SUBMIT ARTWORK MODAL
══════════════════════════════════════ */
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

function handleArtworkSubmit() {
    var user = auth.getCurrentUser();
    if (!user) return;

    var data = {
        title: document.getElementById('sub-title').value,
        artist: document.getElementById('sub-artist').value,
        style: document.getElementById('sub-style').value,
        story: document.getElementById('sub-story').value,
        imageUrl: document.getElementById('sub-imageUrl').value,
        submittedBy: { id: user.id, email: user.email, fullName: user.fullName }
    };

    var result = submissions.submit(data);
    var feedbackEl = document.getElementById('submit-feedback');
    if (feedbackEl) {
        feedbackEl.className = 'alert ' + (result.success ? 'alert-success' : 'alert-danger') + ' mt-3';
        feedbackEl.textContent = result.message;
        feedbackEl.style.display = 'block';
    }

    if (result.success) {
        document.getElementById('submit-artwork-form').reset();
        setTimeout(function () {
            if (feedbackEl) feedbackEl.style.display = 'none';
            bootstrap.Modal.getInstance(document.getElementById('submitArtworkModal')).hide();
        }, 2500);
    }
}

/* ══════════════════════════════════════
   NAV USER UI
══════════════════════════════════════ */
function updateNavUserUI() {
    var userMenu = document.getElementById('user-menu');
    var loginLink = document.getElementById('login-link');
    var collectionsBtn = document.getElementById('nav-collections-item');
    var submitBtn = document.getElementById('nav-submit-item');

    if (auth.isUserLoggedIn()) {
        var user = auth.getCurrentUser();
        var nameEl = document.getElementById('user-display-name');
        var emailEl = document.getElementById('user-email-display');
        if (nameEl) nameEl.textContent = user.fullName || user.email;
        if (emailEl) emailEl.textContent = user.email;
        if (userMenu) userMenu.style.display = 'block';
        if (loginLink) loginLink.style.display = 'none';
        if (collectionsBtn) collectionsBtn.style.display = 'block';
        if (submitBtn) submitBtn.style.display = 'block';
    } else {
        if (userMenu) userMenu.style.display = 'none';
        if (loginLink) loginLink.style.display = 'block';
        if (collectionsBtn) collectionsBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'none';
    }
}

function logoutUser() {
    auth.logoutUser();
    location.reload();
}

/* ══════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════ */
function showToast(message, type) {
    type = type || 'info';
    var iconMap = { success: 'check-circle-fill', warning: 'exclamation-triangle-fill', danger: 'x-circle-fill', info: 'info-circle-fill' };
    var colorMap = { success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6' };

    var toast = document.createElement('div');
    toast.className = 'gallery-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#1e293b;color:#fff;' +
        'padding:.75rem 1.25rem;border-radius:12px;display:flex;align-items:center;gap:.6rem;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);font-size:.9rem;min-width:220px;max-width:340px;' +
        'border-left:4px solid ' + colorMap[type] + ';animation:slideInToast .3s ease;';
    toast.innerHTML = '<i class="bi bi-' + (iconMap[type] || 'info-circle-fill') + '" style="color:' + colorMap[type] + ';font-size:1.1rem;flex-shrink:0"></i>' +
        '<span>' + message + '</span>';
    document.body.appendChild(toast);

    setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all .3s ease';
        setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
}

/* ══════════════════════════════════════
   SEARCH
══════════════════════════════════════ */
function setupSearch() {
    var searchInput = document.getElementById('search-input');
    var clearBtn = document.getElementById('search-clear');
    if (!searchInput) return;

    var debounceTimer = null;

    searchInput.addEventListener('input', function () {
        var value = searchInput.value;
        currentSearch = value;
        if (clearBtn) clearBtn.style.display = value.length > 0 ? 'block' : 'none';

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            var grid = document.getElementById('gallery-grid');
            grid.classList.add('fade-transition');
            setTimeout(function () {
                applyFiltersAndRender();
                grid.classList.remove('fade-transition');
            }, 200);
        }, 300);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            searchInput.value = '';
            currentSearch = '';
            clearBtn.style.display = 'none';
            applyFiltersAndRender();
            searchInput.focus();
        });
    }
}

function updateSearchInfo(count) {
    var infoEl = document.getElementById('search-results-info');
    if (!infoEl) return;
    if (currentSearch.trim() !== '') {
        infoEl.innerHTML = 'Tìm thấy <span class="highlight">' + count + '</span> tác phẩm cho "' + currentSearch + '"';
    } else {
        infoEl.innerHTML = '';
    }
}

/* ══════════════════════════════════════
   FILTERS
══════════════════════════════════════ */
function setupFilterButtons() {
    var filterContainer = document.getElementById('filter-bar');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter-btn');
        if (!btn) return;
        currentFilter = btn.getAttribute('data-style');
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        var grid = document.getElementById('gallery-grid');
        grid.classList.add('fade-transition');
        setTimeout(function () { applyFiltersAndRender(); grid.classList.remove('fade-transition'); }, 250);
    });
}

/* ══════════════════════════════════════
   LIKE BUTTONS
══════════════════════════════════════ */
function setupLikeButtons() {
    document.querySelectorAll('.btn-like').forEach(btn => btn.addEventListener('click', handleLikeClick));
}

function handleLikeClick(e) {
    var btn = e.currentTarget;
    var id = btn.getAttribute('data-id');
    var currentLikes = parseInt(btn.getAttribute('data-likes'), 10) || 0;
    var newLikes = currentLikes + 1;
    var countSpan = btn.querySelector('.like-count');
    countSpan.textContent = newLikes;
    btn.setAttribute('data-likes', newLikes);

    $(btn).addClass('liked-pulse');
    setTimeout(function () { $(btn).removeClass('liked-pulse'); }, 600);

    API.updateArtwork(id, { likes: newLikes })
        .then(function (updated) {
            for (var i = 0; i < allArtworks.length; i++) {
                if (String(allArtworks[i].id) === String(id)) {
                    allArtworks[i].likes = updated.likes || newLikes;
                    break;
                }
            }
        })
        .catch(function () {
            countSpan.textContent = currentLikes;
            btn.setAttribute('data-likes', currentLikes);
        });
}

/* ══════════════════════════════════════
   ARTWORK MODAL
══════════════════════════════════════ */
function openArtworkModal(id) {
    var artwork = allArtworks.find(a => String(a.id) === String(id));
    if (!artwork) return;

    document.getElementById('modal-img').src = getImageUrl(artwork.imageUrl, artwork.id);
    document.getElementById('modal-title').textContent = artwork.title || 'Untitled';
    document.getElementById('modal-artist').textContent = artwork.artist || 'Unknown';
    document.getElementById('modal-style').textContent = artwork.style || 'N/A';
    document.getElementById('modal-likes').textContent = artwork.likes || 0;

    var storyEl = document.getElementById('modal-story');
    var storyHeading = storyEl ? storyEl.previousElementSibling : null;
    if (storyEl) {
        if (artwork.story) {
            storyEl.textContent = artwork.story;
            storyEl.style.display = 'block';
            if (storyHeading) storyHeading.style.display = 'block';
        } else {
            storyEl.style.display = 'none';
            if (storyHeading) storyHeading.style.display = 'none';
        }
    }

    new bootstrap.Modal(document.getElementById('artworkModal')).show();
}

/* ══════════════════════════════════════
   UTILITY
══════════════════════════════════════ */
function showLoading(show) {
    var loader = document.getElementById('loading-spinner');
    var gallery = document.getElementById('gallery-grid');
    if (loader) loader.style.display = show ? 'flex' : 'none';
    if (gallery) gallery.style.display = show ? 'none' : '';
}

function showError(message) {
    var errorBanner = document.getElementById('error-banner');
    if (errorBanner) { errorBanner.textContent = message; errorBanner.style.display = 'block'; }
}

function hideError() {
    var errorBanner = document.getElementById('error-banner');
    if (errorBanner) errorBanner.style.display = 'none';
}

/* ══════════════════════════════════════
   CHATBOT
══════════════════════════════════════ */
function setupChatbot() {
    var widget = document.getElementById('chatbot-widget');
    var toggler = document.getElementById('chatbot-toggler');
    var closeBtn = document.getElementById('chatbot-close');
    var sendBtn = document.getElementById('chatbot-send');
    var inputEl = document.getElementById('chatbot-input');
    var bodyEl = document.getElementById('chatbot-body');
    if (!widget) return;

    function toggleChat() {
        widget.classList.toggle('open');
        if (widget.classList.contains('open') && inputEl) inputEl.focus();
    }

    if (toggler) toggler.addEventListener('click', toggleChat);
    if (closeBtn) closeBtn.addEventListener('click', toggleChat);

    function addMessage(text, isUser) {
        var msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg ' + (isUser ? 'user-msg' : 'bot-msg');
        msgDiv.textContent = text;
        bodyEl.appendChild(msgDiv);
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function processMessage() {
        var text = inputEl.value.trim();
        if (!text) return;
        addMessage(text, true);
        inputEl.value = '';
        setTimeout(function () {
            var q = text.toLowerCase();
            var response = 'Cảm ơn bạn! Hãy sử dụng thanh tìm kiếm phía trên để tìm tác phẩm nghệ thuật nhé.';
            if (q.includes('bộ sưu tập') || q.includes('lưu')) response = 'Bạn có thể lưu tác phẩm yêu thích bằng cách nhấn biểu tượng 🔖 trên mỗi thẻ tác phẩm!';
            else if (q.includes('đăng') || q.includes('tải lên') || q.includes('upload')) response = 'Bạn muốn đăng tác phẩm? Nhấn "Đăng tác phẩm" trên thanh điều hướng (cần đăng nhập trước).';
            else if (q.includes('giá') || q.includes('mua')) response = 'ArtGallery hiện tập trung triển lãm trực tuyến. Chức năng mua bán sẽ sớm ra mắt!';
            else if (q.includes('chào') || q.includes('hello') || q.includes('hi')) response = 'Chào bạn! Chúc bạn thưởng thức nghệ thuật vui vẻ 🎨';
            else if (q.includes('liên hệ')) response = 'Liên hệ qua email: contact@artgallery.vn';
            addMessage(response, false);
        }, 250);
    }

    if (sendBtn) sendBtn.addEventListener('click', processMessage);
    if (inputEl) inputEl.addEventListener('keypress', function (e) { if (e.key === 'Enter') processMessage(); });
}