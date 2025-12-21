/**
 * Unit tests for ImportManager
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportManager } from '../../../file/import.js';

describe('ImportManager', () => {
    let importManager;

    beforeEach(() => {
        importManager = new ImportManager();
    });

    describe('validateURL', () => {
        it('should reject HTTP URLs and require HTTPS', () => {
            const httpUrl = 'http://chatgpt.com/share/abc123';
            const result = importManager.validateURL(httpUrl);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('HTTPS');
            expect(result.error.toLowerCase()).toContain('http is not allowed');
        });

        it('should accept valid HTTPS ChatGPT URL', () => {
            const httpsUrl = 'https://chatgpt.com/share/abc123';
            const result = importManager.validateURL(httpsUrl);

            expect(result.isValid).toBe(true);
            expect(result.platform).toBe('chatgpt');
        });

        it('should reject empty URL', () => {
            const result = importManager.validateURL('');

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('enter a URL');
        });

        it('should reject unsupported platforms', () => {
            const claudeUrl = 'https://claude.ai/share/xyz789';
            const result = importManager.validateURL(claudeUrl);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('not yet supported');
        });

        it('should reject unknown domains', () => {
            const unknownUrl = 'https://evil.com/share/abc';
            const result = importManager.validateURL(unknownUrl);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('ChatGPT share link');
        });

        it('should trim whitespace from URL', () => {
            const urlWithSpaces = '  https://chatgpt.com/share/abc123  ';
            const result = importManager.validateURL(urlWithSpaces);

            expect(result.isValid).toBe(true);
            expect(result.platform).toBe('chatgpt');
        });
    });

    describe('HTTPS validation edge cases', () => {
        it('should reject HTTP even for valid ChatGPT domain', () => {
            const httpChatGPT = 'http://chatgpt.com/share/valid-id';
            const result = importManager.validateURL(httpChatGPT);

            expect(result.isValid).toBe(false);
            expect(result.error).toMatch(/HTTPS.*security/i);
        });

        it('should reject URLs starting with other protocols', () => {
            const ftpUrl = 'ftp://chatgpt.com/share/abc';
            const result = importManager.validateURL(ftpUrl);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('HTTPS');
        });

        it('should reject non-string URL inputs', () => {
            const result = importManager.validateURL(null);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('enter a URL');
        });
    });
});
