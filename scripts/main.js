/**
 * Main application bootstrap
 */

import { EditorManager } from './editor/editor.js';
import { MarkdownParser } from './markdown/parser.js';
import { TransformUI } from './transforms/transform-ui.js';
import { FileManager } from './file/local.js';
import { GitHubUI } from './file/github.js';
import { BookStackUI } from './file/bookstack.js';
import { ExportManager } from './file/export.js';
import { StorageManager } from './utils/storage.js';
import { EditableTitle } from './ui/editable-title.js';
import { tokenizer } from './utils/tokenizer.js';
import { ScrollSync } from './editor/sync.js';

class MarkdownViewerApp {
    constructor() {
        this.editor = null;
        this.parser = null;
        this.transform = null;
        this.fileManager = null;
        this.githubUI = null;
        this.bookstackUI = null;
        this.exportManager = null;
        this.storage = null;
        this.editableTitle = null;
        this.scrollSync = null;

        this.currentDocument = {
            title: 'Untitled Document',
            content: '',
            filepath: null,
            modified: false,
            source: null,           // 'local', 'github', 'bookstack', or null
            sourceInfo: null        // Additional info about source (e.g., pageId, repo, etc.)
        };
    }

    async init() {
        console.log('Initializing Markdown Viewer...');

        // Initialize modules
        this.parser = new MarkdownParser();
        this.storage = new StorageManager();
        this.fileManager = new FileManager();
        this.exportManager = new ExportManager();

        // Initialize editable title
        this.editableTitle = new EditableTitle(
            document.getElementById('document-title'),
            this.onTitleChange.bind(this)
        );

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
            this.loadDocumentFromGitHub.bind(this)
        );

        // Initialize BookStack UI
        this.bookstackUI = new BookStackUI(
            this.loadDocumentFromBookStack.bind(this)
        );

        // Initialize scroll synchronization
        // Note: preview-pane is the scrollable container, not preview element
        this.scrollSync = new ScrollSync(
            this.editor,
            document.getElementById('preview-pane')
        );

        // Setup event listeners
        this.setupEventListeners();

        // Load auto-saved content if exists
        this.loadAutoSave();

        // Initial render
        this.updatePreview();

        // Enable scroll sync for initial split view
        this.scrollSync.enable();

        console.log('Markdown Viewer initialized');
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('btn-new').addEventListener('click', () => this.newDocument());
        document.getElementById('btn-open').addEventListener('click', () => this.openFile());
        document.getElementById('btn-save').addEventListener('click', () => this.saveFile());
        document.getElementById('btn-export').addEventListener('click', () => this.showExportDialog());
        document.getElementById('btn-github').addEventListener('click', () => this.showGitHubDialog());
        document.getElementById('btn-bookstack').addEventListener('click', () => this.showBookStackDialog());
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

        // BookStack dialog
        document.getElementById('close-bookstack-dialog').addEventListener('click', () => {
            document.getElementById('bookstack-dialog').close();
        });

        // Save destination dialog
        this.setupSaveDestinationDialog();

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

    onTitleChange(newTitle) {
        this.currentDocument.title = newTitle;
        this.currentDocument.modified = true;
        this.updateStatus();

        // Clear the file handle so next save will prompt for new filename
        this.fileManager.clearFileHandle();
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

    async updateStatus() {
        const content = this.currentDocument.content;
        const chars = content.length;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const lines = content.split('\n').length;

        document.getElementById('status-chars').textContent = `${chars} chars`;
        document.getElementById('status-words').textContent = `${words} words`;
        document.getElementById('status-lines').textContent = `${lines} line${lines !== 1 ? 's' : ''}`;

        // Update title using editable title
        this.editableTitle.setTitle(this.currentDocument.title, this.currentDocument.modified);

        // Update token count asynchronously
        this.updateTokenCount(content);
    }

    async updateTokenCount(content) {
        try {
            const tokenCount = await tokenizer.countTokens(content);
            const formatted = tokenizer.formatTokenCount(tokenCount);
            document.getElementById('status-tokens').textContent = formatted;
        } catch (error) {
            console.error('Token count error:', error);
            document.getElementById('status-tokens').textContent = '0 tokens';
        }
    }

    changeViewMode(mode) {
        const splitPane = document.getElementById('split-pane');
        splitPane.dataset.view = mode;

        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('view-tab--active', tab.dataset.view === mode);
        });

        // Enable/disable scroll sync based on view mode
        if (this.scrollSync) {
            if (mode === 'split') {
                this.scrollSync.enable();
            } else {
                this.scrollSync.disable();
            }
        }
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
            modified: false,
            source: null,
            sourceInfo: null
        };

        this.editor.setContent('');
        this.updatePreview();
        this.updateStatus();
        this.updateSourceIndicator();
    }

    async openFile() {
        const file = await this.fileManager.openFile();
        if (file) {
            this.loadDocument(file.name, file.content, file.filepath);
        }
    }

    async saveFile() {
        // Smart Save: Contextual behavior based on document source
        const source = this.currentDocument.source;

        if (source === 'bookstack') {
            // Document from BookStack - save back to BookStack
            await this.saveToBookStack();
        } else if (source === 'github') {
            // Document from GitHub - open GitHub dialog for save
            this.showGitHubDialog();
        } else if (source === 'local') {
            // Document from local file - save back to local
            await this.saveToLocal();
        } else {
            // New document - show destination dialog
            await this.saveNewDocument();
        }
    }

    async saveToLocal() {
        // Get filename from editable title
        const filename = this.editableTitle.getFilename('.md');

        const saved = await this.fileManager.saveFile(
            this.currentDocument.content,
            filename
        );

        if (saved) {
            this.currentDocument.modified = false;
            this.currentDocument.filepath = saved.filepath;
            this.currentDocument.source = 'local';
            this.updateStatus();
            this.updateSourceIndicator();
            this.showToast('File saved successfully', 'success');
        }
    }

    async saveToBookStack() {
        // Save back to the BookStack page it was loaded from
        const { pageId, pageName, updatedAt } = this.currentDocument.sourceInfo;

        // Get fresh content from editor to avoid stale data
        const markdown = this.editor.getContent();
        this.currentDocument.content = markdown;

        try {
            const result = await this.bookstackUI.updatePage(pageId, markdown, updatedAt);

            if (result.conflict) {
                // Show conflict dialog
                await this.handleBookStackConflict(result.remotePage);
            } else {
                this.currentDocument.modified = false;
                this.currentDocument.sourceInfo.updatedAt = result.page.updated_at;
                this.updateStatus();
                this.updateSourceIndicator();
                this.showToast('Saved to BookStack', 'success');
            }
        } catch (error) {
            this.showToast(`Failed to save: ${error.message}`, 'error');
        }
    }

    async saveNewDocument() {
        // Show dialog to choose destination
        const destination = await this.showSaveDestinationDialog();

        if (destination === 'local') {
            await this.saveToLocal();
        } else if (destination === 'github') {
            // Open GitHub dialog for save
            this.showGitHubDialog();
        } else if (destination === 'bookstack') {
            // Show create page dialog
            const pageName = this.currentDocument.title;

            // Get fresh content from editor to avoid stale data
            const markdown = this.editor.getContent();
            this.currentDocument.content = markdown;

            try {
                const page = await this.bookstackUI.showCreateDialog(markdown, pageName);

                if (page) {
                    // Update document source to BookStack
                    this.currentDocument.source = 'bookstack';
                    this.currentDocument.sourceInfo = {
                        pageId: page.id,
                        pageName: page.name,
                        bookId: page.book_id,
                        updatedAt: page.updated_at
                    };
                    this.currentDocument.modified = false;
                    this.updateStatus();
                    this.updateSourceIndicator();
                    this.showToast('Page created in BookStack', 'success');
                }
            } catch (error) {
                this.showToast(`Failed to create page: ${error.message}`, 'error');
            }
        }
    }

    loadDocument(title, content, filepath = null) {
        // Remove file extension from title if present
        const cleanTitle = title.replace(/\.(md|markdown|txt)$/i, '');

        this.currentDocument = {
            title: cleanTitle,
            content,
            filepath,
            modified: false,
            source: 'local',
            sourceInfo: { filepath }
        };

        this.editor.setContent(content);
        this.updatePreview();
        this.updateStatus();
        this.updateSourceIndicator();
    }

    loadDocumentFromGitHub(title, content, repoInfo) {
        // Load document from GitHub
        const cleanTitle = title.replace(/\.(md|markdown|txt)$/i, '');

        this.currentDocument = {
            title: cleanTitle,
            content,
            filepath: null,
            modified: false,
            source: 'github',
            sourceInfo: repoInfo
        };

        this.editor.setContent(content);
        this.updatePreview();
        this.updateStatus();
        this.updateSourceIndicator();
    }

    loadDocumentFromBookStack(title, content, pageInfo) {
        // Load document from BookStack
        const cleanTitle = title.replace(/\.(md|markdown|txt)$/i, '');

        this.currentDocument = {
            title: cleanTitle,
            content,
            filepath: null,
            modified: false,
            source: 'bookstack',
            sourceInfo: {
                pageId: pageInfo.id,
                pageName: pageInfo.name,
                bookId: pageInfo.book_id,
                updatedAt: pageInfo.updated_at
            }
        };

        this.editor.setContent(content);
        this.updatePreview();
        this.updateStatus();
        this.updateSourceIndicator();

        // Close the BookStack dialog
        document.getElementById('bookstack-dialog').close();
    }

    showExportDialog() {
        document.getElementById('export-dialog').showModal();
    }

    async exportDocument(format) {
        document.getElementById('export-dialog').close();

        // Get filename from editable title (without extension)
        let filename = this.editableTitle.getTitle();
        // Convert to filename-friendly format
        filename = filename.replace(/\s+/g, '-').toLowerCase();

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

    showBookStackDialog() {
        this.bookstackUI.show();
    }

    setupSaveDestinationDialog() {
        // Setup event listeners for save destination dialog
        document.getElementById('close-save-destination-dialog').addEventListener('click', () => {
            document.getElementById('save-destination-dialog').close();
        });

        document.getElementById('destination-cancel').addEventListener('click', () => {
            document.getElementById('save-destination-dialog').close();
        });

        // Destination option handlers are set up in showSaveDestinationDialog()
    }

    showSaveDestinationDialog() {
        // Returns a promise that resolves with the chosen destination
        return new Promise((resolve) => {
            const dialog = document.getElementById('save-destination-dialog');

            // Setup one-time click handlers
            const handleDestination = (destination) => {
                dialog.close();
                resolve(destination);
            };

            // Remove any existing listeners by cloning elements
            const localBtn = document.getElementById('destination-local');
            const githubBtn = document.getElementById('destination-github');
            const bookstackBtn = document.getElementById('destination-bookstack');

            const newLocalBtn = localBtn.cloneNode(true);
            const newGithubBtn = githubBtn.cloneNode(true);
            const newBookstackBtn = bookstackBtn.cloneNode(true);

            localBtn.parentNode.replaceChild(newLocalBtn, localBtn);
            githubBtn.parentNode.replaceChild(newGithubBtn, githubBtn);
            bookstackBtn.parentNode.replaceChild(newBookstackBtn, bookstackBtn);

            newLocalBtn.addEventListener('click', () => handleDestination('local'));
            newGithubBtn.addEventListener('click', () => handleDestination('github'));
            newBookstackBtn.addEventListener('click', () => handleDestination('bookstack'));

            // Handle dialog close without selection
            const onClose = () => {
                resolve(null);
                dialog.removeEventListener('close', onClose);
            };
            dialog.addEventListener('close', onClose);

            dialog.showModal();
        });
    }

    async handleBookStackConflict(remotePage) {
        // Show conflict dialog and handle user choice
        return new Promise((resolve) => {
            const dialog = document.getElementById('bookstack-conflict-dialog');

            // Populate conflict information
            document.getElementById('conflict-page-name').textContent = remotePage.name;
            document.getElementById('conflict-updated-at').textContent = new Date(remotePage.updated_at).toLocaleString();

            // Setup one-time handlers
            const cleanup = () => {
                dialog.close();
                cancelBtn.removeEventListener('click', onCancel);
                viewDiffBtn.removeEventListener('click', onViewDiff);
                overwriteBtn.removeEventListener('click', onOverwrite);
            };

            const onCancel = () => {
                cleanup();
                resolve({ action: 'cancel' });
            };

            const onViewDiff = () => {
                cleanup();
                // TODO: Implement diff viewer
                this.showToast('Diff viewer not yet implemented', 'info');
                resolve({ action: 'cancel' });
            };

            const onOverwrite = async () => {
                cleanup();
                // Overwrite server version
                const { pageId } = this.currentDocument.sourceInfo;

                // Get fresh content from editor to avoid stale data
                const markdown = this.editor.getContent();
                this.currentDocument.content = markdown;

                try {
                    const result = await this.bookstackUI.updatePage(pageId, markdown, null, true);
                    this.currentDocument.modified = false;
                    this.currentDocument.sourceInfo.updatedAt = result.page.updated_at;
                    this.updateStatus();
                    this.updateSourceIndicator();
                    this.showToast('Saved to BookStack (overwritten)', 'success');
                    resolve({ action: 'overwrite', page: result.page });
                } catch (error) {
                    this.showToast(`Failed to save: ${error.message}`, 'error');
                    resolve({ action: 'error', error });
                }
            };

            const cancelBtn = document.getElementById('conflict-cancel');
            const viewDiffBtn = document.getElementById('conflict-view-diff');
            const overwriteBtn = document.getElementById('conflict-overwrite');

            cancelBtn.addEventListener('click', onCancel);
            viewDiffBtn.addEventListener('click', onViewDiff);
            overwriteBtn.addEventListener('click', onOverwrite);

            dialog.showModal();
        });
    }

    updateSourceIndicator() {
        const indicator = document.getElementById('document-source');
        const label = indicator.querySelector('.source-label');
        const source = this.currentDocument.source;

        if (!source || source === null) {
            indicator.style.display = 'none';
            return;
        }

        indicator.style.display = 'block';

        switch (source) {
            case 'local':
                label.textContent = '📁 Local File';
                break;
            case 'github':
                label.textContent = '🔗 GitHub';
                break;
            case 'bookstack':
                const pageName = this.currentDocument.sourceInfo?.pageName || 'BookStack';
                label.textContent = `📚 ${pageName}`;
                break;
            default:
                indicator.style.display = 'none';
        }
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

        // Ctrl/Cmd + K: BookStack
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.showBookStackDialog();
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
