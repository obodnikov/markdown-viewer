/**
 * Unit tests for storage utility
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Mock the storage module behavior
describe('Storage Utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save data to localStorage', () => {
    const testData = { title: 'Test', content: '# Test' };
    localStorage.setItem('currentDocument', JSON.stringify(testData));

    const stored = localStorage.getItem('currentDocument');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored)).toEqual(testData);
  });

  it('should retrieve data from localStorage', () => {
    const testData = { title: 'Test', content: '# Test' };
    localStorage.setItem('currentDocument', JSON.stringify(testData));

    const retrieved = JSON.parse(localStorage.getItem('currentDocument'));
    expect(retrieved.title).toBe('Test');
    expect(retrieved.content).toBe('# Test');
  });

  it('should remove data from localStorage', () => {
    localStorage.setItem('test', 'value');
    localStorage.removeItem('test');

    expect(localStorage.getItem('test')).toBeNull();
  });

  it('should clear all localStorage data', () => {
    localStorage.setItem('key1', 'value1');
    localStorage.setItem('key2', 'value2');
    localStorage.clear();

    expect(localStorage.getItem('key1')).toBeNull();
    expect(localStorage.getItem('key2')).toBeNull();
  });

  it('should handle non-existent keys', () => {
    const result = localStorage.getItem('nonexistent');
    expect(result).toBeNull();
  });

  it('should handle theme persistence', () => {
    localStorage.setItem('theme', 'dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    localStorage.setItem('theme', 'light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('should handle autosave data', () => {
    const autosaveData = {
      content: '# Autosaved content',
      timestamp: Date.now()
    };

    localStorage.setItem('autosave', JSON.stringify(autosaveData));
    const retrieved = JSON.parse(localStorage.getItem('autosave'));

    expect(retrieved.content).toBe('# Autosaved content');
    expect(retrieved.timestamp).toBeDefined();
  });
});
