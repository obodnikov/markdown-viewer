import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildTextMap, createRangeFromMap, HighlightPainter } from '../../../search/highlight.js';
import { findAll } from '../../../search/text-search.js';

function renderHtml(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

function rangeText(range) {
  return range.toString();
}

describe('buildTextMap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('joins inline markup into one string', () => {
    const { text } = buildTextMap(renderHtml('<p>foo <strong>bar</strong> baz</p>'));
    expect(text).toBe('foo bar baz');
  });

  it('keeps blocks apart so a phrase cannot match across them', () => {
    const map = buildTextMap(renderHtml('<p>foo</p><p>bar</p>'));
    expect(findAll(map.text, 'foobar').matches).toHaveLength(0);
    expect(findAll(map.text, 'foo bar', { flexibleSpaces: true }).matches).toHaveLength(0);
  });

  it('keeps table cells apart', () => {
    const map = buildTextMap(renderHtml('<table><tr><td>foo</td><td>bar</td></tr></table>'));
    expect(findAll(map.text, 'foobar').matches).toHaveLength(0);
  });

  it('treats <br> as a space', () => {
    const map = buildTextMap(renderHtml('<p>foo<br>bar</p>'));
    expect(findAll(map.text, 'foobar').matches).toHaveLength(0);
    expect(findAll(map.text, 'foo bar', { flexibleSpaces: true }).matches).toHaveLength(1);
  });

  it('skips text that is never shown', () => {
    const { text } = buildTextMap(renderHtml('<p>shown</p><style>.hidden {}</style><script>var hidden;</script>'));
    expect(text).not.toContain('hidden');
  });

  it('finds a soft-wrapped phrase with flexible spaces', () => {
    const map = buildTextMap(renderHtml('<p>foo\nbar</p>'));
    expect(findAll(map.text, 'foo bar', { flexibleSpaces: true }).matches).toHaveLength(1);
  });
});

describe('createRangeFromMap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('maps a match inside one text node', () => {
    const map = buildTextMap(renderHtml('<p>hello world</p>'));
    const [match] = findAll(map.text, 'world').matches;
    expect(rangeText(createRangeFromMap(map, match.start, match.end))).toBe('world');
  });

  it('maps a match that spans inline elements', () => {
    const map = buildTextMap(renderHtml('<p>foo <strong>bar</strong> baz</p>'));
    const [match] = findAll(map.text, 'foo bar b').matches;
    expect(rangeText(createRangeFromMap(map, match.start, match.end))).toBe('foo bar b');
  });

  it('maps matches in later blocks despite the break characters', () => {
    const map = buildTextMap(renderHtml('<h1>one</h1><p>two</p><ul><li>three</li></ul>'));
    const [match] = findAll(map.text, 'three').matches;
    expect(rangeText(createRangeFromMap(map, match.start, match.end))).toBe('three');
  });

  it('returns null when the match has no text node', () => {
    const map = buildTextMap(renderHtml('<p>foo<br>bar</p>'));
    expect(createRangeFromMap(map, 3, 4)).toBeNull();
  });

  it('returns null when nothing was mapped', () => {
    expect(createRangeFromMap({ text: '', segments: [] }, 0, 1)).toBeNull();
  });
});

describe('HighlightPainter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing in a browser without highlight support', () => {
    vi.stubGlobal('CSS', {});
    const painter = new HighlightPainter();
    expect(painter.supported).toBe(false);
    expect(() => {
      painter.setMatches([{}]);
      painter.setCurrent({});
      painter.clear();
    }).not.toThrow();
  });

  it('registers matches and raises the current match above them', () => {
    const registry = new Map();
    class FakeHighlight {
      constructor(...ranges) {
        this.ranges = ranges;
        this.priority = 0;
      }
      add(range) {
        this.ranges.push(range);
      }
    }
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', FakeHighlight);

    const painter = new HighlightPainter();
    painter.setMatches(['a', 'b']);
    painter.setCurrent('b');

    expect(registry.get('find-match').ranges).toEqual(['a', 'b']);
    expect(registry.get('find-current').ranges).toEqual(['b']);
    expect(registry.get('find-current').priority).toBe(1);

    painter.clear();
    expect(registry.size).toBe(0);
  });
});
