/**
 * Plain-text matching for the find bar.
 * The query is always escaped, so typing can never produce a slow or hanging pattern.
 */

// Painting more ranges than this makes every keystroke noticeably slow.
export const MAX_MATCHES = 5000;

/**
 * Escape special regex characters
 */
export function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Limit a pattern to whole words. \b only knows ASCII, so it fails on Cyrillic and
 * other alphabets; this form needs the regex "u" flag.
 */
export function wholeWordPattern(pattern) {
    return `(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`;
}

/**
 * Build the regex for a query.
 * flexibleSpaces lets a space match any whitespace run: rendered text keeps the line
 * breaks of the source, while the reader sees them as plain spaces.
 */
export function buildSearchRegex(query, { caseSensitive = false, wholeWord = false, flexibleSpaces = false } = {}) {
    let pattern = flexibleSpaces
        ? query.split(/\s+/).map(escapeRegex).join('\\s+')
        : escapeRegex(query);

    if (wholeWord) {
        pattern = wholeWordPattern(pattern);
    }

    return new RegExp(pattern, caseSensitive ? 'gu' : 'giu');
}

/**
 * Find all matches of a query. Returns { matches: [{ start, end }], truncated }.
 */
export function findAll(text, query, options = {}) {
    const matches = [];
    if (!query) {
        return { matches, truncated: false };
    }

    for (const match of text.matchAll(buildSearchRegex(query, options))) {
        if (matches.length === MAX_MATCHES) {
            return { matches, truncated: true };
        }
        matches.push({ start: match.index, end: match.index + match[0].length });
    }

    return { matches, truncated: false };
}

/**
 * Index of the first match starting at or after offset. Wraps to the first match.
 */
export function firstMatchAtOrAfter(matches, offset) {
    let low = 0;
    let high = matches.length;

    while (low < high) {
        const middle = (low + high) >> 1;
        if (matches[middle].start < offset) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }

    return low < matches.length ? low : 0;
}
