/**
 * Export manager for various formats
 */

import { APIClient } from '../utils/api.js';

export class ExportManager {
    async export(format, content, filename) {
        switch (format) {
            case 'md':
                return this.exportMarkdown(content, filename);
            case 'html':
                return this.exportHTML(content, filename);
            case 'pdf':
                return this.exportPDF(content, filename);
            case 'docx':
                return this.exportDOCX(content, filename);
            default:
                throw new Error(`Unknown export format: ${format}`);
        }
    }

    exportMarkdown(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown' });
        this.downloadBlob(blob, `${filename}.md`);
    }

    async exportHTML(content, filename) {
        try {
            const response = await APIClient.post('/export/html', {
                content,
                options: {
                    standalone: true,
                    toc: false
                }
            });

            if (!response.success) {
                throw new Error(response.error || 'HTML export failed');
            }

            const blob = new Blob([response.html], { type: 'text/html' });
            this.downloadBlob(blob, `${filename}.html`);

        } catch (error) {
            console.error('HTML export error:', error);
            throw error;
        }
    }

    async exportPDF(content, filename) {
        try {
            const response = await fetch('http://localhost:5000/api/export/pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    content,
                    filename: `${filename}.pdf`,
                    options: {
                        paper_size: 'A4',
                        margin: '1in',
                        toc: false
                    }
                })
            });

            if (!response.ok) {
                throw new Error('PDF export failed');
            }

            const blob = await response.blob();
            this.downloadBlob(blob, `${filename}.pdf`);

        } catch (error) {
            console.error('PDF export error:', error);
            throw error;
        }
    }

    async exportDOCX(content, filename) {
        try {
            const response = await fetch('http://localhost:5000/api/export/docx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    content,
                    filename: `${filename}.docx`,
                    options: {
                        toc: false
                    }
                })
            });

            if (!response.ok) {
                throw new Error('DOCX export failed');
            }

            const blob = await response.blob();
            this.downloadBlob(blob, `${filename}.docx`);

        } catch (error) {
            console.error('DOCX export error:', error);
            throw error;
        }
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
