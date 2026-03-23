/**
 * Unit tests for markdown parser heading ID generation and anchor navigation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MarkdownParser — Heading IDs', () => {
    let parser;

    beforeEach(async () => {
        // Helper: build token tree from raw markdown text (simulates marked's lexer)
        function buildTokens(raw) {
            const linkMatch = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return [{ raw, text: linkMatch[1], tokens: [{ raw: linkMatch[1], text: linkMatch[1] }] }];
            }
            const boldMatch = raw.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/);
            if (boldMatch) {
                const result = [];
                if (boldMatch[1]) result.push({ raw: boldMatch[1], text: boldMatch[1] });
                result.push({ raw: `**${boldMatch[2]}**`, text: boldMatch[2], tokens: [{ raw: boldMatch[2], text: boldMatch[2] }] });
                if (boldMatch[3]) result.push({ raw: boldMatch[3], text: boldMatch[3] });
                return result;
            }
            const codeMatch = raw.match(/^(.*?)`([^`]+)`(.*)$/);
            if (codeMatch) {
                const result = [];
                if (codeMatch[1]) result.push({ raw: codeMatch[1], text: codeMatch[1] });
                result.push({ raw: `\`${codeMatch[2]}\``, text: codeMatch[2] });
                if (codeMatch[3]) result.push({ raw: codeMatch[3], text: codeMatch[3] });
                return result;
            }
            return [{ raw, text: raw }];
        }

        // Helper: render tokens to HTML with entity escaping
        function renderTokens(tokens) {
            return tokens.map(t => {
                let text = t.text || t.raw || '';
                text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                if (t.tokens) {
                    const inner = renderTokens(t.tokens);
                    if (t.raw.startsWith('[')) return `<a href="...">${inner}</a>`;
                    if (t.raw.startsWith('**')) return `<strong>${inner}</strong>`;
                    return inner;
                }
                if (t.raw.startsWith('`')) return `<code>${text}</code>`;
                return text;
            }).join('');
        }

        // Helper: extract plain text from tokens (no HTML, no entities)
        function extractPlainText(tokens) {
            return tokens.map(t => {
                if (t.tokens) return extractPlainText(t.tokens);
                return t.text || t.raw || '';
            }).join('');
        }

        // Mock Marked constructor — mimics v11 behavior where parser
        // pre-renders inline tokens before calling renderer.heading(text, level, raw)
        class MockMarked {
            constructor() {
                this._renderers = {};
            }
            use({ renderer }) {
                if (renderer) Object.assign(this._renderers, renderer);
            }
            parse(md) {
                const lines = md.split('\n');
                let html = '';
                for (const line of lines) {
                    const match = line.match(/^(#{1,6})\s+(.+)$/);
                    if (match) {
                        const depth = match[1].length;
                        const tokens = buildTokens(match[2]);
                        const renderedHtml = renderTokens(tokens);
                        const raw = extractPlainText(tokens);
                        if (this._renderers.heading) {
                            html += this._renderers.heading(renderedHtml, depth, raw);
                        }
                    } else if (line.trim()) {
                        html += `<p>${line}</p>\n`;
                    }
                }
                return html;
            }
            parseInline(md) { return md; }
        }

        globalThis.marked = { Marked: MockMarked };

        const mod = await import('../../../markdown/parser.js');
        parser = new mod.MarkdownParser();
    });

    it('should generate a slug id for a simple heading', () => {
        const html = parser.parse('# Hello World');
        expect(html).toContain('id="hello-world"');
        expect(html).toContain('<h1');
    });

    it('should handle headings with special characters', () => {
        const html = parser.parse('## Vision & Goals');
        expect(html).toContain('id="vision--goals"');
    });

    it('should handle numbered headings with periods', () => {
        const html = parser.parse('## 1. Vision & Goals');
        expect(html).toContain('id="1-vision--goals"');
    });

    it('should generate unique ids for duplicate headings', () => {
        const md = '## Setup\n## Setup\n## Setup';
        const html = parser.parse(md);

        expect(html).toContain('id="setup"');
        expect(html).toContain('id="setup-1"');
        expect(html).toContain('id="setup-2"');
    });

    it('should reset slug counts between parse calls', () => {
        parser.parse('## Setup');
        const html = parser.parse('## Setup');
        // Second parse should start fresh — no suffix
        expect(html).toContain('id="setup"');
        expect(html).not.toContain('id="setup-1"');
    });

    it('should handle headings at all levels', () => {
        const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
        const html = parser.parse(md);

        expect(html).toContain('<h1 id="h1">');
        expect(html).toContain('<h2 id="h2">');
        expect(html).toContain('<h3 id="h3">');
        expect(html).toContain('<h4 id="h4">');
        expect(html).toContain('<h5 id="h5">');
        expect(html).toContain('<h6 id="h6">');
    });

    it('should handle headings with colons', () => {
        const html = parser.parse('## Appendix: Prior Art');
        expect(html).toContain('id="appendix-prior-art"');
    });

    it('should use visible text for headings containing links', () => {
        const html = parser.parse('## [API](https://example.com)');
        expect(html).toContain('id="api"');
        // Should NOT include the URL in the slug
        expect(html).not.toContain('example');
    });

    it('should use visible text for headings with emphasis', () => {
        const html = parser.parse('## **Bold** text');
        expect(html).toContain('id="bold-text"');
    });

    it('should use visible text for headings with inline code', () => {
        const html = parser.parse('## The `config` module');
        expect(html).toContain('id="the-config-module"');
    });

    it('should fallback to "heading" for punctuation-only headings', () => {
        const html = parser.parse('## !!!');
        expect(html).toContain('id="heading"');
    });

    it('should deduplicate fallback headings', () => {
        const md = '## !!!\n## ???\n## ...';
        const html = parser.parse(md);
        expect(html).toContain('id="heading"');
        expect(html).toContain('id="heading-1"');
        expect(html).toContain('id="heading-2"');
    });

    it('should not produce entity artifacts in slugs (R&D)', () => {
        const html = parser.parse('## R&D');
        // Slug should be based on plain text "R&D", not "R&amp;D"
        expect(html).toContain('id="rd"');
        expect(html).not.toContain('id="rampd"');
    });

    it('should handle angle brackets in headings', () => {
        const html = parser.parse('## A < B');
        expect(html).toContain('id="a--b"');
        expect(html).not.toContain('id="a-lt-b"');
    });

    it('should safely handle prototype key headings', () => {
        const md = '## constructor\n## constructor\n## __proto__';
        const html = parser.parse(md);
        expect(html).toContain('id="constructor"');
        expect(html).toContain('id="constructor-1"');
        expect(html).toContain('id="__proto__"');
    });

    it('should isolate slug state between parser instances', async () => {
        const mod = await import('../../../markdown/parser.js');
        const parser1 = new mod.MarkdownParser();
        const parser2 = new mod.MarkdownParser();

        // Parse with instance 1 to populate its slug state
        parser1.parse('## Test\n## Test');

        // Instance 2 should start fresh — no cross-contamination
        const html2 = parser2.parse('## Test');
        expect(html2).toContain('id="test"');
        expect(html2).not.toContain('id="test-1"');
    });
});

describe('Anchor link click handling', () => {
    it('should prevent default and scroll to target on anchor click', () => {
        // Set up DOM
        document.body.innerHTML = `
            <div id="preview-pane">
                <div id="preview">
                    <a href="#section-1">Go to section</a>
                    <h2 id="section-1">Section 1</h2>
                </div>
            </div>
        `;

        const previewEl = document.getElementById('preview');
        const target = document.getElementById('section-1');
        target.scrollIntoView = vi.fn();

        // Attach the same handler the app uses
        previewEl.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;
            e.preventDefault();
            const targetId = decodeURIComponent(link.getAttribute('href').slice(1));
            const el = previewEl.querySelector(`[id="${CSS.escape(targetId)}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        // Simulate click
        const link = previewEl.querySelector('a');
        const event = new Event('click', { bubbles: true });
        link.dispatchEvent(event);

        expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('should not crash on malformed hash values', () => {
        document.body.innerHTML = `
            <div id="preview">
                <a href="#">Empty hash</a>
                <a href="#%E2%9C%93">Encoded checkmark</a>
                <a href="#%">Malformed percent</a>
                <a href="#%E0%A4%A">Truncated encoding</a>
            </div>
        `;

        const previewEl = document.getElementById('preview');

        previewEl.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;
            e.preventDefault();
            let targetId;
            try {
                targetId = decodeURIComponent(link.getAttribute('href').slice(1));
            } catch {
                return;
            }
            if (targetId) {
                const el = previewEl.querySelector(`[id="${CSS.escape(targetId)}"]`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        // None should throw — including malformed percent-encoded hashes
        const links = previewEl.querySelectorAll('a');
        links.forEach(link => {
            expect(() => {
                link.dispatchEvent(new Event('click', { bubbles: true }));
            }).not.toThrow();
        });
    });

    it('should ignore clicks on non-anchor links', () => {
        document.body.innerHTML = `
            <div id="preview">
                <a href="https://example.com">External link</a>
                <h2 id="test">Test</h2>
            </div>
        `;

        const previewEl = document.getElementById('preview');
        const target = document.getElementById('test');
        target.scrollIntoView = vi.fn();

        previewEl.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;
            e.preventDefault();
            const targetId = decodeURIComponent(link.getAttribute('href').slice(1));
            const el = previewEl.querySelector(`[id="${CSS.escape(targetId)}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        const externalLink = previewEl.querySelector('a');
        externalLink.dispatchEvent(new Event('click', { bubbles: true }));

        expect(target.scrollIntoView).not.toHaveBeenCalled();
    });
});

describe('MarkdownParser — Initialization failure paths', () => {
    it('should degrade gracefully when marked exists but marked.Marked is missing', async () => {
        const prev = globalThis.marked;
        try {
            globalThis.marked = { parse: () => '' };

            const mod = await import('../../../markdown/parser.js');
            const parser = new mod.MarkdownParser();
            const result = parser.parse('# Hello');

            expect(result).toContain('Error');
            expect(result).toContain('Markdown parser not loaded');
        } finally {
            globalThis.marked = prev;
        }
    });

    it('should return error HTML when marked is entirely undefined', async () => {
        const prev = globalThis.marked;
        try {
            delete globalThis.marked;

            const mod = await import('../../../markdown/parser.js');
            const parser = new mod.MarkdownParser();
            const result = parser.parse('# Hello');

            expect(result).toContain('Error');
            expect(result).toContain('Markdown parser not loaded');
        } finally {
            globalThis.marked = prev;
        }
    });
});
