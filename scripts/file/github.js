/**
 * GitHub integration UI
 */

import { APIClient } from '../utils/api.js';
import { config } from '../config.js';

export class GitHubUI {
    constructor(loadDocumentCallback) {
        this.loadDocument = loadDocumentCallback;
        this.authenticated = false;
        this.currentRepo = null;
        // Expose instance for global onclick handlers (desktop polling)
        window._githubUIInstance = this;
    }

    // Helper to get backend URL for OAuth redirect
    // For relative URLs, use current origin
    getBackendBaseURL() {
        const apiUrl = APIClient.getBackendURL();

        // If relative URL (starts with /), use current origin
        if (apiUrl.startsWith('/')) {
            return window.location.origin;
        }

        // Otherwise, remove '/api' suffix from absolute URL
        return apiUrl.replace(/\/api$/, '');
    }

    async show() {
        const dialog = document.getElementById('github-dialog');
        const content = document.getElementById('github-content');

        // Check if authenticated
        try {
            const userInfo = await this.getUserInfo();
            if (userInfo) {
                this.authenticated = true;
                content.innerHTML = await this.renderRepoList();
            } else {
                content.innerHTML = this.renderAuthPrompt();
            }
        } catch (error) {
            content.innerHTML = this.renderAuthPrompt();
        }

        dialog.showModal();
    }

    async getUserInfo() {
        try {
            const response = await APIClient.get('/github/user');
            return response.success ? response.user : null;
        } catch (error) {
            return null;
        }
    }

    renderAuthPrompt() {
        return `
            <div class="github-auth">
                <div class="github-auth__icon">&#128279;</div>
                <h3>Connect to GitHub</h3>
                <p class="github-auth__text">
                    Connect your GitHub account to open and save markdown files
                    directly from your repositories.
                </p>
                <button class="github-auth__button" onclick="this.connectGitHub()">
                    Connect GitHub Account
                </button>
            </div>
        `;
    }

    connectGitHub() {
        const backendUrl = this.getBackendBaseURL();
        const authUrl = `${backendUrl}/api/github/auth`;

        // In Electron, open auth in system browser and poll for completion
        if (typeof window.electronAPI !== 'undefined') {
            const nonce = crypto.randomUUID();
            window.electronAPI.openExternal(`${authUrl}?source=desktop&nonce=${nonce}`);
            this._pollForAuth(nonce);
            return;
        }

        // Web: redirect as usual
        window.location.href = authUrl;
    }

    async _pollForAuth(nonce, maxAttempts = 60, interval = 2000) {
        const content = document.getElementById('github-content');
        content.innerHTML = `
            <div class="github-auth">
                <div class="github-auth__icon">⏳</div>
                <h3>Waiting for GitHub Authentication...</h3>
                <p class="github-auth__text">
                    Complete the sign-in in your browser, then return here.
                </p>
                <button class="github-auth__button" onclick="window._cancelGitHubPoll && window._cancelGitHubPoll()">
                    Cancel
                </button>
            </div>
        `;

        let cancelled = false;
        window._cancelGitHubPoll = () => {
            cancelled = true;
            delete window._cancelGitHubPoll;
            this.show();
        };

        for (let i = 0; i < maxAttempts; i++) {
            if (cancelled) return;
            try {
                const result = await APIClient.get(`/github/desktop-status?nonce=${nonce}`);
                if (result.success) {
                    delete window._cancelGitHubPoll;
                    this.authenticated = true;
                    content.innerHTML = await this.renderRepoList();
                    return;
                }
                if (result.error === 'nonce_expired_or_invalid') {
                    cancelled = true;
                    delete window._cancelGitHubPoll;
                    content.innerHTML = `
                        <div class="github-auth">
                            <div class="github-auth__icon">⚠️</div>
                            <h3>Authentication Session Expired</h3>
                            <p class="github-auth__text">
                                The authentication session expired or was invalid. Please try again.
                            </p>
                            <button class="github-auth__button" onclick="window.connectGitHub()">
                                Try Again
                            </button>
                        </div>
                    `;
                    return;
                }
                // result.pending === true means still waiting
            } catch (error) {
                // Log unexpected errors for debugging
                if (error?.status && error.status !== 401 && error.status !== 404) {
                    console.warn('[GitHub Poll] Unexpected error:', error);
                }
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        // Timed out
        delete window._cancelGitHubPoll;
        content.innerHTML = `
            <div class="github-auth">
                <div class="github-auth__icon">⚠️</div>
                <h3>Authentication Timed Out</h3>
                <p class="github-auth__text">
                    GitHub authentication did not complete in time. Please try again.
                </p>
                <button class="github-auth__button" onclick="window.connectGitHub()">
                    Try Again
                </button>
            </div>
        `;
    }

    async renderRepoList() {
        try {
            const response = await APIClient.get('/github/repos');
            if (!response.success) {
                throw new Error('Failed to fetch repositories');
            }

            const repos = response.repositories;

            return `
                <div class="github-repos">
                    <button onclick="this.disconnectGitHub()" style="margin-bottom: 16px;">
                        Disconnect GitHub
                    </button>
                    <h3>Your Repositories</h3>
                    <div class="github-repos__list">
                        ${repos.map(repo => `
                            <div class="repo-item" data-repo="${repo.full_name}">
                                <div class="repo-item__name">${repo.name}</div>
                                <div class="repo-item__description">
                                    ${repo.description || 'No description'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            return `<p>Error loading repositories: ${error.message}</p>`;
        }
    }

    async disconnectGitHub() {
        try {
            await APIClient.post('/github/logout');
            this.authenticated = false;
            this.show();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async openRepoFile(repoFullName) {
        try {
            const response = await APIClient.get(`/github/files?repo=${repoFullName}`);
            if (!response.success) {
                throw new Error('Failed to fetch files');
            }

            const files = response.files;

            const content = document.getElementById('github-content');
            content.innerHTML = `
                <div class="github-files">
                    <button onclick="this.show()">← Back to Repositories</button>
                    <h3>${repoFullName}</h3>
                    <div class="github-files__list">
                        ${files.map(file => `
                            <div class="file-item" data-path="${file.path}" data-repo="${repoFullName}">
                                <span>${file.type === 'dir' ? '📁' : '📄'}</span>
                                <span>${file.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Add click handlers
            content.querySelectorAll('.file-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const path = item.dataset.path;
                    const repo = item.dataset.repo;
                    await this.loadFileFromGitHub(repo, path);
                });
            });
        } catch (error) {
            console.error('Open repo error:', error);
        }
    }

    async loadFileFromGitHub(repo, path) {
        try {
            const response = await APIClient.get(`/github/file?repo=${repo}&path=${path}`);
            if (!response.success) {
                throw new Error('Failed to load file');
            }

            const file = response.file;
            this.loadDocument(file.name, file.content, `github:${repo}/${path}`);

            document.getElementById('github-dialog').close();
        } catch (error) {
            console.error('Load file error:', error);
        }
    }
}

// Make methods available globally for inline onclick handlers
window.connectGitHub = function() {
    // Get backend URL dynamically from config
    const apiUrl = localStorage.getItem('api_base_url') || config.BACKEND_URL;

    // If relative URL, use current origin
    let backendUrl;
    if (apiUrl.startsWith('/')) {
        backendUrl = window.location.origin;
    } else {
        backendUrl = apiUrl.replace(/\/api$/, '');
    }

    const authUrl = `${backendUrl}/api/github/auth`;

    // In Electron, open auth in system browser and poll via GitHubUI instance
    if (typeof window.electronAPI !== 'undefined') {
        const nonce = crypto.randomUUID();
        window.electronAPI.openExternal(`${authUrl}?source=desktop&nonce=${nonce}`);
        // If a GitHubUI instance is available, use its polling
        if (window._githubUIInstance) {
            window._githubUIInstance._pollForAuth(nonce);
        }
        return;
    }

    // Web: redirect as usual
    window.location.href = authUrl;
};

window.disconnectGitHub = async function() {
    try {
        await APIClient.post('/github/logout');
        location.reload();
    } catch (error) {
        console.error('Logout error:', error);
    }
};
