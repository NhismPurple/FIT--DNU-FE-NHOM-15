/**
 * main.js — ArtGallery
 * Logic trang gallery chính (index.html)
 */

/* ── State ── */
let allArtworks = [];
let currentFilter = 'all';
let currentSearch = '';

/* ══════════════════════════════════
   Khởi tạo khi trang load xong
══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    initAuthUI();
    initNavListeners();
    initSearchBar();
    initSubmitArtworkForm();
    initChatbot();
    await loadGallery();
});

/* ══════════════════════════════════
   Auth UI — Hiển thị/ẩn nav items
══════════════════════════════════ */
function initAuthUI() {
    const isLoggedIn = auth.isUserLoggedIn();
    const user = auth.getCurrentUser();

    document.getElementById('nav-collections-item').style.display = isLoggedIn ? '' : 'none';
    document.getElementById('nav-submit-item').style.display      = isLoggedIn ? '' : 'none';
    document.getElementById('user-menu').style.display            = isLoggedIn ? '' : 'none';
    document.getElementById('login-link').style.display           = isLoggedIn ? 'none' : '';

    if (isLoggedIn && user) {
        const nameEl = document.getElementById('user-display-name');
        const emailEl = document.getElementById('user-email-display');
        if (nameEl) nameEl.textContent = user.fullName || user.email;
        if (emailEl) emailEl.textContent = user.email;
    }
}

function logoutUser() {
    auth.logoutUser();
    showToast('Đã đăng xuất thành công', 'info');
    setTimeout(() => window.location.reload(), 800);
}

/* ══════════════════════════════════
   Nav listeners
══════════════════════════════════ */
function initNavListeners() {
    const btnCollections = document.getElementById('btn-my-collections');
    if (btnCollections) {
        btnCollections.addEventListener('click', e => {
            e.preventDefault();
            openMyCollectionsModal();
        });
    }

    const btnSubmit = document.getElementById('btn-submit-artwork');
    if (btnSubmit) {
        btnSubmit.addEventListener('click', e => {
            e.preventDefault();
            if (!auth.isUserLoggedIn()) {
                showToast('Vui lòng đăng nhập để đăng tác phẩm', 'warning');
                setTimeout(() => window.location.href = 'login.html', 1200);
                return;
            }
            bootstrap.Modal.getOrCreateInstance(document.getElementById('submitArtworkModal')).show();
        });
    }
}

/* ══════════════════════════════════
   Tải và render gallery
══════════════════════════════════ */
async function loadGallery() {
    showLoading(true);
    hideError();

    try {
        allArtworks = await api.getAll();
        renderGallery();
    } catch (err) {
        showError('Không thể tải tác phẩm. Vui lòng thử lại sau.');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

function renderGallery() {
    let filtered = allArtworks.filter(a => a.approved !== false && a.approved !== 'false');

    if (currentFilter !== 'all') {
        filtered = filtered.filter(a => a.style === currentFilter);
    }

    if (currentSearch.trim()) {
        const q = currentSearch.toLowerCase().trim();
        filtered = filtered.filter(a =>
            (a.title  || '').toLowerCase().includes(q) ||
            (a.artist || '').toLowerCase().includes(q)
        );
    }

    const grid = document.getElementById('gallery-grid');
    const info = document.getElementById('search-results-info');

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5" style="color:#94a3b8">
                <i class="bi bi-search fs-2 d-block mb-3"></i>
                <p>Không tìm thấy tác phẩm nào phù hợp.</p>
            </div>`;
        if (info) info.textContent = '';
        return;
    }

    if (currentSearch && info) {
        info.textContent = `Tìm thấy ${filtered.length} tác phẩm cho "${currentSearch}"`;
    } else if (info) {
        info.textContent = '';
    }

    grid.innerHTML = filtered.map(a => buildCard(a)).join('');

    // Gắn sự kiện sau khi render
    grid.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Không mở modal khi click vào bookmark hoặc heart
            if (e.target.closest('.btn-bookmark') || e.target.closest('.btn-heart')) return;
            openArtworkModal(this.dataset.id);
        });
    });

    grid.querySelectorAll('.btn-heart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleLike(this);
        });
    });

    grid.querySelectorAll('.btn-bookmark').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const artwork = allArtworks.find(a => a.id == id);
            openCollectionPicker(this, id, artwork);
        });
    });
}

function buildCard(a) {
    const saved    = auth.isUserLoggedIn() && collections.isBookmarked(a.id);
    const liked    = isLiked(a.id);
    const likes    = a.likes || 0;

    return `
    <div class="col-6 col-sm-6 col-md-4 col-xl-3 mb-4">
        <div class="gallery-card" data-id="${a.id}" style="cursor:pointer">
            <div class="card-img-wrapper position-relative">
                <img src="${escapeHtml(a.imageUrl || '')}"
                     alt="${escapeHtml(a.title || '')}"
                     class="card-artwork-img" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/400x500?text=No+Image'">
                <span class="style-badge">${escapeHtml(a.style || '')}</span>
            </div>
            <div class="card-body-info">
                <h6 class="card-artwork-title">${escapeHtml(truncate(a.title || '', 30))}</h6>
                <p class="card-artist-name"><i class="bi bi-person-fill me-1"></i>${escapeHtml(a.artist || '')}</p>
                <div class="card-footer-info">
                    <button class="btn-heart ${liked ? 'liked' : ''}" data-id="${a.id}" data-likes="${likes}" title="Thích">
                        <i class="bi bi-heart${liked ? '-fill' : ''}"></i>
                        <span class="like-count">${likes}</span>
                    </button>
                    <button class="btn-bookmark ${saved ? 'bookmarked' : ''}" data-id="${a.id}" title="Lưu vào bộ sưu tập">
                        <i class="bi bi-bookmark${saved ? '-fill' : ''}"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

/* ══════════════════════════════════
   Like (lưu local)
══════════════════════════════════ */
function isLiked(artworkId) {
    const likes = JSON.parse(localStorage.getItem('artgallery_likes') || '[]');
    return likes.includes(String(artworkId));
}

async function toggleLike(btn) {
    const id    = btn.dataset.id;
    const likes = JSON.parse(localStorage.getItem('artgallery_likes') || '[]');
    const idx   = likes.indexOf(String(id));
    const artwork = allArtworks.find(a => a.id == id);
    if (!artwork) return;

    let newLikes;
    if (idx === -1) {
        likes.push(String(id));
        newLikes = (parseInt(artwork.likes) || 0) + 1;
        btn.classList.add('liked');
        btn.querySelector('i').className = 'bi bi-heart-fill';
        $(btn).addClass('pulse');
        setTimeout(() => $(btn).removeClass('pulse'), 500);
    } else {
        likes.splice(idx, 1);
        newLikes = Math.max(0, (parseInt(artwork.likes) || 0) - 1);
        btn.classList.remove('liked');
        btn.querySelector('i').className = 'bi bi-heart';
    }

    localStorage.setItem('artgallery_likes', JSON.stringify(likes));
    btn.querySelector('.like-count').textContent = newLikes;
    artwork.likes = newLikes;

    try {
        await api.update(id, { likes: newLikes });
    } catch(e) { console.warn('Không thể cập nhật likes lên server', e); }
}

/* ══════════════════════════════════
   Filter bar
══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.style;
            renderGallery();
        });
    });
});

/* ══════════════════════════════════
   Search bar
══════════════════════════════════ */
function initSearchBar() {
    const inp   = document.getElementById('search-input');
    const clear = document.getElementById('search-clear');
    if (!inp) return;

    inp.addEventListener('input', debounce(function() {
        currentSearch = this.value;
        if (clear) clear.style.display = this.value ? 'flex' : 'none';
        renderGallery();
    }, 300));

    if (clear) {
        clear.addEventListener('click', () => {
            inp.value = '';
            currentSearch = '';
            clear.style.display = 'none';
            renderGallery();
        });
    }
}

/* ══════════════════════════════════
   Artwork Detail Modal
══════════════════════════════════ */
async function openArtworkModal(id) {
    const artwork = allArtworks.find(a => a.id == id);
    if (!artwork) return;
    setArtworkModal(artwork);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('artworkModal')).show();
}

async function openArtworkDetailById(id) {
    // Dùng từ collections modal
    let artwork = allArtworks.find(a => a.id == id);
    if (!artwork) {
        try { artwork = await api.getById(id); } catch(e) { return; }
    }
    // Đóng collections modal trước
    const cm = bootstrap.Modal.getInstance(document.getElementById('collectionsModal'));
    if (cm) cm.hide();
    setTimeout(() => {
        setArtworkModal(artwork);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('artworkModal')).show();
    }, 300);
}

function setArtworkModal(a) {
    document.getElementById('modal-img').src    = a.imageUrl || '';
    document.getElementById('modal-title').textContent  = a.title  || '';
    document.getElementById('modal-artist').textContent = a.artist || '';
    document.getElementById('modal-style').textContent  = a.style  || '';
    document.getElementById('modal-story').textContent  = a.story  || a.description || 'Không có mô tả.';
    document.getElementById('modal-likes').textContent  = a.likes  || 0;
}

/* ══════════════════════════════════
   Submit Artwork Form
══════════════════════════════════ */
function initSubmitArtworkForm() {
    const form = document.getElementById('submit-artwork-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitArtwork();
    });
}

function submitArtwork() {
    const title    = document.getElementById('sub-title').value.trim();
    const artist   = document.getElementById('sub-artist').value.trim();
    const style    = document.getElementById('sub-style').value;
    const story    = document.getElementById('sub-story').value.trim();
    const imageUrl = document.getElementById('sub-imageUrl').value.trim();

    const feedback = document.getElementById('submit-feedback');

    function showFeedback(msg, type) {
        feedback.style.display = 'block';
        feedback.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
        feedback.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>${msg}`;
    }

    if (!title || !artist || !imageUrl) {
        showFeedback('Vui lòng điền đầy đủ các trường bắt buộc (*)','error');
        return;
    }

    const user = auth.getCurrentUser();
    const submission = {
        id:         slugId(),
        title, artist, style, story, imageUrl,
        status:     'pending',
        submittedBy: user ? user.email : 'Khách',
        submittedAt: new Date().toISOString()
    };

    // Lưu vào localStorage (admin sẽ đọc từ đây)
    const subs = JSON.parse(localStorage.getItem('artgallery_submissions') || '[]');
    subs.unshift(submission);
    localStorage.setItem('artgallery_submissions', JSON.stringify(subs));

    showFeedback('Tác phẩm đã được gửi thành công! Admin sẽ xét duyệt sớm nhất có thể. 🎨', 'success');
    document.getElementById('submit-artwork-form').reset();

    setTimeout(() => {
        bootstrap.Modal.getInstance(document.getElementById('submitArtworkModal')).hide();
        feedback.style.display = 'none';
    }, 2500);
}

/* ══════════════════════════════════
   Loading / Error helpers
══════════════════════════════════ */
function showLoading(show) {
    const el = document.getElementById('loading-spinner');
    if (el) el.style.display = show ? 'flex' : 'none';
}
function showError(msg) {
    const el = document.getElementById('error-banner');
    if (!el) return;
    el.querySelector('span').textContent = msg;
    el.style.display = 'flex';
}
function hideError() {
    const el = document.getElementById('error-banner');
    if (el) el.style.display = 'none';
}

/* ══════════════════════════════════
   Chatbot đơn giản
══════════════════════════════════ */
function initChatbot() {
    const toggler = document.getElementById('chatbot-toggler');
    const win     = document.getElementById('chatbot-window');
    const closeBtn= document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const input   = document.getElementById('chatbot-input');

    if (!toggler || !win) return;

    toggler.addEventListener('click', () => win.classList.toggle('show'));
    if (closeBtn) closeBtn.addEventListener('click', () => win.classList.remove('show'));

    function sendMessage() {
        const text = (input.value || '').trim();
        if (!text) return;
        addChatMsg(text, 'user');
        input.value = '';
        setTimeout(() => addChatMsg(botReply(text), 'bot'), 600);
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input)   input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

function addChatMsg(text, who) {
    const body = document.getElementById('chatbot-body');
    if (!body) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${who}-msg`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

function botReply(msg) {
    const m = msg.toLowerCase();
    if (m.includes('sơn dầu'))    return 'Tranh sơn dầu có kết cấu phong phú, thường dùng để vẽ chân dung và phong cảnh với màu sắc sâu lắng!';
    if (m.includes('màu nước'))   return 'Tranh màu nước tạo cảm giác nhẹ nhàng, trong trẻo, rất phù hợp với phong cảnh thiên nhiên.';
    if (m.includes('trừu tượng')) return 'Nghệ thuật trừu tượng không mô tả hình thực, thay vào đó thể hiện cảm xúc qua hình dạng và màu sắc.';
    if (m.includes('tìm') || m.includes('search')) return 'Bạn có thể dùng thanh tìm kiếm phía trên để tìm theo tên tác phẩm hoặc nghệ sĩ!';
    if (m.includes('lưu') || m.includes('bộ sưu tập')) return 'Nhấn vào biểu tượng 🔖 trên tác phẩm để lưu vào bộ sưu tập cá nhân nhé!';
    if (m.includes('đăng tác phẩm') || m.includes('upload')) return 'Bạn cần đăng nhập để đăng tác phẩm. Sau đó nhấn "Đăng tác phẩm" trên menu!';
    if (m.includes('xin chào') || m.includes('hello') || m.includes('hi')) return 'Xin chào! Tôi là ArtBot 🎨 Bạn cần tôi giúp gì?';
    return 'Tôi chưa hiểu câu hỏi này 😅 Bạn có thể hỏi về các phong cách tranh, cách tìm kiếm, hoặc cách lưu tác phẩm nhé!';
}
