/**
 * Invisible copy of the textarea text, placed right behind it.
 * A textarea can neither highlight part of its text nor report where a wrapped line
 * sits, so both are done on this copy. It exists only while the find bar is open.
 */

const COPIED_STYLES = [
    'fontFamily',
    'fontSize',
    'fontStyle',
    'fontWeight',
    'letterSpacing',
    'lineHeight',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'tabSize',
    'textIndent',
    'textTransform',
    'wordSpacing'
];

export class TextMirror {
    constructor(textarea) {
        this.textarea = textarea;
        this.container = textarea.parentElement;
        this.root = null;
        this.content = null;
        this.textNode = null;
        this.resizeObserver = null;

        this.syncScroll = this.syncScroll.bind(this);
        this.syncLayout = this.syncLayout.bind(this);
    }

    enable() {
        if (this.root) return;

        this.root = document.createElement('div');
        this.root.className = 'text-mirror';
        this.root.setAttribute('aria-hidden', 'true');

        this.content = document.createElement('div');
        this.content.className = 'text-mirror__content';

        this.textNode = document.createTextNode('');
        this.content.appendChild(this.textNode);
        this.root.appendChild(this.content);

        this.container.classList.add('is-searching');
        this.container.insertBefore(this.root, this.textarea);

        this.textarea.addEventListener('scroll', this.syncScroll, { passive: true });
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(this.syncLayout);
            this.resizeObserver.observe(this.textarea);
        }

        this.syncLayout();
    }

    disable() {
        if (!this.root) return;

        this.textarea.removeEventListener('scroll', this.syncScroll);
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;

        this.container.classList.remove('is-searching');
        this.root.remove();
        this.root = null;
        this.content = null;
        this.textNode = null;
    }

    update(text) {
        if (!this.root) return;

        if (this.textNode.data !== text) {
            this.textNode.data = text;
        }
        // New text can bring in a scrollbar, which narrows the wrapping width
        this.syncLayout();
    }

    createRange(start, end) {
        if (!this.root) return null;

        const range = document.createRange();
        range.setStart(this.textNode, start);
        range.setEnd(this.textNode, end);
        return range;
    }

    /**
     * Scroll the textarea so the range is visible. Does nothing if it is already on screen.
     */
    scrollToRange(range) {
        const rect = range.getBoundingClientRect();
        const top = rect.top - this.content.getBoundingClientRect().top;
        const { scrollTop, clientHeight } = this.textarea;

        if (top < scrollTop || top + rect.height > scrollTop + clientHeight) {
            this.textarea.scrollTop = top - (clientHeight - rect.height) / 2;
        }
    }

    syncLayout() {
        if (!this.root) return;

        const style = getComputedStyle(this.textarea);
        COPIED_STYLES.forEach((name) => {
            this.content.style[name] = style[name];
        });

        // clientWidth is rounded; a fraction of a pixel is enough to wrap a line differently
        const scrollbarWidth = this.textarea.offsetWidth - this.textarea.clientWidth;
        this.content.style.width = `${this.textarea.getBoundingClientRect().width - scrollbarWidth}px`;

        this.syncScroll();
    }

    syncScroll() {
        if (!this.root) return;

        this.content.style.transform = `translate(${-this.textarea.scrollLeft}px, ${-this.textarea.scrollTop}px)`;
    }
}
