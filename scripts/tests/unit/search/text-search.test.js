import { describe, it, expect } from 'vitest';
import {
  MAX_MATCHES,
  buildSearchRegex,
  escapeRegex,
  findAll,
  firstMatchAtOrAfter,
  wholeWordPattern
} from '../../../search/text-search.js';

describe('escapeRegex', () => {
  it('escapes every special character', () => {
    expect(escapeRegex('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o')).toBe(
      'a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o'
    );
  });

  it('produces a pattern valid in unicode mode', () => {
    expect(() => new RegExp(escapeRegex('[a-b] {x} / # - "q"'), 'u')).not.toThrow();
  });
});

describe('wholeWordPattern', () => {
  const count = (word, text) => (text.match(new RegExp(wholeWordPattern(word), 'gu')) || []).length;

  it('matches Latin whole words', () => {
    expect(count('cat', 'cat catalog concat cat.')).toBe(2);
  });

  it('matches Cyrillic whole words', () => {
    expect(count('кот', 'кот котлета скот кот,')).toBe(2);
  });

  it('treats digits and underscores as word characters', () => {
    expect(count('cat', 'cat1 cat_ _cat 1cat')).toBe(0);
  });
});

describe('findAll', () => {
  it('returns start and end offsets', () => {
    expect(findAll('foo bar foo', 'foo').matches).toEqual([
      { start: 0, end: 3 },
      { start: 8, end: 11 }
    ]);
  });

  it('returns nothing for an empty query', () => {
    expect(findAll('foo', '')).toEqual({ matches: [], truncated: false });
  });

  it('ignores case by default, including Cyrillic', () => {
    expect(findAll('Foo FOO foo', 'foo').matches).toHaveLength(3);
    expect(findAll('Кот КОТ кот Ёж ёж', 'кот').matches).toHaveLength(3);
    expect(findAll('Ёж ёж', 'ёж').matches).toHaveLength(2);
  });

  it('respects caseSensitive', () => {
    expect(findAll('Foo FOO foo', 'foo', { caseSensitive: true }).matches).toHaveLength(1);
  });

  it('respects wholeWord', () => {
    expect(findAll('кот котлета', 'кот', { wholeWord: true }).matches).toHaveLength(1);
  });

  it('treats regex characters in the query as plain text', () => {
    expect(findAll('a.c abc a*c', 'a.c').matches).toEqual([{ start: 0, end: 3 }]);
    expect(findAll('x (y) [z]', '(y)').matches).toEqual([{ start: 2, end: 5 }]);
    expect(findAll('abc', 'x*').matches).toEqual([]);
  });

  it('does not let a space match a line break unless flexibleSpaces is set', () => {
    expect(findAll('foo\nbar', 'foo bar').matches).toHaveLength(0);
    expect(findAll('foo\nbar', 'foo bar', { flexibleSpaces: true }).matches).toEqual([{ start: 0, end: 7 }]);
    expect(findAll('foo   bar', 'foo bar', { flexibleSpaces: true }).matches).toHaveLength(1);
  });

  it('keeps flexibleSpaces and wholeWord working together', () => {
    const options = { flexibleSpaces: true, wholeWord: true };
    expect(findAll('foo bar', 'foo bar', options).matches).toHaveLength(1);
    expect(findAll('foo barn', 'foo bar', options).matches).toHaveLength(0);
  });

  it('finds a query with surrounding spaces', () => {
    expect(findAll('a b', ' b').matches).toEqual([{ start: 1, end: 3 }]);
  });

  it('stops at MAX_MATCHES and reports it', () => {
    const result = findAll('a'.repeat(MAX_MATCHES + 1), 'a');
    expect(result.matches).toHaveLength(MAX_MATCHES);
    expect(result.truncated).toBe(true);
  });

  it('does not report truncation at exactly MAX_MATCHES', () => {
    const result = findAll('a'.repeat(MAX_MATCHES), 'a');
    expect(result.matches).toHaveLength(MAX_MATCHES);
    expect(result.truncated).toBe(false);
  });

  it('builds a global unicode regex', () => {
    expect(buildSearchRegex('x').flags).toBe('giu');
    expect(buildSearchRegex('x', { caseSensitive: true }).flags).toBe('gu');
  });
});

describe('firstMatchAtOrAfter', () => {
  const matches = [{ start: 10 }, { start: 20 }, { start: 30 }];

  it('finds the first match at or after the offset', () => {
    expect(firstMatchAtOrAfter(matches, 0)).toBe(0);
    expect(firstMatchAtOrAfter(matches, 10)).toBe(0);
    expect(firstMatchAtOrAfter(matches, 11)).toBe(1);
    expect(firstMatchAtOrAfter(matches, 30)).toBe(2);
  });

  it('wraps to the first match past the end', () => {
    expect(firstMatchAtOrAfter(matches, 31)).toBe(0);
  });

  it('returns 0 for an empty list', () => {
    expect(firstMatchAtOrAfter([], 5)).toBe(0);
  });
});
