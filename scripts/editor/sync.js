/**
 * Scroll synchronization between editor and preview
 * Implements proportional bidirectional scrolling for split view mode
 */

export class ScrollSync {
    constructor(editorManager, previewElement) {
        this.editorManager = editorManager;
        this.previewElement = previewElement;
        this.enabled = false;
        this.syncing = false; // Prevent infinite loop

        // Bind methods to preserve context
        this.handleEditorScroll = this.handleEditorScroll.bind(this);
        this.handlePreviewScroll = this.handlePreviewScroll.bind(this);
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.setupListeners();
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        this.removeListeners();
    }

    setupListeners() {
        const editorScrollContainer = this.editorManager.getScrollContainer();
        if (editorScrollContainer) {
            editorScrollContainer.addEventListener('scroll', this.handleEditorScroll, { passive: true });
        }

        this.previewElement.addEventListener('scroll', this.handlePreviewScroll, { passive: true });
    }

    removeListeners() {
        const editorScrollContainer = this.editorManager.getScrollContainer();
        if (editorScrollContainer) {
            editorScrollContainer.removeEventListener('scroll', this.handleEditorScroll);
        }

        this.previewElement.removeEventListener('scroll', this.handlePreviewScroll);
    }

    handleEditorScroll() {
        if (!this.enabled || this.syncing) return;
        this.syncEditorToPreview();
    }

    handlePreviewScroll() {
        if (!this.enabled || this.syncing) return;
        this.syncPreviewToEditor();
    }

    syncEditorToPreview() {
        const editorScrollContainer = this.editorManager.getScrollContainer();
        if (!editorScrollContainer) return;

        // Calculate scroll ratio from editor
        const scrollTop = editorScrollContainer.scrollTop;
        const scrollHeight = editorScrollContainer.scrollHeight;
        const clientHeight = editorScrollContainer.clientHeight;

        // Avoid division by zero
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll <= 0) return;

        const scrollRatio = scrollTop / maxScroll;

        // Apply ratio to preview
        this.syncing = true;
        const previewMaxScroll = this.previewElement.scrollHeight - this.previewElement.clientHeight;
        this.previewElement.scrollTop = scrollRatio * previewMaxScroll;

        // Use requestAnimationFrame to reset syncing flag
        requestAnimationFrame(() => {
            this.syncing = false;
        });
    }

    syncPreviewToEditor() {
        const editorScrollContainer = this.editorManager.getScrollContainer();
        if (!editorScrollContainer) return;

        // Calculate scroll ratio from preview
        const scrollTop = this.previewElement.scrollTop;
        const scrollHeight = this.previewElement.scrollHeight;
        const clientHeight = this.previewElement.clientHeight;

        // Avoid division by zero
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll <= 0) return;

        const scrollRatio = scrollTop / maxScroll;

        // Apply ratio to editor
        this.syncing = true;
        this.editorManager.setScrollPosition(scrollRatio);

        // Use requestAnimationFrame to reset syncing flag
        requestAnimationFrame(() => {
            this.syncing = false;
        });
    }
}
