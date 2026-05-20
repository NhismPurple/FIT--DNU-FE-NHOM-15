/**
 * api.js — Centralized API Module
 * All MockAPI fetch calls (GET/POST/PUT/DELETE)
 * Assigned to window.API for global access
 */

const API_BASE = 'https://69fa35c8c509a40d3aa4125a.mockapi.io/api/v1';

window.API = {

    /**
     * GET /ArtGallery — Fetch all artworks
     * @returns {Promise<Array>} Array of artwork objects
     */
    getArtworks: function () {
        return fetch(API_BASE + '/ArtGallery')
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to fetch artworks: ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.getArtworks error:', error);
                throw error;
            });
    },

    /**
     * GET /ArtGallery/:id — Fetch a single artwork
     * @param {string|number} id
     * @returns {Promise<Object>}
     */
    getArtwork: function (id) {
        return fetch(API_BASE + '/ArtGallery/' + id)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to fetch artwork ' + id + ': ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.getArtwork error:', error);
                throw error;
            });
    },

    /**
     * POST /ArtGallery — Create a new artwork
     * @param {Object} data - Artwork data
     * @returns {Promise<Object>} Created artwork
     */
    createArtwork: function (data) {
        return fetch(API_BASE + '/ArtGallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to create artwork: ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.createArtwork error:', error);
                throw error;
            });
    },

    /**
     * PUT /ArtGallery/:id — Update an existing artwork
     * @param {string|number} id
     * @param {Object} data - Updated fields
     * @returns {Promise<Object>} Updated artwork
     */
    updateArtwork: function (id, data) {
        return fetch(API_BASE + '/ArtGallery/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to update artwork ' + id + ': ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.updateArtwork error:', error);
                throw error;
            });
    },

    /**
     * DELETE /ArtGallery/:id — Delete an artwork
     * @param {string|number} id
     * @returns {Promise<Object>}
     */
    deleteArtwork: function (id) {
        return fetch(API_BASE + '/ArtGallery/' + id, {
            method: 'DELETE'
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to delete artwork ' + id + ': ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.deleteArtwork error:', error);
                throw error;
            });
    },

    /**
     * GET /artists — Fetch all artists
     * @returns {Promise<Array>}
     */
    getArtists: function () {
        return fetch(API_BASE + '/artists')
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to fetch artists: ' + response.status);
                }
                return response.json();
            })
            .catch(function (error) {
                console.error('API.getArtists error:', error);
                throw error;
            });
    }
};
