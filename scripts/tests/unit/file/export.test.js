/**
 * Unit tests for export manager
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../utils/api.js', () => ({
    APIClient: { request: vi.fn(), post: vi.fn() }
}));

import { APIClient } from '../../../utils/api.js';
import { ExportManager } from '../../../file/export.js';

function pdfResponse(headers = {}) {
    return {
        ok: true,
        headers: new Headers(headers),
        blob: async () => new Blob(['%PDF'])
    };
}

describe('ExportManager', () => {
    let manager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new ExportManager();
        manager.downloadBlob = vi.fn();
    });

    describe('getPdfWarning', () => {
        it('returns nothing when all content was included', () => {
            expect(manager.getPdfWarning(new Headers())).toBeNull();
        });

        it('reports missing characters', () => {
            const headers = new Headers({ 'X-Export-Missing-Characters': '3' });
            expect(manager.getPdfWarning(headers)).toBe('PDF exported, but 3 characters are missing from the font');
        });

        it('reports one skipped image', () => {
            const headers = new Headers({ 'X-Export-Skipped-Images': '1' });
            expect(manager.getPdfWarning(headers)).toBe('PDF exported, but 1 image was not included');
        });

        it('reports both problems together', () => {
            const headers = new Headers({
                'X-Export-Missing-Characters': '1',
                'X-Export-Skipped-Images': '2'
            });
            expect(manager.getPdfWarning(headers)).toBe(
                'PDF exported, but 1 character is missing from the font and 2 images were not included'
            );
        });
    });

    describe('export to PDF', () => {
        it('downloads the file and returns nothing when all content was included', async () => {
            APIClient.request.mockResolvedValue(pdfResponse());

            const warning = await manager.export('pdf', '# Test', 'doc');

            expect(warning).toBeNull();
            expect(manager.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'doc.pdf');
        });

        it('downloads the file and returns the warning when content was left out', async () => {
            APIClient.request.mockResolvedValue(pdfResponse({ 'X-Export-Skipped-Images': '2' }));

            const warning = await manager.export('pdf', '# Test', 'doc');

            expect(warning).toBe('PDF exported, but 2 images were not included');
            expect(manager.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'doc.pdf');
        });

        it('passes server errors on', async () => {
            APIClient.request.mockRejectedValue(new Error('PDF font "X" not found.'));

            await expect(manager.export('pdf', '# Test', 'doc')).rejects.toThrow('PDF font "X" not found.');
            expect(manager.downloadBlob).not.toHaveBeenCalled();
        });
    });
});
