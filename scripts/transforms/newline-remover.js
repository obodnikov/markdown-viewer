/**
 * Client-side newline removal logic
 * Smart removal that preserves markdown structure
 */

export class NewlineRemover {
    remove(markdown, mode = 'smart') {
        switch (mode) {
            case 'smart':
                return this.smartRemove(markdown);
            case 'paragraph':
                return this.paragraphOnly(markdown);
            case 'aggressive':
                return this.aggressiveRemove(markdown);
            default:
                return markdown;
        }
    }

    smartRemove(markdown) {
        const lines = markdown.split('\n');
        const result = [];
        let inCodeBlock = false;
        let inList = false;
        let inTable = false;
        let currentParagraph = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Detect code blocks
            if (trimmed.startsWith('```')) {
                this.flushParagraph(currentParagraph, result);
                inCodeBlock = !inCodeBlock;
                result.push(line);
                continue;
            }

            // Inside code block, preserve everything
            if (inCodeBlock) {
                result.push(line);
                continue;
            }

            // Detect lists
            const isListItem = /^[\s]*[-*+]\s/.test(line) || /^[\s]*\d+\.\s/.test(line);
            if (isListItem) {
                this.flushParagraph(currentParagraph, result);
                result.push(line);
                inList = true;
                continue;
            }

            // Detect tables
            if (trimmed.startsWith('|')) {
                this.flushParagraph(currentParagraph, result);
                result.push(line);
                inTable = true;
                continue;
            }

            // Detect headers
            if (trimmed.startsWith('#')) {
                this.flushParagraph(currentParagraph, result);
                result.push(line);
                continue;
            }

            // Detect blockquotes
            if (trimmed.startsWith('>')) {
                this.flushParagraph(currentParagraph, result);
                result.push(line);
                continue;
            }

            // Detect horizontal rules
            if (/^[\s]*[-*_]{3,}[\s]*$/.test(line)) {
                this.flushParagraph(currentParagraph, result);
                result.push(line);
                continue;
            }

            // Empty line - paragraph break
            if (trimmed === '') {
                this.flushParagraph(currentParagraph, result);
                result.push('');
                inList = false;
                inTable = false;
                continue;
            }

            // Regular paragraph text
            if (!inList && !inTable) {
                currentParagraph.push(trimmed);
            } else {
                result.push(line);
            }
        }

        // Flush remaining paragraph
        this.flushParagraph(currentParagraph, result);

        return result.join('\n');
    }

    flushParagraph(paragraph, result) {
        if (paragraph.length > 0) {
            result.push(paragraph.join(' '));
            paragraph.length = 0;
        }
    }

    paragraphOnly(markdown) {
        // Only join lines within clear paragraph blocks
        const blocks = markdown.split(/\n\n+/);

        const processed = blocks.map(block => {
            const trimmed = block.trim();

            // Skip special blocks
            if (trimmed.startsWith('```') ||
                trimmed.startsWith('#') ||
                trimmed.startsWith('>') ||
                trimmed.startsWith('|') ||
                /^[\s]*[-*+]\s/.test(trimmed) ||
                /^[\s]*\d+\.\s/.test(trimmed)) {
                return block;
            }

            // Join paragraph lines
            return block.split('\n').map(l => l.trim()).join(' ');
        });

        return processed.join('\n\n');
    }

    aggressiveRemove(markdown) {
        // Remove all newlines except in code blocks
        const lines = markdown.split('\n');
        const result = [];
        let inCodeBlock = false;

        for (const line of lines) {
            if (line.trim().startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                result.push(line);
            } else if (inCodeBlock) {
                result.push(line);
            } else {
                result.push(line.trim());
            }
        }

        return result.join(' ').replace(/\s+/g, ' ').trim();
    }
}
