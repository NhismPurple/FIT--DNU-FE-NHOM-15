/**
 * main.js — Logic for index.html (Public Gallery)
 * Uses fetch() with .then()/.catch() for all API calls
 * Uses addEventListener for DOM events (no jQuery for events)
 * Uses jQuery ONLY for like button animation
 */

var allArtworks = [];
var currentFilter = 'all';
var currentSearch = '';

/**
 * Initialize the public gallery page
 */
document.addEventListener('DOMContentLoaded', function () {
    loadGallery();
    setupFilterButtons();
    setupSearch();
    setupChatbot();
});

/**
 * Load artworks from the API and render the gallery
 */
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

/**
 * Apply all active filters (approved + style + search) and render
 */
function applyFiltersAndRender() {
    var result = filterApproved(allArtworks);

    if (currentFilter !== 'all') {
        result = filterByStyle(result, currentFilter);
    }

    if (currentSearch.trim() !== '') {
        result = searchArtworks(result, currentSearch);
    }

    renderArtworks(result);
    updateSearchInfo(result.length);
}

/**
 * Filter artworks to only show approved ones
 * @param {Array} artworks
 * @returns {Array}
 */
function filterApproved(artworks) {
    var result = [];
    for (var i = 0; i < artworks.length; i++) {
        if (artworks[i].status === 'approved' || artworks[i].approved === true) {
            result.push(artworks[i]);
        }
    }
    return result;
}

/**
 * Filter artworks by style
 * @param {Array} artworks
 * @param {string} style
 * @returns {Array}
 */
function filterByStyle(artworks, style) {
    if (!style || style === 'all') return artworks;
    var filtered = [];
    for (var i = 0; i < artworks.length; i++) {
        if (artworks[i].style === style) {
            filtered.push(artworks[i]);
        }
    }
    return filtered;
}

/**
 * Search artworks by title or artist name
 * @param {Array} artworks
 * @param {string} query
 * @returns {Array}
 */
function searchArtworks(artworks, query) {
    var q = query.toLowerCase().trim();
    if (!q) return artworks;
    var results = [];
    for (var i = 0; i < artworks.length; i++) {
        var title = (artworks[i].title || '').toLowerCase();
        var artist = (artworks[i].artist || '').toLowerCase();
        var style = (artworks[i].style || '').toLowerCase();
        if (title.indexOf(q) !== -1 || artist.indexOf(q) !== -1 || style.indexOf(q) !== -1) {
            results.push(artworks[i]);
        }
    }
    return results;
}

/**
 * Render artworks into the masonry grid
 * @param {Array} data
 */
function renderArtworks(data) {
    var container = document.getElementById('gallery-grid');
    if (!container) return;

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

        html += '<div class="col-6 col-sm-6 col-md-4 col-lg-4 col-xl-3 mb-4 artwork-card-wrapper" data-style="' + (artwork.style || '') + '">';
        html += '  <div class="card artwork-card h-100" style="cursor: pointer;" onclick="openArtworkModal(\'' + artwork.id + '\')">';
        html += '    <div class="card-img-wrapper">';
        html += '      <img src="' + imgUrl + '" class="card-img-top" alt="' + (artwork.title || '') + '" loading="lazy" onerror="this.src=\'https://picsum.photos/seed/fallback' + artwork.id + '/600/800\'">';
        html += '      <div class="card-img-overlay-gradient"></div>';
        html += '      <span class="style-badge">' + (artwork.style || 'N/A') + '</span>';
        html += '    </div>';
        html += '    <div class="card-body">';
        html += '      <h5 class="card-title">' + (artwork.title || 'Untitled') + '</h5>';
        html += '      <p class="card-artist"><i class="bi bi-person-fill"></i> ' + (artwork.artist || 'Unknown') + '</p>';
        html += '      <div class="card-footer-info">';
        html += '        <button class="btn-like" data-id="' + artwork.id + '" data-likes="' + (artwork.likes || 0) + '">';
        html += '          <i class="bi bi-heart-fill"></i>';
        html += '          <span class="like-count">' + (artwork.likes || 0) + '</span>';
        html += '        </button>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    });

    container.innerHTML = html;

    // Staggered fade-in
    var cards = container.querySelectorAll('.artwork-card-wrapper');
    for (var i = 0; i < cards.length; i++) {
        (function (card, index) {
            setTimeout(function () {
                card.classList.add('visible');
            }, index * 50);
        })(cards[i], i);
    }

    setupLikeButtons();
}

/**
 * Set up search input with debounce
 */
function setupSearch() {
    var searchInput = document.getElementById('search-input');
    var clearBtn = document.getElementById('search-clear');
    if (!searchInput) return;

    var debounceTimer = null;

    searchInput.addEventListener('input', function () {
        var value = searchInput.value;
        currentSearch = value;

        // Show/hide clear button
        if (clearBtn) {
            clearBtn.style.display = value.length > 0 ? 'block' : 'none';
        }

        // Debounce: wait 300ms after user stops typing
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            var galleryGrid = document.getElementById('gallery-grid');
            galleryGrid.classList.add('fade-transition');

            setTimeout(function () {
                applyFiltersAndRender();
                galleryGrid.classList.remove('fade-transition');
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

/**
 * Update search results info text
 * @param {number} count
 */
function updateSearchInfo(count) {
    var infoEl = document.getElementById('search-results-info');
    if (!infoEl) return;

    if (currentSearch.trim() !== '') {
        infoEl.innerHTML = 'Tìm thấy <span class="highlight">' + count + '</span> tác phẩm cho "' + currentSearch + '"';
    } else {
        infoEl.innerHTML = '';
    }
}

/**
 * Set up click event listeners on filter buttons
 */
function setupFilterButtons() {
    var filterContainer = document.getElementById('filter-bar');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter-btn');
        if (!btn) return;

        var style = btn.getAttribute('data-style');
        currentFilter = style;

        // Update active state
        var allBtns = filterContainer.querySelectorAll('.filter-btn');
        for (var i = 0; i < allBtns.length; i++) {
            allBtns[i].classList.remove('active');
        }
        btn.classList.add('active');

        // Filter and re-render with fade
        var galleryGrid = document.getElementById('gallery-grid');
        galleryGrid.classList.add('fade-transition');

        setTimeout(function () {
            applyFiltersAndRender();
            galleryGrid.classList.remove('fade-transition');
        }, 250);
    });
}

/**
 * Set up click event listeners on like buttons
 */
function setupLikeButtons() {
    var likeButtons = document.querySelectorAll('.btn-like');
    for (var i = 0; i < likeButtons.length; i++) {
        likeButtons[i].addEventListener('click', handleLikeClick);
    }
}

/**
 * Handle like button click — optimistic update + jQuery animation
 */
function handleLikeClick(e) {
    var btn = e.currentTarget;
    var id = btn.getAttribute('data-id');
    var currentLikes = parseInt(btn.getAttribute('data-likes'), 10) || 0;
    var newLikes = currentLikes + 1;

    var countSpan = btn.querySelector('.like-count');
    countSpan.textContent = newLikes;
    btn.setAttribute('data-likes', newLikes);

    // jQuery animation (ONLY jQuery usage)
    $(btn).addClass('liked-pulse');
    setTimeout(function () {
        $(btn).removeClass('liked-pulse');
    }, 600);

    API.updateArtwork(id, { likes: newLikes })
        .then(function (updated) {
            for (var i = 0; i < allArtworks.length; i++) {
                if (allArtworks[i].id === id || allArtworks[i].id === parseInt(id)) {
                    allArtworks[i].likes = updated.likes || newLikes;
                    break;
                }
            }
        })
        .catch(function (error) {
            countSpan.textContent = currentLikes;
            btn.setAttribute('data-likes', currentLikes);
            console.error('Like update failed:', error);
        });
}

function showLoading(show) {
    var loader = document.getElementById('loading-spinner');
    var gallery = document.getElementById('gallery-grid');
    if (loader) loader.style.display = show ? 'flex' : 'none';
    if (gallery) gallery.style.display = show ? 'none' : '';
}

function showError(message) {
    var errorBanner = document.getElementById('error-banner');
    if (errorBanner) {
        errorBanner.textContent = message;
        errorBanner.style.display = 'block';
    }
}

function hideError() {
    var errorBanner = document.getElementById('error-banner');
    if (errorBanner) errorBanner.style.display = 'none';
}

/**
 * Set up chatbot UI logic
 */
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
        if (widget.classList.contains('open')) {
            inputEl.focus();
        }
    }

    toggler.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

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

        // Bot response logic
        setTimeout(function() {
            var response = "Cảm ơn bạn! Hiện tại tôi đang trong quá trình học hỏi. Bạn có thể sử dụng thanh tìm kiếm phía trên để tìm tác phẩm nghệ thuật nhé.";
            var q = text.toLowerCase();
            
            if (q.includes('giá') || q.includes('bao nhiêu') || q.includes('tiền')) {
                response = "Để biết thông tin chi tiết về giá cả, xin vui lòng liên hệ trực tiếp qua email hoặc điện thoại.";
            } else if (q.includes('tác giả') || q.includes('họa sĩ') || q.includes('nghệ sĩ') || q.includes('ai vẽ')) {
                response = "ArtGallery trưng bày tác phẩm của rất nhiều họa sĩ tài năng. Bạn có thể gõ tên tác giả vào thanh tìm kiếm để xem nhé.";
            } else if (q.includes('mua') || q.includes('đặt hàng') || q.includes('sở hữu')) {
                response = "ArtGallery hiện đang tập trung triển lãm trực tuyến. Chức năng đặt mua sẽ sớm ra mắt trong thời gian tới!";
            } else if (q.includes('chào') || q.includes('hi ') || q.includes('hello') || q.includes('xin chào')) {
                response = "Chào bạn! Chúc bạn một ngày tốt lành và thưởng thức nghệ thuật vui vẻ.";
            } else if (q.includes('đẹp') || q.includes('tuyệt') || q.includes('ấn tượng')) {
                response = "Cảm ơn bạn! Các họa sĩ của chúng tôi luôn đặt trọn tâm huyết vào từng đường nét, màu sắc.";
            } else if (q.includes('liên hệ') || q.includes('địa chỉ') || q.includes('ở đâu')) {
                response = "Bạn có thể liên hệ với chúng tôi qua email contact@artgallery.vn. ArtGallery là nền tảng trực tuyến nên bạn có thể thưởng thức bất cứ lúc nào!";
            } else if (q.includes('tên gì') || q.includes('bạn là ai') || q.includes('bot')) {
                response = "Tôi là ArtBot, trợ lý ảo thông minh của ArtGallery. Rất vui được hỗ trợ bạn khám phá không gian nghệ thuật này.";
            }
            addMessage(response, false);
        }, 250);
    }

    sendBtn.addEventListener('click', processMessage);
    inputEl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            processMessage();
        }
    });
}

/**
 * Open artwork detail modal
 */
function openArtworkModal(id) {
    var artwork = null;
    for (var i = 0; i < allArtworks.length; i++) {
        if (String(allArtworks[i].id) === String(id)) {
            artwork = allArtworks[i];
            break;
        }
    }
    if (!artwork) return;

    document.getElementById('modal-img').src = getImageUrl(artwork.imageUrl, artwork.id);
    document.getElementById('modal-title').textContent = artwork.title || 'Untitled';
    document.getElementById('modal-artist').textContent = artwork.artist || 'Unknown';
    document.getElementById('modal-style').textContent = artwork.style || 'N/A';
    document.getElementById('modal-likes').textContent = artwork.likes || 0;
    
    var storyEl = document.getElementById('modal-story');
    var storyHeading = storyEl.previousElementSibling;
    if (artwork.story) {
        storyEl.textContent = artwork.story;
        storyEl.style.display = 'block';
        if (storyHeading) storyHeading.style.display = 'block';
    } else {
        storyEl.style.display = 'none';
        if (storyHeading) storyHeading.style.display = 'none';
    }

    var modal = new bootstrap.Modal(document.getElementById('artworkModal'));
    modal.show();
}
