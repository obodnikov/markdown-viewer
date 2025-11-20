/**
 * Main application bootstrap
 */

import { EditorManager } from './editor/editor.js';
import { MarkdownParser } from './markdown/parser.js';
import { TransformUI } from './transforms/transform-ui.js';
import { FileManager } from './file/local.js';
import { GitHubUI } from './file/github.js';
import { ExportManager } from './file/export.js';
import { StorageManager } from './utils/storage.js';

class MarkdownViewerApp {
    constructor() {
        this.editor = null;
        this.parser = null;
        this.transform = null;
        this.fileManager = null;
        this.githubUI = null;
        this.exportManager = null;
        this.storage = null;

        this.currentDocument = {
            title: 'Untitled Document',
            content: '',
            filepath: null,
            modified: false
        };
    }

    async init() {
        console.log('Initializing Markdown Viewer...');

        // Initialize modules
        this.parser = new MarkdownParser();
        this.storage = new StorageManager();
        this.fileManager = new FileManager();
        this.exportManager = new ExportManager();

        // Initialize editor
        this.editor = new EditorManager(
            document.getElementById('editor'),
            this.onEditorChange.bind(this)
        );

        // Initialize transform UI
        this.transform = new TransformUI(
            this.getCurrentContent.bind(this),
            this.setContent.bind(this)
        );

        // Initialize GitHub UI
        this.githubUI = new GitHubUI(
            this.loadDocument.bind(this)
        );

        // Setup event listeners
        this.setupEventListeners();

        // Load auto-saved content if exists
        this.loadAutoSave();

        // Initial render
        this.updatePreview();

        console.log('Markdown Viewer initialized');
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('btn-new').addEventListener('click', () => this.newDocument());
        document.getElementById('btn-open').addEventListener('click', () => this.openFile());
        document.getElementById('btn-save').addEventListener('click', () => this.saveFile());
        document.getElementById('btn-export').addEventListener('click', () => this.showExportDialog());
        document.getElementById('btn-github').addEventListener('click', () => this.showGitHubDialog());
        document.getElementById('btn-toggle-sidebar').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('btn-theme').addEventListener('click', () => this.toggleTheme());

        // View mode tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.changeViewMode(view);
            });
        });

        // Export dialog
        document.getElementById('close-export-dialog').addEventListener('click', () => {
            document.getElementById('export-dialog').close();
        });

        document.querySelectorAll('.export-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.exportDocument(format);
            });
        });

        // GitHub dialog
        document.getElementById('close-github-dialog').addEventListener('click', () => {
            document.getElementById('github-dialog').close();
        });

        // Auto-save interval
        setInterval(() => this.autoSave(), 30000);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Handle URL params (GitHub OAuth callback)
        this.handleURLParams();
    }

    onEditorChange(content) {
        this.currentDocument.content = content;
        this.currentDocument.modified = true;
        this.updatePreview();
        this.updateStatus();
    }

    getCurrentContent() {
        return this.currentDocument.content;
    }

    setContent(content) {
        this.editor.setContent(content);
        this.currentDocument.content = content;
        this.currentDocument.modified = true;
        this.updatePreview();
        this.updateStatus();
    }

    updatePreview() {
        const html = this.parser.parse(this.currentDocument.content);
        document.getElementById('preview').innerHTML = html;
    }

    updateStatus() {
        const content = this.currentDocument.content;
        const chars = content.length;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const lines = content.split('\n').length;

        document.getElementById('status-chars').textContent = `${chars} characters`;
        document.getElementById('status-words').textContent = `${words} words`;
        document.getElementById('status-lines').textContent = `${lines} line${lines !== 1 ? 's' : ''}`;

        // Update title
        const titleEl = document.getElementById('document-title');
        titleEl.textContent = this.currentDocument.title + (this.currentDocument.modified ? ' *' : '');
    }

    changeViewMode(mode) {
        const splitPane = document.getElementById('split-pane');
        splitPane.dataset.view = mode;

        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('view-tab--active', tab.dataset.view === mode);
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('transform-sidebar');
        sidebar.classList.toggle('is-collapsed');
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.dataset.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
    }

    async newDocument() {
        if (this.currentDocument.modified) {
            if (!confirm('You have unsaved changes. Create new document?')) {
                return;
            }
        }

        this.currentDocument = {
            title: 'Untitled Document',
            content: '',
            filepath: null,
            modified: false
        };

        this.editor.setContent('');
        this.updatePreview();
        this.updateStatus();
    }

    async openFile() {
        const file = await this.fileManager.openFile();
        if (file) {
            this.loadDocument(file.name, file.content, file.filepath);
        }
    }

    async saveFile() {
        const saved = await this.fileManager.saveFile(
            this.currentDocument.content,
            this.currentDocument.filepath || 'document.md'
        );

        if (saved) {
            this.currentDocument.modified = false;
            this.currentDocument.filepath = saved.filepath;
            this.updateStatus();
            this.showToast('File saved successfully', 'success');
        }
    }

    loadDocument(title, content, filepath = null) {
        this.currentDocument = {
            title,
            content,
            filepath,
            modified: false
        };

        this.editor.setContent(content);
        this.updatePreview();
        this.updateStatus();
    }

    showExportDialog() {
        document.getElementById('export-dialog').showModal();
    }

    async exportDocument(format) {
        document.getElementById('export-dialog').close();

        const filename = this.currentDocument.title.replace(/\s+/g, '-').toLowerCase();
        const content = this.currentDocument.content;

        try {
            await this.exportManager.export(format, content, filename);
            this.showToast(`Exported as ${format.toUpperCase()}`, 'success');
        } catch (error) {
            this.showToast(`Export failed: ${error.message}`, 'error');
        }
    }

    showGitHubDialog() {
        this.githubUI.show();
    }

    autoSave() {
        if (this.currentDocument.content) {
            this.storage.saveAutoSave(this.currentDocument.content);
        }
    }

    loadAutoSave() {
        const saved = this.storage.loadAutoSave();
        if (saved && saved.content) {
            if (confirm('Auto-saved content found. Load it?')) {
                this.setContent(saved.content);
            }
        }

        // Load theme preference
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.dataset.theme = theme;
    }

    handleKeyboard(e) {
        // Ctrl/Cmd + S: Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveFile();
        }

        // Ctrl/Cmd + O: Open
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            this.openFile();
        }

        // Ctrl/Cmd + N: New
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.newDocument();
        }

        // Ctrl/Cmd + E: Export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            this.showExportDialog();
        }
    }

    handleURLParams() {
        const params = new URLSearchParams(window.location.search);

        if (params.get('github_auth') === 'success') {
            this.showToast('GitHub authentication successful', 'success');
            window.history.replaceState({}, '', '/');
        }

        if (params.get('error')) {
            this.showToast(`Error: ${params.get('error')}`, 'error');
            window.history.replaceState({}, '', '/');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;

        toast.innerHTML = `
            <div class="toast__message">${message}</div>
            <button class="toast__close">×</button>
        `;

        const closeBtn = toast.querySelector('.toast__close');
        closeBtn.addEventListener('click', () => toast.remove());

        container.appendChild(toast);

        setTimeout(() => toast.remove(), 5000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new MarkdownViewerApp();
    app.init();
});
