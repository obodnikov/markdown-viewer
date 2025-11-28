/**
 * Editable document title component
 */

export class EditableTitle {
    constructor(titleElement, onTitleChange) {
        this.titleElement = titleElement;
        this.onTitleChange = onTitleChange;
        this.isEditing = false;
        this.currentTitle = '';
        this.modifiedMarker = '';

        this.init();
    }

    init() {
        // Make title clickable
        this.titleElement.addEventListener('click', () => this.startEditing());

        // Add hover styles
        this.titleElement.style.cursor = 'pointer';
        this.titleElement.setAttribute('title', 'Click to edit document name');
    }

    startEditing() {
        if (this.isEditing) return;

        this.isEditing = true;

        // Get current title without the modified marker
        const fullText = this.titleElement.textContent;
        this.modifiedMarker = fullText.endsWith(' *') ? ' *' : '';
        this.currentTitle = fullText.replace(/ \*$/, '');

        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'toolbar__title-input';
        input.value = this.currentTitle;

        // Replace title with input
        this.titleElement.style.display = 'none';
        this.titleElement.parentNode.insertBefore(input, this.titleElement);

        // Focus and select all text
        input.focus();
        input.select();

        // Handle save
        const save = () => {
            const newTitle = this.sanitizeFilename(input.value.trim());
            if (newTitle && newTitle !== this.currentTitle) {
                this.currentTitle = newTitle;
                if (this.onTitleChange) {
                    this.onTitleChange(newTitle);
                }
            }
            this.finishEditing(input);
        };

        // Handle cancel
        const cancel = () => {
            this.finishEditing(input);
        };

        // Event listeners
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });
    }

    finishEditing(input) {
        if (!this.isEditing) return;

        this.isEditing = false;

        // Update title text
        this.titleElement.textContent = this.currentTitle + this.modifiedMarker;

        // Remove input and show title
        input.remove();
        this.titleElement.style.display = '';
    }

    /**
     * Set the document title
     */
    setTitle(title, modified = false) {
        this.currentTitle = title;
        this.modifiedMarker = modified ? ' *' : '';
        this.titleElement.textContent = this.currentTitle + this.modifiedMarker;
    }

    /**
     * Get the current title (without modified marker)
     */
    getTitle() {
        return this.currentTitle;
    }

    /**
     * Get the current title as a filename (with extension)
     */
    getFilename(extension = '.md') {
        const base = this.currentTitle || 'document';
        // If already has extension, don't add another
        if (base.match(/\.\w+$/)) {
            return base;
        }
        return base + extension;
    }

    /**
     * Set modified state
     */
    setModified(modified) {
        this.modifiedMarker = modified ? ' *' : '';
        if (!this.isEditing) {
            this.titleElement.textContent = this.currentTitle + this.modifiedMarker;
        }
    }

    /**
     * Sanitize filename by removing invalid characters
     */
    sanitizeFilename(filename) {
        // Remove invalid filename characters: / \ : * ? " < > |
        let sanitized = filename.replace(/[/\\:*?"<>|]/g, '');

        // Remove leading/trailing dots and spaces
        sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

        // If empty after sanitization, return default
        return sanitized || 'Untitled Document';
    }
}
