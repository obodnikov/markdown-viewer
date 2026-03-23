/**
 * Markdown parser using marked.js
 * Uses a local Marked instance to avoid global state contamination.
 */

export class MarkdownParser {
    constructor() {
        this._slugCounts = new Map();
        this._marked = null;
        this._setupMarked();
    }

    /**
     * Recursively extract plain text from a marked token tree.
     * Avoids rendered HTML and entity escaping issues.
     */
    _extractText(tokens) {
        if (!Array.isArray(tokens)) return '';
        return tokens.map(t => {
            if (t.tokens) return this._extractText(t.tokens);
            return t.text || t.raw || '';
        }).join('');
    }

    /**
     * Generate a slug from plain text (simplified ASCII-centric approach).
     * Not fully GitHub-compatible — Unicode and some punctuation edge cases differ.
     * Tracks duplicates per parse call and appends -1, -2, etc.
     */
    _generateSlug(text) {
        let slug = text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s/g, '-');

        if (!slug) slug = 'heading';

        const count = this._slugCounts.get(slug);
        if (count === undefined) {
            this._slugCounts.set(slug, 0);
            return slug;
        }
        const next = count + 1;
        this._slugCounts.set(slug, next);
        return `${slug}-${next}`;
    }

    _setupMarked() {
        if (typeof marked === 'undefined') return;

        const self = this;

        // Create a local instance — no global state coupling
        // marked.Marked is available since v4; this project pins v11 via CDN.
        if (!marked.Marked) {
            console.error('marked.Marked constructor not available — check marked.js version');
            return;
        }
        this._marked = new marked.Marked({
            gfm: true,
            breaks: true
        });

        this._marked.use({
            renderer: {
                // marked v11 token signature: { tokens, depth }
                heading({ tokens, depth }) {
                    const text = self._marked.parseInline(tokens);
                    const plain = self._extractText(tokens);
                    const slug = self._generateSlug(plain);
                    return `<h${depth} id="${slug}">${text}</h${depth}>\n`;
                }
            }
        });
    }

    parse(markdown) {
        if (!this._marked) {
            console.error('marked.js not loaded');
            return '<p>Error: Markdown parser not loaded</p>';
        }

        try {
            this._slugCounts = new Map();
            return this._marked.parse(markdown);
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return `<p>Error parsing markdown: ${error.message}</p>`;
        }
    }

    parseInline(markdown) {
        if (!this._marked) {
            return markdown;
        }

        try {
            return this._marked.parseInline(markdown);
        } catch (error) {
            console.error('Inline markdown parsing error:', error);
            return markdown;
        }
    }
}
