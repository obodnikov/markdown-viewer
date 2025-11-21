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
    }

    // Helper to get backend URL (without /api suffix)
    getBackendBaseURL() {
        const apiUrl = APIClient.getBackendURL();
        // Remove '/api' suffix to get base URL
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
        window.location.href = `${backendUrl}/api/github/auth`;
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
    const backendUrl = apiUrl.replace(/\/api$/, '');
    window.location.href = `${backendUrl}/api/github/auth`;
};

window.disconnectGitHub = async function() {
    try {
        await APIClient.post('/github/logout');
        location.reload();
    } catch (error) {
        console.error('Logout error:', error);
    }
};
