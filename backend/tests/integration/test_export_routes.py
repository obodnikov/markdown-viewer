"""
Integration tests for Export routes.
"""
import sys
from unittest.mock import patch

import pytest

from app import export_bp
from services.export_service import PdfResult

# The app can load its routes as backend.routes.export or routes.export
export_routes = sys.modules[export_bp.import_name]


@pytest.fixture
def service_class():
    """Replace the ExportService class the routes use."""
    with patch.object(export_routes, 'ExportService') as mock:
        yield mock


@pytest.fixture
def service(service_class):
    """The ExportService instance the routes get."""
    return service_class.return_value


class TestExportRoutes:
    """Test cases for Export API routes."""

    def test_export_html(self, service, client, sample_markdown):
        """Test HTML export endpoint."""
        service.to_html.return_value = '<h1>Test</h1>'

        response = client.post('/api/export/html', json={
            'content': sample_markdown,
            'options': {}
        })

        assert response.status_code == 200
        assert response.get_json()['html'] == '<h1>Test</h1>'

    def test_export_html_with_options(self, service, client, sample_markdown):
        """Test HTML export with options."""
        service.to_html.return_value = '<html><h1>Test</h1></html>'

        response = client.post('/api/export/html', json={
            'content': sample_markdown,
            'options': {'standalone': True, 'toc': True}
        })

        assert response.status_code == 200
        service.to_html.assert_called_once_with(sample_markdown, {'standalone': True, 'toc': True})

    def test_export_pdf(self, service, client, sample_markdown):
        """Test PDF export endpoint."""
        service.to_pdf.return_value = PdfResult(b'%PDF-1.4...')

        response = client.post('/api/export/pdf', json={
            'content': sample_markdown,
            'filename': 'test.pdf',
            'options': {}
        })

        assert response.status_code == 200
        assert response.content_type == 'application/pdf'
        assert response.data == b'%PDF-1.4...'
        assert 'X-Export-Missing-Characters' not in response.headers
        assert 'X-Export-Skipped-Images' not in response.headers

    def test_export_pdf_reports_left_out_content(self, service, client, sample_markdown):
        """Test PDF export tells the frontend what could not be included."""
        service.to_pdf.return_value = PdfResult(b'%PDF', missing_characters=3, skipped_images=1)

        response = client.post('/api/export/pdf', json={'content': sample_markdown})

        assert response.status_code == 200
        assert response.headers['X-Export-Missing-Characters'] == '3'
        assert response.headers['X-Export-Skipped-Images'] == '1'

    def test_export_pdf_exposes_warning_headers_across_origins(self, service, client, sample_markdown):
        """Test the frontend can read the warning headers from another origin."""
        service.to_pdf.return_value = PdfResult(b'%PDF', missing_characters=3)

        response = client.post(
            '/api/export/pdf',
            json={'content': sample_markdown},
            headers={'Origin': 'http://localhost:8000'}
        )

        exposed = response.headers.get('Access-Control-Expose-Headers', '')
        assert 'X-Export-Missing-Characters' in exposed
        assert 'X-Export-Skipped-Images' in exposed

    def test_export_pdf_reports_conversion_error(self, service, client, sample_markdown):
        """Test PDF export returns the service's message."""
        service.to_pdf.side_effect = RuntimeError('PDF font "X" not found.')

        response = client.post('/api/export/pdf', json={'content': sample_markdown})

        assert response.status_code == 500
        assert response.get_json()['error'] == 'PDF font "X" not found.'

    def test_export_pdf_missing_content(self, client):
        """Test PDF export with missing content."""
        response = client.post('/api/export/pdf', json={'options': {}})

        assert response.status_code == 400

    def test_routes_pass_settings_to_service(self, service_class, client, sample_markdown):
        """Test configured tools and fonts reach the service."""
        settings = {
            'PANDOC_PATH': '/opt/pandoc',
            'PDF_ENGINE': '/opt/xelatex',
            'RSVG_CONVERT_PATH': '/opt/rsvg-convert',
            'PDF_MAIN_FONT': 'Main',
            'PDF_MONO_FONT': 'Mono',
        }
        service_class.return_value.to_html.return_value = ''

        with patch.multiple(export_routes.Config, **settings):
            client.post('/api/export/html', json={'content': sample_markdown})

        service_class.assert_called_once_with(
            pandoc_path='/opt/pandoc',
            pdf_engine='/opt/xelatex',
            rsvg_convert_path='/opt/rsvg-convert',
            main_font='Main',
            mono_font='Mono'
        )

    def test_export_docx(self, service, client, sample_markdown):
        """Test DOCX export endpoint."""
        service.to_docx.return_value = b'PK\x03\x04...'

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

    def test_export_pandoc_error(self, service, client, sample_markdown):
        """Test export error handling."""
        service.to_html.side_effect = OSError("Pandoc not found")

        response = client.post('/api/export/html', json={
            'content': sample_markdown
        })

        assert response.status_code == 500
