/**
 * utils.js — Utility Functions
 * Validation, formatting, and error display helpers
 */

/**
 * Format a number as Vietnamese Dong currency
 * @param {number} number - The price value
 * @returns {string} Formatted string like "1.200.000 ₫"
 */
function formatPrice(number) {
    if (number === null || number === undefined || isNaN(number)) {
        return '0 ₫';
    }
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
}

/**
 * Validate whether a string is a valid URL
 * @param {string} str - The string to validate
 * @returns {boolean}
 */
function isValidUrl(str) {
    if (!str || typeof str !== 'string') return false;
    try {
        var url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

/**
 * Validate the artwork form data
 * @param {Object} formData - { title, artist, style, price, imageUrl }
 * @returns {Object} { valid: boolean, errors: { fieldName: errorMessage } }
 */
function validateForm(formData) {
    var errors = {};

    // Title validation
    if (!formData.title || formData.title.trim() === '') {
        errors.title = 'Tiêu đề không được để trống';
    }

    // Artist validation
    if (!formData.artist || formData.artist.trim() === '') {
        errors.artist = 'Tên nghệ sĩ không được để trống';
    }

    // Image URL validation
    if (!formData.imageUrl || formData.imageUrl.trim() === '') {
        errors.imageUrl = 'URL hình ảnh không được để trống';
    } else if (!isValidUrl(formData.imageUrl)) {
        errors.imageUrl = 'URL hình ảnh không hợp lệ';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors: errors
    };
}

/**
 * Show an inline error message below a form field
 * @param {string} fieldId - The ID of the input field
 * @param {string} message - The error message to display
 */
function showInlineError(fieldId, message) {
    var field = document.getElementById(fieldId);
    if (!field) return;

    // Add invalid class to the field
    field.classList.add('is-invalid');

    // Check if error element already exists
    var existingError = field.parentElement.querySelector('.inline-error');
    if (existingError) {
        existingError.textContent = message;
        return;
    }

    // Create error element
    var errorEl = document.createElement('div');
    errorEl.className = 'inline-error';
    errorEl.textContent = message;
    field.parentElement.appendChild(errorEl);
}

/**
 * Remove all inline error messages and invalid classes
 */
function clearErrors() {
    // Remove all inline error elements
    var errors = document.querySelectorAll('.inline-error');
    for (var i = 0; i < errors.length; i++) {
        errors[i].remove();
    }

    // Remove is-invalid class from all fields
    var invalidFields = document.querySelectorAll('.is-invalid');
    for (var j = 0; j < invalidFields.length; j++) {
        invalidFields[j].classList.remove('is-invalid');
    }
}

/**
 * Generate a placeholder image URL using picsum.photos
 * @param {string|number} seed - Seed for consistent image
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function getPlaceholderImage(seed, width, height) {
    return 'https://picsum.photos/seed/art' + seed + '/' + (width || 600) + '/' + (height || 800);
}

/**
 * Get a working image URL — use the provided URL if valid, else use placeholder
 * @param {string} imageUrl - Original image URL
 * @param {string|number} id - Artwork ID for fallback seed
 * @returns {string}
 */
function getImageUrl(imageUrl, id) {
    if (imageUrl && imageUrl.indexOf('ibb.co/example') === -1 && isValidUrl(imageUrl)) {
        return imageUrl;
    }
    return getPlaceholderImage(id, 600, 800);
}
