/**
 * BookStack integration UI
 */

import { APIClient } from '../utils/api.js';

export class BookStackUI {
    constructor(loadDocumentCallback) {
        this.loadDocument = loadDocumentCallback;
        this.authenticated = false;
        this.currentView = 'auth'; // auth, shelves, books, chapters, pages
        this.breadcrumbs = [];
        this.currentShelf = null;
        this.currentBook = null;
        this.currentChapter = null;
    }

    async show() {
        const dialog = document.getElementById('bookstack-dialog');
        const content = document.getElementById('bookstack-dialog-body');
        const footer = document.getElementById('bookstack-dialog-footer');

        // Check if authenticated
        try {
            const status = await APIClient.get('/bookstack/status');
            if (status.authenticated) {
                this.authenticated = true;
                await this.renderShelvesList();
            } else {
                this.renderAuthForm();
            }
        } catch (error) {
            this.renderAuthForm();
        }

        dialog.showModal();

        // Setup close button with cleanup
        const closeBtn = dialog.querySelector('.dialog__close');
        const closeHandler = () => {
            this.cleanupBreadcrumbHandlers();
            dialog.close();
        };

        // Remove old listener if exists
        if (this._closeHandler) {
            closeBtn.removeEventListener('click', this._closeHandler);
        }

        this._closeHandler = closeHandler;
        closeBtn.addEventListener('click', this._closeHandler);
    }

    renderAuthForm() {
        const content = document.getElementById('bookstack-dialog-body');
        const footer = document.getElementById('bookstack-dialog-footer');

        content.innerHTML = `
            <div class="bookstack-auth">
                <div class="bookstack-auth__header">
                    <span class="bookstack-auth__icon">📚</span>
                    <h3>Connect to BookStack</h3>
                </div>
                <p class="bookstack-auth__text">
                    Enter your BookStack API credentials to access your pages.
                </p>
                <form id="bookstack-auth-form" class="bookstack-auth__form">
                    <div class="form-group">
                        <label for="bookstack-token-id">Token ID</label>
                        <input
                            type="password"
                            id="bookstack-token-id"
                            class="form-control"
                            placeholder="Enter your token ID"
                            required
                            autocomplete="off"
                        />
                    </div>
                    <div class="form-group">
                        <label for="bookstack-token-secret">Token Secret</label>
                        <input
                            type="password"
                            id="bookstack-token-secret"
                            class="form-control"
                            placeholder="Enter your token secret"
                            required
                            autocomplete="off"
                        />
                    </div>
                    <div id="bookstack-auth-error" class="error-message" style="display: none;"></div>
                </form>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="button" id="bookstack-cancel-btn">Cancel</button>
            <button type="submit" class="button button--primary" form="bookstack-auth-form" id="bookstack-connect-btn">Connect</button>
        `;

        // Setup event handlers
        document.getElementById('bookstack-cancel-btn').addEventListener('click', () => {
            document.getElementById('bookstack-dialog').close();
        });

        // Handle form submission (supports both button click and Enter key)
        document.getElementById('bookstack-auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.authenticate();
        });
    }

    async authenticate() {
        const tokenId = document.getElementById('bookstack-token-id').value.trim();
        const tokenSecret = document.getElementById('bookstack-token-secret').value.trim();
        const errorDiv = document.getElementById('bookstack-auth-error');
        const connectBtn = document.getElementById('bookstack-connect-btn');

        if (!tokenId || !tokenSecret) {
            errorDiv.textContent = 'Please enter both Token ID and Secret';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            connectBtn.disabled = true;
            connectBtn.textContent = 'Connecting...';
            errorDiv.style.display = 'none';

            const response = await APIClient.post('/bookstack/authenticate', {
                token_id: tokenId,
                token_secret: tokenSecret
            });

            if (response.success) {
                this.authenticated = true;
                this.showToast('Connected to BookStack successfully!', 'success');
                await this.renderShelvesList();
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            errorDiv.textContent = error.message || 'Authentication failed. Please check your credentials.';
            errorDiv.style.display = 'block';
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect';
        }
    }

    async disconnect() {
        try {
            // Clean up breadcrumb handler
            this.cleanupBreadcrumbHandlers();

            await APIClient.post('/bookstack/logout');
            this.authenticated = false;
            this.breadcrumbs = [];
            this.currentView = 'auth';
            this.showToast('Disconnected from BookStack', 'info');
            this.renderAuthForm();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    cleanupBreadcrumbHandlers() {
        const content = document.getElementById('bookstack-dialog-body');
        if (content && this._breadcrumbHandler) {
            content.removeEventListener('click', this._breadcrumbHandler);
            this._breadcrumbHandler = null;
        }
    }

    async renderShelvesList() {
        const content = document.getElementById('bookstack-dialog-body');
        const footer = document.getElementById('bookstack-dialog-footer');

        content.innerHTML = '<div class="loading">Loading shelves...</div>';

        try {
            const response = await APIClient.get('/bookstack/shelves?count=100&sort=+name');
            const shelves = response.data || [];

            // Also get books without shelves
            const booksResponse = await APIClient.get('/bookstack/books?count=100&sort=+name');
            const allBooks = booksResponse.data || [];

            // Filter books that don't belong to any shelf
            const shelfBookIds = new Set();
            shelves.forEach(shelf => {
                if (shelf.books) {
                    shelf.books.forEach(book => shelfBookIds.add(book.id));
                }
            });
            const unshelvedBooks = allBooks.filter(book => !shelfBookIds.has(book.id));

            this.breadcrumbs = [{ name: 'BookStack', action: () => this.renderShelvesList() }];

            content.innerHTML = `
                <div class="bookstack-browser">
                    ${this.renderBreadcrumbs()}
                    <div class="bookstack-list">
                        ${shelves.length > 0 ? shelves.map(shelf => `
                            <div class="bookstack-item bookstack-item--shelf" data-shelf-id="${shelf.id}">
                                <span class="bookstack-item__icon">📚</span>
                                <div class="bookstack-item__content">
                                    <div class="bookstack-item__name">${this.escapeHtml(shelf.name)}</div>
                                    <div class="bookstack-item__meta">${shelf.books?.length || 0} books</div>
                                </div>
                                <span class="bookstack-item__arrow">→</span>
                            </div>
                        `).join('') : ''}
                        ${unshelvedBooks.length > 0 ? `
                            <div class="bookstack-section-title">Books (No Shelf)</div>
                            ${unshelvedBooks.map(book => `
                                <div class="bookstack-item bookstack-item--book" data-book-id="${book.id}">
                                    <span class="bookstack-item__icon">📖</span>
                                    <div class="bookstack-item__content">
                                        <div class="bookstack-item__name">${this.escapeHtml(book.name)}</div>
                                        <div class="bookstack-item__meta">${book.description || ''}</div>
                                    </div>
                                    <span class="bookstack-item__arrow">→</span>
                                </div>
                            `).join('')}
                        ` : ''}
                        ${shelves.length === 0 && unshelvedBooks.length === 0 ? '<div class="empty-state">No shelves or books found</div>' : ''}
                    </div>
                </div>
            `;

            footer.innerHTML = `
                <button class="button" id="bookstack-disconnect-btn">Disconnect</button>
            `;

            // Setup click handlers
            content.querySelectorAll('.bookstack-item--shelf').forEach(item => {
                item.addEventListener('click', () => {
                    const shelfId = parseInt(item.dataset.shelfId);
                    this.renderShelfBooks(shelfId);
                });
            });

            content.querySelectorAll('.bookstack-item--book').forEach(item => {
                item.addEventListener('click', () => {
                    const bookId = parseInt(item.dataset.bookId);
                    this.renderBookContents(bookId);
                });
            });

            document.getElementById('bookstack-disconnect-btn').addEventListener('click', () => {
                this.disconnect();
            });

            // Setup breadcrumb click handlers
            this.setupBreadcrumbHandlers();

        } catch (error) {
            content.innerHTML = `<div class="error-message">Error loading shelves: ${error.message}</div>`;
            footer.innerHTML = `<button class="button" id="bookstack-disconnect-btn">Disconnect</button>`;
            document.getElementById('bookstack-disconnect-btn')?.addEventListener('click', () => this.disconnect());
        }
    }

    async renderShelfBooks(shelfId) {
        const content = document.getElementById('bookstack-dialog-body');
        const footer = document.getElementById('bookstack-dialog-footer');

        content.innerHTML = '<div class="loading">Loading books...</div>';

        try {
            const shelf = await APIClient.get(`/bookstack/shelves/${shelfId}`);
            this.currentShelf = shelf;

            this.breadcrumbs = [
                { name: 'BookStack', action: () => this.renderShelvesList() },
                { name: shelf.name, action: () => this.renderShelfBooks(shelfId) }
            ];

            const books = shelf.books || [];

            content.innerHTML = `
                <div class="bookstack-browser">
                    ${this.renderBreadcrumbs()}
                    <div class="bookstack-list">
                        ${books.map(book => `
                            <div class="bookstack-item bookstack-item--book" data-book-id="${book.id}">
                                <span class="bookstack-item__icon">📖</span>
                                <div class="bookstack-item__content">
                                    <div class="bookstack-item__name">${this.escapeHtml(book.name)}</div>
                                    <div class="bookstack-item__meta">${book.description || ''}</div>
                                </div>
                                <span class="bookstack-item__arrow">→</span>
                            </div>
                        `).join('')}
                        ${books.length === 0 ? '<div class="empty-state">No books in this shelf</div>' : ''}
                    </div>
                </div>
            `;

            footer.innerHTML = `
                <button class="button" id="bookstack-back-btn">← Back</button>
                <button class="button" id="bookstack-disconnect-btn">Disconnect</button>
            `;

            // Setup click handlers
            content.querySelectorAll('.bookstack-item--book').forEach(item => {
                item.addEventListener('click', () => {
                    const bookId = parseInt(item.dataset.bookId);
                    this.renderBookContents(bookId);
                });
            });

            document.getElementById('bookstack-back-btn').addEventListener('click', () => {
                this.renderShelvesList();
            });

            document.getElementById('bookstack-disconnect-btn').addEventListener('click', () => {
                this.disconnect();
            });

            // Setup breadcrumb click handlers
            this.setupBreadcrumbHandlers();

        } catch (error) {
            content.innerHTML = `<div class="error-message">Error loading shelf: ${error.message}</div>`;
        }
    }

    async renderBookContents(bookId) {
        const content = document.getElementById('bookstack-dialog-body');
        const footer = document.getElementById('bookstack-dialog-footer');

        content.innerHTML = '<div class="loading">Loading book contents...</div>';

        try {
            const book = await APIClient.get(`/bookstack/books/${bookId}`);
            this.currentBook = book;

            this.breadcrumbs.push({
                name: book.name,
                action: () => this.renderBookContents(bookId)
            });

            // BookStack API returns a 'contents' array with mixed chapters and pages
            // Only top-level items appear in 'contents' - pages inside chapters are nested
            // Fallback to legacy structure if contents is not available
            let directPages, chapters;

            if (book.contents && book.contents.length > 0) {
                // Modern API response with contents array
                directPages = book.contents.filter(item => item.type === 'page');
                chapters = book.contents.filter(item => item.type === 'chapter');
            } else {
                // Fallback to legacy structure (if API behavior varies)
                directPages = book.pages?.filter(p => !p.chapter_id) || [];
                chapters = book.chapters || [];
            }

            content.innerHTML = `
                <div class="bookstack-browser">
                    ${this.renderBreadcrumbs()}
                    <div class="bookstack-list">
                        ${directPages.length > 0 ? `
                            <div class="bookstack-section-title">Pages</div>
                            ${directPages.map(page => `
                                <div class="bookstack-item bookstack-item--page" data-page-id="${page.id}">
                                    <span class="bookstack-item__icon">📄</span>
                                    <div class="bookstack-item__content">
                                        <div class="bookstack-item__name">${this.escapeHtml(page.name)}</div>
                                    </div>
                                    <span class="bookstack-item__arrow">→</span>
                                </div>
                            `).join('')}
                        ` : ''}
                        ${chapters.length > 0 ? `
                            <div class="bookstack-section-title">Chapters</div>
                            ${chapters.map(chapter => `
                                <div class="bookstack-item bookstack-item--chapter" data-chapter-id="${chapter.id}">
                                    <span class="bookstack-item__icon">📑</span>
                                    <div class="bookstack-item__content">
                                        <div class="bookstack-item__name">${this.escapeHtml(chapter.name)}</div>
                                        <div class="bookstack-item__meta">${chapter.pages?.length || 0} pages</div>
                                    </div>
                                    <span class="bookstack-item__arrow">→</span>
                                </div>
                            `).join('')}
                        ` : ''}
                        ${directPages.length === 0 && chapters.length === 0 ? '<div class="empty-state">This book is empty</div>' : ''}
                    </div>
                </div>
            `;

            footer.innerHTML = `
                <button class="button" id="bookstack-back-btn">← Back</button>
                <button class="button" id="bookstack-disconnect-btn">Disconnect</button>
            `;

            // Setup click handlers
            content.querySelectorAll('.bookstack-item--page').forEach(item => {
                item.addEventListener('click', () => {
                    const pageId = parseInt(item.dataset.pageId);
                    this.loadPage(pageId);
                });
            });

            content.querySelectorAll('.bookstack-item--chapter').forEach(item => {
                item.addEventListener('click', () => {
                    const chapterId = parseInt(item.dataset.chapterId);
                    const chapter = chapters.find(c => c.id === chapterId);
                    this.renderChapterPages(chapter);
                });
            });

            document.getElementById('bookstack-back-btn').addEventListener('click', () => {
                this.breadcrumbs.pop();
                const prev = this.breadcrumbs[this.breadcrumbs.length - 1];
                if (prev) prev.action();
            });

            document.getElementById('bookstack-disconnect-btn').addEventListener('click', () => {
                this.disconnect();
            });

            // Setup breadcrumb click handlers
            this.setupBreadcrumbHandlers();

        } catch (error) {
            content.innerHTML = `<div class="error-message">Error loading book: ${error.message}</div>`;
        }
    }

    renderChapterPages(chapter) {
        const content = document.getElementById('bookstack-dialog-body');
        const footer = document.getElementById('bookstack-dialog-footer');

        this.currentChapter = chapter;
        this.breadcrumbs.push({
            name: chapter.name,
            action: () => this.renderChapterPages(chapter)
        });

        const pages = chapter.pages || [];

        content.innerHTML = `
            <div class="bookstack-browser">
                ${this.renderBreadcrumbs()}
                <div class="bookstack-list">
                    ${pages.map(page => `
                        <div class="bookstack-item bookstack-item--page" data-page-id="${page.id}">
                            <span class="bookstack-item__icon">📄</span>
                            <div class="bookstack-item__content">
                                <div class="bookstack-item__name">${this.escapeHtml(page.name)}</div>
                            </div>
                        </div>
                    `).join('')}
                    ${pages.length === 0 ? '<div class="empty-state">No pages in this chapter</div>' : ''}
                </div>
            </div>
        `;

        footer.innerHTML = `
            <button class="button" id="bookstack-back-btn">← Back</button>
            <button class="button" id="bookstack-disconnect-btn">Disconnect</button>
        `;

        // Setup click handlers
        content.querySelectorAll('.bookstack-item--page').forEach(item => {
            item.addEventListener('click', () => {
                const pageId = parseInt(item.dataset.pageId);
                this.loadPage(pageId);
            });
        });

        document.getElementById('bookstack-back-btn').addEventListener('click', () => {
            this.breadcrumbs.pop();
            const prev = this.breadcrumbs[this.breadcrumbs.length - 1];
            if (prev) prev.action();
        });

        document.getElementById('bookstack-disconnect-btn').addEventListener('click', () => {
            this.disconnect();
        });

        // Setup breadcrumb click handlers
        this.setupBreadcrumbHandlers();
    }

    async loadPage(pageId) {
        try {
            const page = await APIClient.get(`/bookstack/pages/${pageId}`);

            // Close dialog
            document.getElementById('bookstack-dialog').close();

            // Call the loadDocument callback with correct parameters
            if (this.loadDocument) {
                try {
                    this.loadDocument(page.name, page.markdown, page);
                } catch (callbackError) {
                    console.error('Error in loadDocument callback:', callbackError);
                    this.showToast(`Error loading document: ${callbackError.message}`, 'error');
                    return;
                }
            }

            this.showToast(`Loaded: ${page.name}`, 'success');

        } catch (error) {
            this.showToast(`Error loading page: ${error.message}`, 'error');
        }
    }

    renderBreadcrumbs() {
        return `
            <div class="bookstack-breadcrumbs" data-breadcrumb-container>
                ${this.breadcrumbs.map((crumb, index) => `
                    <span class="bookstack-breadcrumb ${index === this.breadcrumbs.length - 1 ? 'bookstack-breadcrumb--active' : ''}"
                          data-breadcrumb-index="${index}">
                        ${this.escapeHtml(crumb.name)}
                    </span>
                    ${index < this.breadcrumbs.length - 1 ? '<span class="bookstack-breadcrumb-separator">›</span>' : ''}
                `).join('')}
            </div>
        `;
    }

    setupBreadcrumbHandlers() {
        // Use event delegation on the container to avoid duplicate handlers
        const content = document.getElementById('bookstack-dialog-body');
        if (!content) return;

        // Remove old handler if it exists
        if (this._breadcrumbHandler) {
            content.removeEventListener('click', this._breadcrumbHandler);
        }

        // Create new handler using event delegation
        this._breadcrumbHandler = (event) => {
            const breadcrumb = event.target.closest('[data-breadcrumb-index]');
            if (!breadcrumb) return;

            const index = parseInt(breadcrumb.dataset.breadcrumbIndex);
            const crumb = this.breadcrumbs[index];

            // Don't navigate if clicking active breadcrumb
            if (crumb && index < this.breadcrumbs.length - 1) {
                this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);
                crumb.action();
            }
        };

        content.addEventListener('click', this._breadcrumbHandler);
    }

    // Helper method to show toast notifications (expects global showToast function)
    showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Create new page in BookStack
    async showCreateDialog(markdown, suggestedName) {
        return new Promise(async (resolve) => {
            const dialog = document.getElementById('bookstack-save-dialog');
            const form = document.getElementById('bookstack-save-form');
            const shelfSelect = document.getElementById('bookstack-shelf');
            const bookSelect = document.getElementById('bookstack-book');
            const chapterSelect = document.getElementById('bookstack-chapter');
            const pageNameInput = document.getElementById('bookstack-page-name');

            // Reset form
            form.reset();
            pageNameInput.value = suggestedName || 'Untitled Page';

            // Load shelves and books
            try {
                const shelvesResponse = await APIClient.get('/bookstack/shelves');
                const booksResponse = await APIClient.get('/bookstack/books');

                // Populate shelves
                shelfSelect.innerHTML = '<option value="">No Shelf</option>' +
                    (shelvesResponse.data || []).map(shelf =>
                        `<option value="${shelf.id}">${this.escapeHtml(shelf.name)}</option>`
                    ).join('');

                // Populate books
                const populateBooks = (shelfId = null) => {
                    const books = (booksResponse.data || []).filter(book =>
                        !shelfId || book.shelf_id === parseInt(shelfId)
                    );
                    bookSelect.innerHTML = '<option value="">Select a book...</option>' +
                        books.map(book =>
                            `<option value="${book.id}">${this.escapeHtml(book.name)}</option>`
                        ).join('');
                };

                populateBooks();

                // Shelf change handler
                shelfSelect.addEventListener('change', (e) => {
                    populateBooks(e.target.value || null);
                    chapterSelect.innerHTML = '<option value="">No Chapter</option>';
                });

                // Book change handler
                bookSelect.addEventListener('change', async (e) => {
                    const bookId = e.target.value;
                    if (bookId) {
                        const book = await APIClient.get(`/bookstack/books/${bookId}`);
                        chapterSelect.innerHTML = '<option value="">No Chapter</option>' +
                            (book.chapters || []).map(chapter =>
                                `<option value="${chapter.id}">${this.escapeHtml(chapter.name)}</option>`
                            ).join('');
                    } else {
                        chapterSelect.innerHTML = '<option value="">No Chapter</option>';
                    }
                });

            } catch (error) {
                this.showToast('Error loading BookStack data', 'error');
                resolve(null);
                return;
            }

            dialog.showModal();

            // Handle form submission
            const handleSave = async () => {
                const bookId = parseInt(bookSelect.value);
                const chapterId = chapterSelect.value ? parseInt(chapterSelect.value) : null;
                const pageName = pageNameInput.value.trim();

                if (!bookId || !pageName) {
                    this.showToast('Please select a book and enter a page name', 'error');
                    return;
                }

                try {
                    const response = await APIClient.post('/bookstack/pages', {
                        book_id: bookId,
                        chapter_id: chapterId,
                        name: pageName,
                        markdown: markdown
                    });

                    dialog.close();
                    resolve(response.page);
                } catch (error) {
                    this.showToast(`Error creating page: ${error.message}`, 'error');
                }
            };

            const handleCancel = () => {
                dialog.close();
                resolve(null);
            };

            document.getElementById('bookstack-save-submit').onclick = handleSave;
            document.getElementById('bookstack-save-cancel').onclick = handleCancel;
        });
    }

    // Update existing page
    async updatePage(pageId, markdown, originalUpdatedAt, forceOverwrite = false) {
        try {
            const response = await APIClient.put(`/bookstack/pages/${pageId}`, {
                markdown: markdown,
                updated_at: forceOverwrite ? null : originalUpdatedAt,
                conflict_resolution: forceOverwrite ? 'overwrite' : null
            });

            return response;
        } catch (error) {
            throw error;
        }
    }
}

// Make methods available globally for inline onclick handlers if needed
window.bookstackUI = null;

export function initBookStackUI(loadDocumentCallback) {
    window.bookstackUI = new BookStackUI(loadDocumentCallback);
    return window.bookstackUI;
}
