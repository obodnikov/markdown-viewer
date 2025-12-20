/**
 * API client for backend communication
 *
 * Uses relative URLs by default for reverse proxy compatibility.
 * Supports override for debugging purposes.
 */

import { config } from '../config.js';

// Get backend URL with support for overrides
// Priority: localStorage setting > URL parameter > config file default (relative)
function getAPIBaseURL() {
    // Check localStorage for custom backend URL (for debugging)
    const stored = localStorage.getItem('api_base_url');
    if (stored) {
        console.log('[API] Using localStorage override:', stored);
        return stored;
    }

    // Check URL parameters (for debugging)
    const params = new URLSearchParams(window.location.search);
    const apiUrl = params.get('api_url');
    if (apiUrl) {
        console.log('[API] Using URL parameter override:', apiUrl);
        return apiUrl;
    }

    // Default from config file (relative URL for proxy compatibility)
    return config.BACKEND_URL;
}

const API_BASE_URL = getAPIBaseURL();
console.log('[API] Backend URL:', API_BASE_URL);

export class APIClient {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            ...options
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMessage = error.error || `HTTP ${response.status}`;
                const httpError = new Error(errorMessage);
                httpError.status = response.status;
                throw httpError;
            }

            // Handle file downloads
            if (options.expectFile) {
                return response;
            }

            return await response.json();

        } catch (error) {
            // Don't log expected authentication failures (401) unless explicitly requested
            if (error.status !== 401 || options.logErrors !== false) {
                if (error.status !== 401) {
                    console.error('API request failed:', error);
                }
            }
            throw error;
        }
    }

    static async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    static async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Set custom backend URL
     * @param {string} url - Backend base URL (e.g., 'http://localhost:3000/api')
     */
    static setBackendURL(url) {
        localStorage.setItem('api_base_url', url);
        location.reload(); // Reload to apply changes
    }

    /**
     * Get current backend URL
     * @returns {string} Current API base URL
     */
    static getBackendURL() {
        return API_BASE_URL;
    }

    /**
     * Reset backend URL to default
     */
    static resetBackendURL() {
        localStorage.removeItem('api_base_url');
        location.reload();
    }
}
