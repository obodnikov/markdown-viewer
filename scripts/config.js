/**
 * Frontend configuration
 *
 * Using relative URLs for reverse proxy compatibility.
 *
 * This configuration works in all environments:
 * - Local development: /api → http://localhost:8000/api → nginx → backend:5050
 * - Behind reverse proxy: /api → https://yourdomain.com/api → proxy → container
 *
 * To override the backend URL (for debugging):
 * 1. Pass ?api_url=/api in the URL
 * 2. Or use APIClient.setBackendURL('/api') in console
 * 3. Or use absolute URL: APIClient.setBackendURL('http://localhost:5050/api')
 */

export const config = {
    // Backend API base URL - relative path for proxy compatibility
    // Uses the same origin as the frontend (no CORS issues)
    BACKEND_URL: '/api',
};
