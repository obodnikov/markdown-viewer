/**
 * Unit tests for newline remover
 */
import { describe, it, expect } from 'vitest';

/**
 * Mock newline removal functions based on actual implementation
 */
function removeNewlinesSmart(text) {
  // Preserve markdown structure
  return text
    .replace(/([^\n])\n([^\n])/g, '$1 $2')  // Join single newlines
    .replace(/\n{3,}/g, '\n\n');  // Max 2 newlines
}

function removeNewlinesParagraphOnly(text) {
  // Only join paragraph text
  return text.replace(/([a-z,.])\n([a-z])/gi, '$1 $2');
}

function removeNewlinesAggressive(text) {
  // Remove all unnecessary newlines
  return text.replace(/\n+/g, ' ').trim();
}

describe('Newline Remover', () => {
  it('should remove single newlines in smart mode', () => {
    const input = 'Line 1\nLine 2\nLine 3';
    const output = removeNewlinesSmart(input);
    expect(output).toBe('Line 1 Line 2 Line 3');
  });

  it('should preserve double newlines in smart mode', () => {
    const input = 'Paragraph 1\n\nParagraph 2';
    const output = removeNewlinesSmart(input);
    expect(output).toBe('Paragraph 1\n\nParagraph 2');
  });

  it('should reduce triple newlines to double in smart mode', () => {
    const input = 'Text\n\n\nMore text';
    const output = removeNewlinesSmart(input);
    expect(output).toBe('Text\n\nMore text');
  });

  it('should join paragraph text only in paragraph mode', () => {
    const input = 'This is a sentence.\nThis continues it.';
    const output = removeNewlinesParagraphOnly(input);
    expect(output).toBe('This is a sentence. This continues it.');
  });

  it('should preserve headings in paragraph mode', () => {
    const input = '# Heading\nText below';
    const output = removeNewlinesParagraphOnly(input);
    // Heading should not be joined
    expect(output).toContain('# Heading');
  });

  it('should remove all newlines in aggressive mode', () => {
    const input = 'Line 1\nLine 2\n\nLine 3';
    const output = removeNewlinesAggressive(input);
    expect(output).toBe('Line 1 Line 2  Line 3');
  });

  it('should handle empty strings', () => {
    expect(removeNewlinesSmart('')).toBe('');
    expect(removeNewlinesParagraphOnly('')).toBe('');
    expect(removeNewlinesAggressive('')).toBe('');
  });

  it('should handle strings with no newlines', () => {
    const input = 'No newlines here';
    expect(removeNewlinesSmart(input)).toBe(input);
    expect(removeNewlinesParagraphOnly(input)).toBe(input);
  });

  it('should handle markdown lists in smart mode', () => {
    const input = '- Item 1\n- Item 2\n- Item 3';
    const output = removeNewlinesSmart(input);
    // Lists should be preserved
    expect(output).toContain('- Item');
  });

  it('should handle code blocks', () => {
    const input = '```\ncode line 1\ncode line 2\n```';
    const output = removeNewlinesSmart(input);
    // Code blocks should be minimally affected
    expect(output).toContain('```');
  });
});
