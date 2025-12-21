"""
Unit tests for Export service.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from services.export_service import ExportService


@pytest.fixture
def export_service():
    """Create ExportService instance."""
    return ExportService()


@pytest.fixture
def mock_pypandoc():
    """Mock pypandoc library."""
    with patch('services.export_service.pypandoc') as mock:
        yield mock


class TestExportService:
    """Test cases for Export service."""

    def test_init(self, export_service):
        """Test service initialization."""
        assert export_service is not None

    @patch('services.export_service.pypandoc.convert_text')
    def test_to_html_basic(self, mock_convert, export_service, sample_markdown):
        """Test basic HTML export."""
        mock_convert.return_value = '<h1>Test</h1>'

        result = export_service.to_html(sample_markdown)

        assert result == '<h1>Test</h1>'
        mock_convert.assert_called_once()
        call_args = mock_convert.call_args
        assert call_args[1]['format'] == 'gfm'
        assert call_args[1]['to'] == 'html'

    @patch('services.export_service.pypandoc.convert_text')
    def test_to_html_with_options(self, mock_convert, export_service, sample_markdown):
        """Test HTML export with options."""
        mock_convert.return_value = '<html><body><h1>Test</h1></body></html>'

        options = {
            'standalone': True,
            'toc': True,
            'css': 'style.css'
        }
        result = export_service.to_html(sample_markdown, options=options)

        call_args = mock_convert.call_args
        extra_args = call_args[1]['extra_args']
        assert '--standalone' in extra_args
        assert '--toc' in extra_args
        assert '--css=style.css' in extra_args

    @patch('services.export_service.pypandoc.convert_text')
    def test_to_pdf_basic(self, mock_convert, export_service, sample_markdown):
        """Test basic PDF export."""
        mock_convert.return_value = b'%PDF-1.4...'

        result = export_service.to_pdf(
            content=sample_markdown,
            filename='test.pdf'
        )

        assert result == b'%PDF-1.4...'
        call_args = mock_convert.call_args
        assert call_args[1]['format'] == 'gfm'
        assert call_args[1]['to'] == 'pdf'

    @patch('services.export_service.pypandoc.convert_text')
    def test_to_pdf_with_xelatex(self, mock_convert, export_service, sample_markdown):
        """Test PDF export uses XeLaTeX engine for Unicode support."""
        mock_convert.return_value = b'%PDF...'

        export_service.to_pdf(sample_markdown, 'test.pdf')

        call_args = mock_convert.call_args
        extra_args = call_args[1]['extra_args']
        assert '--pdf-engine=xelatex' in extra_args

    @patch('services.export_service.pypandoc.convert_text')
    def test_to_pdf_with_options(self, mock_convert, export_service, sample_markdown):
        """Test PDF export with custom options."""
        mock_convert.return_value = b'%PDF...'

        options = {
            'paper_size': 'a4',
            'margin': '2cm',
            'toc': True
        }
        export_service.to_pdf(sample_markdown, 'test.pdf', options=options)

        call_args = mock_convert.call_args
        extra_args = call_args[1]['extra_args']
        # Check for geometry/margin settings
        assert any('margin' in arg or 'geometry' in arg for arg in extra_args) or '--toc' in extra_args

    @patch('services.export_service.pypandoc.convert_text')
    def test_to_docx_basic(self, mock_convert, export_service, sample_markdown):
        """Test basic DOCX export."""
        mock_convert.return_value = b'PK\x03\x04...'  # DOCX file signature

        result = export_service.to_docx(
            content=sample_markdown,
            filename='test.docx'
        )

        assert result == b'PK\x03\x04...'
        call_args = mock_convert.call_args
        assert call_args[1]['format'] == 'gfm'
        assert call_args[1]['to'] == 'docx'

    @patch('services.export_service.pypandoc.convert_text')
    def test_to_docx_with_options(self, mock_convert, export_service, sample_markdown):
        """Test DOCX export with options."""
        mock_convert.return_value = b'PK...'

        options = {
            'reference_doc': 'template.docx',
            'toc': True
        }
        export_service.to_docx(sample_markdown, 'test.docx', options=options)

        call_args = mock_convert.call_args
        extra_args = call_args[1]['extra_args']
        # Check if reference doc or TOC options were applied
        assert len(extra_args) > 0

    @patch('services.export_service.pypandoc.convert_text')
    def test_markdown_to_markdown(self, mock_convert, export_service, sample_markdown):
        """Test markdown normalization."""
        mock_convert.return_value = '# Normalized\n\nContent'

        result = export_service.markdown_to_markdown(sample_markdown)

        assert result == '# Normalized\n\nContent'
        call_args = mock_convert.call_args
        assert call_args[1]['format'] == 'gfm'
        assert call_args[1]['to'] == 'gfm'

    @patch('services.export_service.pypandoc.convert_text')
    def test_unicode_support_in_pdf(self, mock_convert, export_service):
        """Test PDF export with Unicode characters."""
        unicode_markdown = '# 你好世界\n\nこんにちは 🌍'
        mock_convert.return_value = b'%PDF...'

        export_service.to_pdf(unicode_markdown, 'unicode.pdf')

        call_args = mock_convert.call_args
        # Verify XeLaTeX is used (supports Unicode)
        extra_args = call_args[1]['extra_args']
        assert '--pdf-engine=xelatex' in extra_args

    @patch('services.export_service.pypandoc.convert_text')
    def test_error_handling_pandoc_not_found(self, mock_convert, export_service, sample_markdown):
        """Test error handling when pandoc is not installed."""
        mock_convert.side_effect = OSError("Pandoc not found")

        with pytest.raises(OSError, match="Pandoc not found"):
            export_service.to_html(sample_markdown)

    @patch('services.export_service.pypandoc.convert_text')
    def test_error_handling_invalid_markdown(self, mock_convert, export_service):
        """Test error handling with invalid markdown."""
        mock_convert.side_effect = RuntimeError("Conversion failed")

        with pytest.raises(RuntimeError, match="Conversion failed"):
            export_service.to_html("Invalid {{{ markdown")

    @patch('services.export_service.pypandoc.convert_text')
    def test_gfm_format_used(self, mock_convert, export_service, sample_markdown):
        """Test that GitHub Flavored Markdown format is used."""
        mock_convert.return_value = '<html></html>'

        export_service.to_html(sample_markdown)

        call_args = mock_convert.call_args
        # Verify GFM is the input format
        assert call_args[1]['format'] == 'gfm'

    @patch('services.export_service.pypandoc.convert_text')
    def test_table_support(self, mock_convert, export_service):
        """Test export with markdown tables."""
        table_markdown = """
| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
"""
        mock_convert.return_value = '<table>...</table>'

        result = export_service.to_html(table_markdown)
        assert result == '<table>...</table>'

    @patch('services.export_service.pypandoc.convert_text')
    def test_code_blocks_support(self, mock_convert, export_service):
        """Test export with code blocks."""
        code_markdown = """
```python
def hello():
    print("Hello")
```
"""
        mock_convert.return_value = '<pre><code>...</code></pre>'

        result = export_service.to_html(code_markdown)
        assert result == '<pre><code>...</code></pre>'

    @patch('services.export_service.pypandoc.convert_text')
    def test_large_document_handling(self, mock_convert, export_service):
        """Test handling of large documents."""
        large_markdown = '# Section\n\nContent\n' * 1000
        mock_convert.return_value = '<html>...</html>'

        result = export_service.to_html(large_markdown)
        assert result is not None
