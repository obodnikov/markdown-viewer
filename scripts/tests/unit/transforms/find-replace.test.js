import { describe, it, expect } from 'vitest';
import { FindReplace } from '../../../transforms/find-replace.js';

describe('FindReplace', () => {
  const findReplace = new FindReplace();

  function countWithPreset(presetId, input, content) {
    const { pattern, flags } = findReplace.generatePattern(presetId, input);
    return findReplace.findMatches(content, pattern, flags).length;
  }

  describe('findMatches', () => {
    it('does not hang on a pattern that can match nothing', () => {
      const matches = findReplace.findMatches('abc', 'x*', 'g');
      expect(matches).toHaveLength(4);
      expect(matches.every((match) => match.text === '')).toBe(true);
    });

    it('agrees with replace when a pattern can match nothing', () => {
      const count = findReplace.findMatches('abc', 'x*', 'g').length;
      const replaced = findReplace.replace('abc', 'x*', '-', 'g');
      expect(replaced.split('-').length - 1).toBe(count);
    });

    it('finds every match on a line with the m flag', () => {
      expect(findReplace.findMatches('foo foo', 'foo', 'gm')).toHaveLength(2);
      expect(findReplace.replace('foo foo', 'foo', 'X', 'gm')).toBe('X X');
    });

    it('finds a match that includes the line break', () => {
      const { pattern, flags } = findReplace.generatePattern('empty-lines', '');
      const content = 'a\n\nb\n\nc';
      expect(findReplace.findMatches(content, pattern, flags)).toHaveLength(2);
      expect(findReplace.replace(content, pattern, '', flags)).toBe('a\nb\nc');
    });

    it('finds a match across lines', () => {
      const { pattern, flags } = findReplace.generatePattern('between', '<<|>>');
      expect(findReplace.findMatches('<<a\nb>>', pattern, flags)).toHaveLength(1);
    });

    it('adds the g flag when it is missing, as AI patterns may omit it', () => {
      expect(findReplace.findMatches('foo foo', 'foo', '')).toHaveLength(2);
      expect(findReplace.findMatches('foo foo', 'foo', 'i')).toHaveLength(2);
    });

    it('reports the line of each match', () => {
      const matches = findReplace.findMatches('one\ntwo foo\n\nfoo three\nfoo', 'foo', 'g');
      expect(matches.map((match) => match.line)).toEqual([2, 4, 5]);
      expect(matches.map((match) => match.lineText)).toEqual(['two foo', 'foo three', 'foo']);
      expect(matches.map((match) => match.index)).toEqual([8, 13, 23]);
    });

    it('reports the line of a match starting at a line break', () => {
      const [match] = findReplace.findMatches('a\n\nb', '\\n\\n', 'g');
      expect(match.line).toBe(1);
      expect(match.lineText).toBe('a');
    });

    it('returns capture groups', () => {
      const [match] = findReplace.findMatches('key=value', '(\\w+)=(\\w+)', 'g');
      expect(match.groups).toEqual(['key', 'value']);
    });

    it('stays fast on one very long line', () => {
      const content = 'foo '.repeat(200000);
      const startedAt = performance.now();
      expect(findReplace.findMatches(content, 'foo', 'g')).toHaveLength(200000);
      expect(performance.now() - startedAt).toBeLessThan(2000);
    });

    it('reports a broken pattern', () => {
      expect(() => findReplace.findMatches('abc', '(', 'g')).toThrow('Invalid regex pattern');
    });
  });

  describe('whole-word preset', () => {
    it('matches Latin words', () => {
      expect(countWithPreset('whole-word', 'cat', 'cat catalog concat')).toBe(1);
    });

    it('matches Cyrillic words', () => {
      expect(countWithPreset('whole-word', 'кот', 'кот котлета скот')).toBe(1);
    });

    it('works with special characters in the word', () => {
      expect(countWithPreset('whole-word', 'a.b', 'a.b axb')).toBe(1);
    });

    it('replaces only whole words, ignoring case by default', () => {
      const { pattern, flags } = findReplace.generatePattern('whole-word', 'кот');
      const caseFlags = findReplace.getCaseFlags(false, flags);
      expect(findReplace.replace('Кот котлета кот', pattern, 'пёс', caseFlags)).toBe('пёс котлета пёс');
    });
  });

  describe('other presets keep working', () => {
    it('contains', () => {
      expect(countWithPreset('contains', 'a.b', 'a.b axb a.b')).toBe(2);
    });

    it('starts-with and ends-with', () => {
      expect(countWithPreset('starts-with', '#', '# one\ntwo #\n# three')).toBe(2);
      expect(countWithPreset('ends-with', '.', 'one.\ntwo\nthree.')).toBe(2);
    });

    it('remove-lines-containing', () => {
      const { pattern, flags } = findReplace.generatePattern('remove-lines-containing', 'TODO');
      const content = 'keep\nTODO one\nkeep too';
      expect(findReplace.findMatches(content, pattern, flags)).toHaveLength(1);
      expect(findReplace.replace(content, pattern, '', flags)).toBe('keep\nkeep too');
    });

    it('multiple-spaces', () => {
      const { pattern, flags } = findReplace.generatePattern('multiple-spaces', '');
      expect(findReplace.findMatches('a  b   c d', pattern, flags)).toHaveLength(2);
    });
  });

  describe('getMatchStats', () => {
    it('counts matches and lines', () => {
      const matches = findReplace.findMatches('foo foo\nbar\nfoo', 'foo', 'g');
      expect(findReplace.getMatchStats(matches, '')).toMatchObject({ count: 3, lines: 2 });
    });
  });
});
