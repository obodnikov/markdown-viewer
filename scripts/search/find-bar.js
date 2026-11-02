/**
 * Find bar: search in the open document without leaving it
 */

import { findAll, firstMatchAtOrAfter } from './text-search.js';
import { buildTextMap, createRangeFromMap, HighlightPainter, scrollRangeIntoView } from './highlight.js';

const SEARCH_DELAY_MS = 120;

/**
 * Ctrl/Cmd+F. On a non-Latin keyboard layout e.key is the local letter ("а"),
 * so the physical key is used in that case.
 */
function isFindShortcut(e) {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return false;

    const key = e.key.toLowerCase();
    return key === 'f' || (e.code === 'KeyF' && !/^[a-z]$/.test(key));
}

function isDialogOpen() {
    return document.querySelector('dialog[open]') !== null;
}

export class FindBar {
    constructor({ editor, previewElement, previewPane, splitPane, onOpenReplace }) {
        this.editor = editor;
        this.previewElement = previewElement;
        this.previewPane = previewPane;
        this.splitPane = splitPane;
        this.onOpenReplace = onOpenReplace;

        this.root = document.getElementById('find-bar');
        this.input = document.getElementById('find-input');
        this.countEl = document.getElementById('find-count');
        this.prevBtn = document.getElementById('find-prev');
        this.nextBtn = document.getElementById('find-next');
        this.caseBtn = document.getElementById('find-case');
        this.wordBtn = document.getElementById('find-word');

        this.painter = new HighlightPainter();
        this.options = { caseSensitive: false, wholeWord: false };

        this.isOpen = false;
        this.matches = [];          // { start, end, range } in the leading pane
        this.truncated = false;
        this.currentIndex = -1;
        this.anchor = 0;            // offset the search starts from
        this.leadingPane = null;    // 'editor' or 'preview'
        this.timer = null;
        this.pendingReveal = false;
        this.returnFocusTo = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleDocumentKeydown(e));

        this.input.addEventListener('input', () => this.schedule({ reveal: true }));
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault();
                this.move(e.shiftKey ? -1 : 1);
            }
        });

        // Keep typing focus in the input when a button is clicked with the mouse
        this.root.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) {
                e.preventDefault();
            }
        });

        this.prevBtn.addEventListener('click', () => this.move(-1));
        this.nextBtn.addEventListener('click', () => this.move(1));
        this.caseBtn.addEventListener('click', () => this.toggleOption('caseSensitive', this.caseBtn));
        this.wordBtn.addEventListener('click', () => this.toggleOption('wholeWord', this.wordBtn));

        document.getElementById('find-close').addEventListener('click', () => this.close());
        document.getElementById('btn-find').addEventListener('click', () => this.open());
        document.getElementById('find-open-replace').addEventListener('click', () => {
            this.onOpenReplace({
                text: this.input.value,
                caseSensitive: this.options.caseSensitive,
                wholeWord: this.options.wholeWord
            });
        });
    }

    handleDocumentKeydown(e) {
        if (isFindShortcut(e)) {
            // Dialogs cover the bar, so the browser's own search stays available there
            if (!isDialogOpen()) {
                e.preventDefault();
                this.open();
            }
            return;
        }

        if (!this.isOpen || isDialogOpen()) return;

        if (e.key === 'F3') {
            e.preventDefault();
            this.move(e.shiftKey ? -1 : 1);
        } else if (e.key === 'Escape' && !this.isOtherInput(e.target)) {
            e.preventDefault();
            this.close();
        }
    }

    /**
     * Esc in fields such as the document title belongs to those fields
     */
    isOtherInput(target) {
        return Boolean(target.closest?.('input, select')) && !this.root.contains(target);
    }

    open() {
        if (isDialogOpen()) return;

        const selected = this.getSelectedText();

        if (!this.isOpen) {
            this.isOpen = true;
            this.returnFocusTo = document.activeElement;
            this.root.hidden = false;
            this.leadingPane = null;
        } else if (this.editor.hasFocus()) {
            this.anchor = this.editor.getCursorOffset();
        }

        if (selected) {
            this.input.value = selected;
        }

        this.input.focus();
        this.input.select();
        this.runSearch({ reveal: true });
    }

    close() {
        if (!this.isOpen) return;

        if (this.timer) {
            this.runSearch();
        }

        const match = this.matches[this.currentIndex];
        const focusInBar = this.root.contains(document.activeElement);

        this.isOpen = false;
        this.root.hidden = true;
        this.painter.clear();
        this.editor.getTextMirror()?.disable();

        if (focusInBar) {
            if (match && this.leadingPane === 'editor') {
                this.editor.selectRange(match.start, match.end);
            } else if (this.returnFocusTo?.isConnected) {
                this.returnFocusTo.focus();
            }
        }

        this.matches = [];
        this.currentIndex = -1;
        this.returnFocusTo = null;
    }

    /**
     * Call when the document text or the view mode changed. Does not move the view,
     * so editing with the bar open never scrolls away from the cursor.
     */
    refresh() {
        if (!this.isOpen) return;

        const current = this.matches[this.currentIndex];
        if (current) {
            this.anchor = current.start;
        }
        this.schedule();
    }

    schedule({ reveal = false } = {}) {
        this.pendingReveal = this.pendingReveal || reveal;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.runSearch(), SEARCH_DELAY_MS);
    }

    runSearch({ reveal = false } = {}) {
        reveal = reveal || this.pendingReveal;
        clearTimeout(this.timer);
        this.timer = null;
        this.pendingReveal = false;

        const view = this.splitPane.dataset.view || 'split';
        const showEditor = view !== 'preview';
        const showPreview = view !== 'edit';
        const leadingPane = showEditor ? 'editor' : 'preview';

        // Offsets of one pane mean nothing in the other
        if (leadingPane !== this.leadingPane) {
            this.leadingPane = leadingPane;
            this.anchor = showEditor ? this.editor.getCursorOffset() : 0;
            reveal = true;
        }

        const query = this.input.value;
        const editorResult = showEditor ? this.searchEditor(query) : { matches: [], truncated: false };
        const previewResult = showPreview ? this.searchPreview(query) : { matches: [], truncated: false };
        const leading = showEditor ? editorResult : previewResult;

        this.matches = leading.matches;
        this.truncated = leading.truncated;
        this.currentIndex = this.matches.length ? firstMatchAtOrAfter(this.matches, this.anchor) : -1;

        this.painter.setMatches(
            [...editorResult.matches, ...previewResult.matches].map((match) => match.range).filter(Boolean)
        );
        this.showCurrent(reveal);
    }

    searchEditor(query) {
        const content = this.editor.getContent();
        const mirror = this.editor.getTextMirror();

        mirror?.enable();
        mirror?.update(content);

        const { matches, truncated } = findAll(content, query, this.options);
        return {
            truncated,
            matches: matches.map((match) => ({ ...match, range: mirror?.createRange(match.start, match.end) }))
        };
    }

    searchPreview(query) {
        if (!query) {
            return { matches: [], truncated: false };
        }

        const map = buildTextMap(this.previewElement);
        const { matches, truncated } = findAll(map.text, query, { ...this.options, flexibleSpaces: true });
        return {
            truncated,
            matches: matches
                .map((match) => ({ ...match, range: createRangeFromMap(map, match.start, match.end) }))
                .filter((match) => match.range)
        };
    }

    move(step) {
        // A query typed a moment ago has not run yet: its first match is the next one
        if (this.timer) {
            this.runSearch({ reveal: true });
            return;
        }

        const total = this.matches.length;
        if (!total) return;

        this.currentIndex = (this.currentIndex + step + total) % total;
        this.anchor = this.matches[this.currentIndex].start;
        this.showCurrent(true);
    }

    showCurrent(reveal) {
        const match = this.matches[this.currentIndex];

        this.painter.setCurrent(match?.range ?? null);
        this.updateStatus();

        if (reveal && match?.range) {
            if (this.leadingPane === 'editor') {
                this.editor.getTextMirror()?.scrollToRange(match.range);
            } else {
                scrollRangeIntoView(this.previewPane, match.range);
            }
        }
    }

    updateStatus() {
        const total = this.matches.length;
        const hasQuery = this.input.value !== '';

        if (total) {
            this.countEl.textContent = `${this.currentIndex + 1} of ${total}${this.truncated ? '+' : ''}`;
        } else {
            this.countEl.textContent = hasQuery ? 'No results' : '';
        }

        this.input.classList.toggle('is-invalid', hasQuery && !total);
        this.prevBtn.disabled = !total;
        this.nextBtn.disabled = !total;
    }

    toggleOption(name, button) {
        this.options[name] = !this.options[name];
        button.setAttribute('aria-pressed', String(this.options[name]));
        button.classList.toggle('is-active', this.options[name]);
        this.runSearch({ reveal: true });
    }

    /**
     * Single-line text selected in the editor or preview, used as the starting query
     */
    getSelectedText() {
        if (this.root.contains(document.activeElement)) return '';

        let text = '';
        if (this.editor.hasFocus()) {
            text = this.editor.getSelectedText();
        } else {
            const selection = window.getSelection();
            if (selection && this.previewElement.contains(selection.anchorNode)) {
                text = selection.toString().trim();
            }
        }

        return text.includes('\n') ? '' : text;
    }
}
