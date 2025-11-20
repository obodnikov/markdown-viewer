/**
 * API client for backend communication
 */

// Auto-detect backend URL
// Priority: localStorage setting > URL parameter > default
function getAPIBaseURL() {
    // Check localStorage for custom backend URL
    const stored = localStorage.getItem('api_base_url');
    if (stored) {
        return stored;
    }

    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const apiUrl = params.get('api_url');
    if (apiUrl) {
        return apiUrl;
    }

    // Default
    return 'http://localhost:5000/api';
}

const API_BASE_URL = getAPIBaseURL();

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
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            // Handle file downloads
            if (options.expectFile) {
                return response;
            }

            return await response.json();

        } catch (error) {
            console.error('API request failed:', error);
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
