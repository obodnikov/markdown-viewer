/**
 * Import Manager
 *
 * Handles importing content from external sources (ChatGPT, Claude, Perplexity).
 * Provides UI for entering share URLs and displays import progress.
 */

export class ImportManager {
    constructor() {
        this.onImportComplete = null; // Callback when import completes
    }

    /**
     * Import a ChatGPT conversation from a share URL.
     *
     * @param {string} url - The ChatGPT share URL
     * @param {Function} onProgress - Callback for progress updates
     * @returns {Promise<Object>} Import result with content and metadata
     */
    async importChatGPT(url, onProgress = null) {
        try {
            // Show progress: Starting
            if (onProgress) {
                onProgress({
                    status: 'loading',
                    message: 'Importing conversation...'
                });
            }

            // Call backend API
            const response = await fetch('/api/import/chatgpt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Import failed');
            }

            // Show progress: Success
            if (onProgress) {
                const messageCount = result.metadata?.message_count || 0;
                onProgress({
                    status: 'success',
                    message: `Imported ${messageCount} messages successfully`
                });
            }

            return result;

        } catch (error) {
            // Check if it's a timeout or large conversation error
            const errorMessage = error.message || 'Unknown error';

            if (errorMessage.includes('timed out') || errorMessage.includes('split')) {
                throw new Error(
                    'Import timed out. Try splitting the conversation into smaller parts at chatgpt.com, ' +
                    'then import each part separately.'
                );
            }

            throw error;
        }
    }

    /**
     * Validate a URL before attempting import.
     *
     * @param {string} url - The URL to validate
     * @returns {Object} Validation result with isValid and platform
     */
    validateURL(url) {
        if (!url || typeof url !== 'string') {
            return { isValid: false, error: 'Please enter a URL' };
        }

        url = url.trim();

        // Require HTTPS for security (share links should always be HTTPS)
        if (!url.startsWith('https://')) {
            return { isValid: false, error: 'URL must use HTTPS for security. HTTP is not allowed.' };
        }

        // Detect platform
        const urlLower = url.toLowerCase();
        let platform = null;

        if (urlLower.includes('chatgpt.com/share/')) {
            platform = 'chatgpt';
        } else if (urlLower.includes('claude.ai/share/')) {
            platform = 'claude';
        } else if (urlLower.includes('perplexity.ai/search/')) {
            platform = 'perplexity';
        }

        if (!platform) {
            return {
                isValid: false,
                error: 'Please provide a ChatGPT share link (chatgpt.com/share/...)'
            };
        }

        if (platform !== 'chatgpt') {
            return {
                isValid: false,
                error: `${platform} import is not yet supported. Only ChatGPT is currently available.`
            };
        }

        return { isValid: true, platform };
    }

    /**
     * Show the import dialog.
     */
    showDialog() {
        const dialog = document.getElementById('import-dialog');
        if (dialog) {
            // Clear any previous input/errors
            const urlInput = document.getElementById('import-url-input');
            const errorMsg = document.getElementById('import-error-message');

            if (urlInput) urlInput.value = '';
            if (errorMsg) {
                errorMsg.textContent = '';
                errorMsg.style.display = 'none';
            }

            dialog.showModal();
        }
    }

    /**
     * Close the import dialog.
     */
    closeDialog() {
        const dialog = document.getElementById('import-dialog');
        if (dialog) {
            dialog.close();
        }
    }

    /**
     * Handle the import button click in the dialog.
     */
    async handleImport() {
        const urlInput = document.getElementById('import-url-input');
        const errorMsg = document.getElementById('import-error-message');
        const importBtn = document.getElementById('import-execute-btn');
        const progressIndicator = document.getElementById('import-progress');

        if (!urlInput || !errorMsg || !importBtn || !progressIndicator) {
            console.error('Import dialog elements not found');
            return;
        }

        const url = urlInput.value.trim();

        // Hide previous errors
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';

        // Validate URL
        const validation = this.validateURL(url);
        if (!validation.isValid) {
            this.showError(validation.error);
            return;
        }

        // Disable button and show progress
        importBtn.disabled = true;
        progressIndicator.style.display = 'block';
        progressIndicator.textContent = 'Importing conversation...';

        try {
            // Import the conversation
            const result = await this.importChatGPT(url, (progress) => {
                progressIndicator.textContent = progress.message;
            });

            // Close dialog
            this.closeDialog();

            // Call the completion callback with the imported content
            if (this.onImportComplete && result.content) {
                this.onImportComplete(result.content, result.metadata);
            }

        } catch (error) {
            // Show error and keep dialog open for retry
            this.showError(error.message);
            progressIndicator.style.display = 'none';
        } finally {
            // Re-enable button
            importBtn.disabled = false;
        }
    }

    /**
     * Show an error message in the dialog.
     *
     * @param {string} message - The error message to display
     */
    showError(message) {
        const errorMsg = document.getElementById('import-error-message');
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }
    }

    /**
     * Initialize the import manager and wire up event listeners.
     */
    init() {
        // Close button
        const closeBtn = document.getElementById('close-import-dialog');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeDialog());
        }

        // Import button
        const importBtn = document.getElementById('import-execute-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImport());
        }

        // Enter key in URL input
        const urlInput = document.getElementById('import-url-input');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleImport();
                }
            });
        }
    }
}
