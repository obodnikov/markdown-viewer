/**
 * Markdown parser using marked.js
 */

export class MarkdownParser {
    constructor() {
        this.setupMarked();
    }

    setupMarked() {
        // Configure marked for GitHub Flavored Markdown
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                gfm: true,
                breaks: true,
                headerIds: true,
                mangle: false,
                sanitize: false,
                smartLists: true,
                smartypants: false,
                xhtml: false
            });
        }
    }

    parse(markdown) {
        if (typeof marked === 'undefined') {
            console.error('marked.js not loaded');
            return '<p>Error: Markdown parser not loaded</p>';
        }

        try {
            return marked.parse(markdown);
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return `<p>Error parsing markdown: ${error.message}</p>`;
        }
    }

    parseInline(markdown) {
        if (typeof marked === 'undefined') {
            return markdown;
        }

        try {
            return marked.parseInline(markdown);
        } catch (error) {
            console.error('Inline markdown parsing error:', error);
            return markdown;
        }
    }
}
