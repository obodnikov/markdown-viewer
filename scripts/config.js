/**
 * Frontend configuration
 *
 * This file can be customized per environment.
 * To override the backend URL:
 * 1. Edit this file and change BACKEND_URL
 * 2. Or pass ?api_url=http://localhost:5050/api in the URL
 * 3. Or use APIClient.setBackendURL() in console
 */

export const config = {
    // Backend API base URL
    // Change this if your backend runs on a different port
    BACKEND_URL: 'http://localhost:5050/api',

    // Default values
    DEFAULT_BACKEND_PORT: 5050,
};
