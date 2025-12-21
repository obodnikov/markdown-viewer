"""
Integration tests for Export routes.
"""
import pytest
import json
from unittest.mock import patch, MagicMock


class TestExportRoutes:
    """Test cases for Export API routes."""

    @patch('routes.export.ExportService')
    def test_export_html(self, mock_service, client, sample_markdown):
        """Test HTML export endpoint."""
        mock_instance = MagicMock()
        mock_instance.to_html.return_value = '<h1>Test</h1>'
        mock_service.return_value = mock_instance

        response = client.post('/api/export/html', json={
            'content': sample_markdown,
            'options': {}
        })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'html' in data
        assert data['html'] == '<h1>Test</h1>'

    @patch('routes.export.ExportService')
    def test_export_html_with_options(self, mock_service, client, sample_markdown):
        """Test HTML export with options."""
        mock_instance = MagicMock()
        mock_instance.to_html.return_value = '<html><h1>Test</h1></html>'
        mock_service.return_value = mock_instance

        response = client.post('/api/export/html', json={
            'content': sample_markdown,
            'options': {'standalone': True, 'toc': True}
        })

        assert response.status_code == 200

    @patch('routes.export.ExportService')
    def test_export_pdf(self, mock_service, client, sample_markdown):
        """Test PDF export endpoint."""
        mock_instance = MagicMock()
        mock_instance.to_pdf.return_value = b'%PDF-1.4...'
        mock_service.return_value = mock_instance

        response = client.post('/api/export/pdf', json={
            'content': sample_markdown,
            'filename': 'test.pdf',
            'options': {}
        })

        assert response.status_code == 200
        assert response.content_type == 'application/pdf'
        assert response.data == b'%PDF-1.4...'

    @patch('routes.export.ExportService')
    def test_export_docx(self, mock_service, client, sample_markdown):
        """Test DOCX export endpoint."""
        mock_instance = MagicMock()
        mock_instance.to_docx.return_value = b'PK\x03\x04...'
        mock_service.return_value = mock_instance

        response = client.post('/api/export/docx', json={
            'content': sample_markdown,
            'filename': 'test.docx',
            'options': {}
        })

        assert response.status_code == 200
        assert 'application/vnd.openxmlformats' in response.content_type

    def test_export_missing_content(self, client):
        """Test export with missing content."""
        response = client.post('/api/export/html', json={
            'options': {}
        })

        assert response.status_code == 400

    @patch('routes.export.ExportService')
    def test_export_pandoc_error(self, mock_service, client, sample_markdown):
        """Test export error handling."""
        mock_instance = MagicMock()
        mock_instance.to_html.side_effect = OSError("Pandoc not found")
        mock_service.return_value = mock_instance

        response = client.post('/api/export/html', json={
            'content': sample_markdown
        })

        assert response.status_code == 500
