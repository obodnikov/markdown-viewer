/**
 * Mapping and painting of find matches in rendered text.
 * Highlights are painted by the browser without changing the page markup, so headings,
 * anchors and scroll sync are not affected.
 */

const BLOCK_SELECTOR = 'p,div,h1,h2,h3,h4,h5,h6,li,ul,ol,pre,blockquote,table,thead,tbody,tr,td,th,dl,dt,dd,section,article,details,summary,figure,figcaption';
const SKIPPED_SELECTOR = 'script,style,noscript,template';

// Not whitespace and never typed in a query, so a match cannot cross into another block.
const BLOCK_BREAK = '\u0000';

const MATCH_HIGHLIGHT = 'find-match';
const CURRENT_HIGHLIGHT = 'find-current';

/**
 * Join the text of an element into one string and remember where each text node sits,
 * so a phrase split by inline markup ("foo <strong>bar</strong>") can still be found.
 */
export function buildTextMap(root) {
    const segments = [];
    let text = '';
    let lastBlock = null;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'BR') {
                text += ' ';
            }
            continue;
        }

        const parent = node.parentElement;
        if (!node.data || parent.closest(SKIPPED_SELECTOR)) {
            continue;
        }

        const block = parent.closest(BLOCK_SELECTOR);
        if (lastBlock && block !== lastBlock) {
            text += BLOCK_BREAK;
        }
        lastBlock = block;

        segments.push({ node, start: text.length, end: text.length + node.data.length });
        text += node.data;
    }

    return { text, segments };
}

/**
 * Index of the first segment for which isAfter(segment) is true
 */
function firstSegmentWhere(segments, isAfter) {
    let low = 0;
    let high = segments.length;

    while (low < high) {
        const middle = (low + high) >> 1;
        if (isAfter(segments[middle])) {
            high = middle;
        } else {
            low = middle + 1;
        }
    }

    return low;
}

/**
 * Turn offsets in the joined text into a DOM Range.
 * Returns null when the match has no text node, such as a space standing for <br>.
 */
export function createRangeFromMap({ segments }, start, end) {
    const firstIndex = firstSegmentWhere(segments, (segment) => segment.end > start);
    const lastIndex = firstSegmentWhere(segments, (segment) => segment.start >= end) - 1;

    if (firstIndex >= segments.length || lastIndex < firstIndex) {
        return null;
    }

    const first = segments[firstIndex];
    const last = segments[lastIndex];

    const range = document.createRange();
    range.setStart(first.node, Math.max(start - first.start, 0));
    range.setEnd(last.node, Math.min(end - last.start, last.node.data.length));
    return range;
}

/**
 * Scroll a pane so the range is visible. Does nothing if it is already on screen.
 */
export function scrollRangeIntoView(pane, range) {
    const rect = range.getBoundingClientRect();
    const paneRect = pane.getBoundingClientRect();

    if (rect.top < paneRect.top || rect.bottom > paneRect.bottom) {
        pane.scrollTop += rect.top - paneRect.top - (pane.clientHeight - rect.height) / 2;
    }

    // Wide code blocks and tables scroll sideways inside the pane
    for (let el = range.startContainer.parentElement; el && el !== pane; el = el.parentElement) {
        if (el.scrollWidth > el.clientWidth) {
            const box = el.getBoundingClientRect();
            if (rect.left < box.left || rect.right > box.right) {
                el.scrollLeft += rect.left - box.left - (el.clientWidth - rect.width) / 2;
            }
        }
    }
}

export class HighlightPainter {
    constructor() {
        // Older browsers still get the counter and jumping between matches
        this.supported = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
    }

    setMatches(ranges) {
        if (!this.supported) return;

        const highlight = new Highlight();
        ranges.forEach((range) => highlight.add(range));
        CSS.highlights.set(MATCH_HIGHLIGHT, highlight);
    }

    setCurrent(range) {
        if (!this.supported) return;

        const highlight = range ? new Highlight(range) : new Highlight();
        highlight.priority = 1;
        CSS.highlights.set(CURRENT_HIGHLIGHT, highlight);
    }

    clear() {
        if (!this.supported) return;

        CSS.highlights.delete(MATCH_HIGHLIGHT);
        CSS.highlights.delete(CURRENT_HIGHLIGHT);
    }
}
