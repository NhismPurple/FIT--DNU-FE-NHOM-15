/**
 * collections.js — ArtGallery
 * Quản lý bộ sưu tập cá nhân của người dùng
 *
 * Cấu trúc lưu trong localStorage:
 * artgallery_collections_{userId} = {
 *   folders: [{ id, name, createdAt }],
 *   items:   [{ artworkId, folderId, addedAt, artworkData }]
 * }
 */

const collections = {
    /* ── Helpers ── */

    _key() {
        const user = auth.getCurrentUser();
        return user ? `artgallery_collections_${user.id}` : null;
    },

    _load() {
        const key = this._key();
        if (!key) return { folders: [], items: [] };
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : { folders: [], items: [] };
    },

    _save(data) {
        const key = this._key();
        if (!key) return;
        localStorage.setItem(key, JSON.stringify(data));
    },

    /* ── Folders ── */

    getFolders() {
        return this._load().folders;
    },

    createFolder(name) {
        if (!name || !name.trim()) return null;
        const data = this._load();
        const folder = { id: slugId(), name: name.trim(), createdAt: new Date().toISOString() };
        data.folders.push(folder);
        this._save(data);
        return folder;
    },

    deleteFolder(folderId) {
        const data = this._load();
        data.folders = data.folders.filter(f => f.id !== folderId);
        data.items   = data.items.filter(i => i.folderId !== folderId);
        this._save(data);
    },

    /* ── Items ── */

    getItems(folderId = null) {
        const items = this._load().items;
        return folderId ? items.filter(i => i.folderId === folderId) : items;
    },

    isInFolder(artworkId, folderId) {
        return this._load().items.some(i => i.artworkId == artworkId && i.folderId === folderId);
    },

    isBookmarked(artworkId) {
        return this._load().items.some(i => i.artworkId == artworkId);
    },

    addItem(artworkId, folderId, artworkData) {
        const data = this._load();
        if (data.items.some(i => i.artworkId == artworkId && i.folderId === folderId)) return false;
        data.items.push({ artworkId: String(artworkId), folderId, addedAt: new Date().toISOString(), artworkData });
        this._save(data);
        return true;
    },

    removeItem(artworkId, folderId) {
        const data = this._load();
        data.items = data.items.filter(i => !(i.artworkId == artworkId && i.folderId === folderId));
        this._save(data);
    },

    removeFromAll(artworkId) {
        const data = this._load();
        data.items = data.items.filter(i => i.artworkId != artworkId);
        this._save(data);
    },

    totalCount() {
        return new Set(this._load().items.map(i => i.artworkId)).size;
    },

    folderCount(folderId) {
        return this._load().items.filter(i => i.folderId === folderId).length;
    }
};

/* ══════════════════════════════════════════════════
   Collection Picker Popover (hiện khi click bookmark)
══════════════════════════════════════════════════ */

let _activePicker = null;

function openCollectionPicker(btn, artworkId, artworkData) {
    if (!auth.isUserLoggedIn()) {
        showToast('Vui lòng đăng nhập để lưu tác phẩm', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1200);
        return;
    }

    // Đóng picker đang mở nếu cùng artwork
    if (_activePicker) {
        _activePicker.remove();
        _activePicker = null;
        if (_activePicker === null && document.querySelector(`[data-artwork-id="${artworkId}"].collection-picker`)) return;
    }

    const folders = collections.getFolders();
    const picker = document.createElement('div');
    picker.className = 'collection-picker';
    picker.dataset.artworkId = artworkId;

    picker.innerHTML = `
        <div class="cp-header">
            <span><i class="bi bi-bookmark-plus me-1"></i> Lưu vào thư mục</span>
            <button class="cp-close" onclick="this.closest('.collection-picker').remove()"><i class="bi bi-x"></i></button>
        </div>
        <div class="cp-folders" id="cp-folders-${artworkId}">
            ${folders.length === 0
                ? `<p class="cp-empty">Chưa có thư mục nào. Tạo thư mục bên dưới!</p>`
                : folders.map(f => {
                    const inFolder = collections.isInFolder(artworkId, f.id);
                    return `<button class="cp-folder-btn ${inFolder ? 'in-folder' : ''}"
                                onclick="toggleCollectionItem('${artworkId}','${f.id}',this)"
                                data-folder-id="${f.id}">
                                <i class="bi bi-folder${inFolder ? '-fill' : ''} me-1"></i>
                                ${escapeHtml(f.name)}
                                ${inFolder ? '<i class="bi bi-check2 ms-auto"></i>' : ''}
                            </button>`;
                  }).join('')}
        </div>
        <div class="cp-create">
            <input type="text" class="cp-input" id="cp-input-${artworkId}" placeholder="Tên thư mục mới..." maxlength="40">
            <button class="cp-create-btn" onclick="cpCreateFolder('${artworkId}')" title="Tạo thư mục mới">+</button>
        </div>
    `;

    // Lưu artworkData vào picker để dùng khi thêm vào folder mới
    picker._artworkData = artworkData;

    // Vị trí
    const rect = btn.getBoundingClientRect();
    picker.style.position = 'fixed';
    picker.style.top = (rect.bottom + 6) + 'px';
    picker.style.left = Math.max(8, rect.right - 220) + 'px';

    document.body.appendChild(picker);
    _activePicker = picker;

    // Đóng khi click ngoài
    setTimeout(() => {
        document.addEventListener('click', function handler(e) {
            if (!picker.contains(e.target) && e.target !== btn) {
                picker.remove();
                if (_activePicker === picker) _activePicker = null;
                document.removeEventListener('click', handler);
            }
        });
    }, 10);

    // Enter để tạo folder
    const inp = document.getElementById(`cp-input-${artworkId}`);
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') cpCreateFolder(artworkId); });
}

function toggleCollectionItem(artworkId, folderId, btn) {
    const picker = btn.closest('.collection-picker');
    const artworkData = picker ? picker._artworkData : {};
    const inFolder = collections.isInFolder(artworkId, folderId);

    if (inFolder) {
        collections.removeItem(artworkId, folderId);
        showToast('Đã xóa khỏi bộ sưu tập', 'info');
    } else {
        collections.addItem(artworkId, folderId, artworkData);
        showToast('Đã lưu vào bộ sưu tập ✨', 'success');
    }

    // Cập nhật trạng thái bookmark button trên card
    updateBookmarkBtn(artworkId);

    // Rebuild folder list trong picker
    const folders = collections.getFolders();
    const container = document.getElementById(`cp-folders-${artworkId}`);
    if (container) {
        container.innerHTML = folders.map(f => {
            const inf = collections.isInFolder(artworkId, f.id);
            return `<button class="cp-folder-btn ${inf ? 'in-folder' : ''}"
                        onclick="toggleCollectionItem('${artworkId}','${f.id}',this)"
                        data-folder-id="${f.id}">
                        <i class="bi bi-folder${inf ? '-fill' : ''} me-1"></i>
                        ${escapeHtml(f.name)}
                        ${inf ? '<i class="bi bi-check2 ms-auto"></i>' : ''}
                    </button>`;
        }).join('');
    }
}

function cpCreateFolder(artworkId) {
    const inp = document.getElementById(`cp-input-${artworkId}`);
    const name = inp ? inp.value.trim() : '';
    if (!name) { showToast('Vui lòng nhập tên thư mục', 'warning'); return; }

    const folder = collections.createFolder(name);
    if (!folder) return;
    if (inp) inp.value = '';

    // Tự động thêm artwork vào folder vừa tạo
    const picker = inp ? inp.closest('.collection-picker') : null;
    const artworkData = picker ? picker._artworkData : {};
    collections.addItem(artworkId, folder.id, artworkData);
    updateBookmarkBtn(artworkId);
    showToast(`Đã tạo thư mục "${folder.name}" và lưu tác phẩm ✨`, 'success');

    // Rebuild list
    const container = document.getElementById(`cp-folders-${artworkId}`);
    if (container) {
        const folders = collections.getFolders();
        container.innerHTML = folders.map(f => {
            const inf = collections.isInFolder(artworkId, f.id);
            return `<button class="cp-folder-btn ${inf ? 'in-folder' : ''}"
                        onclick="toggleCollectionItem('${artworkId}','${f.id}',this)"
                        data-folder-id="${f.id}">
                        <i class="bi bi-folder${inf ? '-fill' : ''} me-1"></i>
                        ${escapeHtml(f.name)}
                        ${inf ? '<i class="bi bi-check2 ms-auto"></i>' : ''}
                    </button>`;
        }).join('');
    }
}

function updateBookmarkBtn(artworkId) {
    const btn = document.querySelector(`.btn-bookmark[data-id="${artworkId}"]`);
    if (!btn) return;
    const saved = collections.isBookmarked(artworkId);
    btn.classList.toggle('bookmarked', saved);
    btn.querySelector('i').className = `bi bi-bookmark${saved ? '-fill' : ''}`;
}

/* ══════════════════════════════════════════════════
   My Collections Modal
══════════════════════════════════════════════════ */

let _activeFolderId = null;

function openMyCollectionsModal() {
    if (!auth.isUserLoggedIn()) {
        showToast('Vui lòng đăng nhập để xem bộ sưu tập', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1200);
        return;
    }
    renderCollectionsModal();
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('collectionsModal'));
    modal.show();
}

function renderCollectionsModal() {
    const folders = collections.getFolders();
    const total = collections.totalCount();

    // Badge tổng
    const badge = document.getElementById('cm-total-badge');
    if (badge) badge.textContent = total;

    // Sidebar folders
    const list = document.getElementById('cm-folders-list');
    if (!list) return;

    if (folders.length === 0) {
        list.innerHTML = `<p style="font-size:.8rem;color:#475569;text-align:center;padding:.5rem">Chưa có thư mục nào</p>`;
        document.getElementById('cm-folder-content').innerHTML = `
            <div class="cm-empty">
                <i class="bi bi-bookmark-star"></i>
                <p>Tạo thư mục đầu tiên để lưu tác phẩm yêu thích.</p>
            </div>`;
        return;
    }

    list.innerHTML = folders.map(f => {
        const cnt = collections.folderCount(f.id);
        const isActive = f.id === _activeFolderId;
        return `<button class="cm-folder-item ${isActive ? 'active' : ''}" onclick="selectCollectionFolder('${f.id}')">
                    <i class="bi bi-folder${isActive ? '-fill' : ''} me-1"></i>
                    <span class="cm-folder-name">${escapeHtml(f.name)}</span>
                    <span class="cm-folder-count">${cnt}</span>
                    <button class="cm-del-folder" onclick="deleteCollectionFolder(event,'${f.id}')" title="Xóa thư mục">
                        <i class="bi bi-trash"></i>
                    </button>
                </button>`;
    }).join('');

    // Nếu đang có folder đang chọn, render content
    if (_activeFolderId) {
        renderFolderContent(_activeFolderId);
    } else {
        // Tự động chọn folder đầu tiên
        if (folders.length > 0) {
            _activeFolderId = folders[0].id;
            renderCollectionsModal();
        }
    }
}

function selectCollectionFolder(folderId) {
    _activeFolderId = folderId;
    renderCollectionsModal();
}

function renderFolderContent(folderId) {
    const content = document.getElementById('cm-folder-content');
    if (!content) return;
    const items = collections.getItems(folderId);

    if (items.length === 0) {
        content.innerHTML = `
            <div class="cm-empty">
                <i class="bi bi-image"></i>
                <p>Thư mục này chưa có tác phẩm nào.<br>
                   <span style="font-size:.8rem;color:#475569">Nhấn nút <i class="bi bi-bookmark"></i> trên tác phẩm để lưu vào đây.</span>
                </p>
            </div>`;
        return;
    }

    content.innerHTML = `<div class="cm-grid">${items.map(item => {
        const a = item.artworkData || {};
        return `<div class="cm-card" onclick="openArtworkDetailById('${item.artworkId}')">
                    <img src="${escapeHtml(a.imageUrl || '')}" alt="${escapeHtml(a.title || '')}" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/200x270?text=No+Image'">
                    <div class="cm-card-info">
                        <div class="cm-card-title">${escapeHtml(a.title || 'Không rõ')}</div>
                        <div class="cm-card-artist">${escapeHtml(a.artist || '')}</div>
                    </div>
                    <button class="cm-remove-btn" onclick="removeFromCollectionModal(event,'${item.artworkId}','${folderId}')" title="Xóa khỏi thư mục">
                        <i class="bi bi-x"></i>
                    </button>
                </div>`;
    }).join('')}</div>`;
}

function removeFromCollectionModal(e, artworkId, folderId) {
    e.stopPropagation();
    collections.removeItem(artworkId, folderId);
    updateBookmarkBtn(artworkId);
    renderCollectionsModal();
    showToast('Đã xóa khỏi bộ sưu tập', 'info');
}

function deleteCollectionFolder(e, folderId) {
    e.stopPropagation();
    if (!confirm('Xóa thư mục này sẽ xóa tất cả tác phẩm trong đó. Tiếp tục?')) return;
    collections.deleteFolder(folderId);
    if (_activeFolderId === folderId) _activeFolderId = null;
    // Update all bookmark buttons
    document.querySelectorAll('.btn-bookmark').forEach(btn => {
        const id = btn.dataset.id;
        if (id) updateBookmarkBtn(id);
    });
    renderCollectionsModal();
    showToast('Đã xóa thư mục', 'info');
}

function createCollectionFromModal() {
    const inp = document.getElementById('cm-new-folder-input');
    const name = inp ? inp.value.trim() : '';
    if (!name) { showToast('Vui lòng nhập tên thư mục', 'warning'); return; }
    const folder = collections.createFolder(name);
    if (!folder) return;
    if (inp) inp.value = '';
    _activeFolderId = folder.id;
    renderCollectionsModal();
    showToast(`Đã tạo thư mục "${folder.name}"`, 'success');
}
