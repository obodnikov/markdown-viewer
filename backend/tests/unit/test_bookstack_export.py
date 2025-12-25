"""Unit tests for BookStack export endpoint functionality."""
import pytest
from unittest.mock import Mock, patch, MagicMock
import requests

try:
    from backend.services.bookstack_service import BookStackService
except ImportError:
    from services.bookstack_service import BookStackService


class TestBookStackExportEndpoint:
    """Test BookStack export/markdown endpoint with fallback."""

    @pytest.fixture
    def service(self):
        """Create BookStackService instance for testing."""
        return BookStackService(
            base_url='https://bookstack.example.com',
            token_id='test_token_id',
            token_secret='test_token_secret',
            timeout=30
        )

    @pytest.fixture
    def mock_page_metadata(self):
        """Mock page metadata response."""
        return {
            'id': 123,
            'book_id': 45,
            'chapter_id': 67,
            'name': 'Test Page',
            'slug': 'test-page',
            'html': '<h1>Test Content</h1><p>This is a test.</p>',
            'markdown': '',  # Empty markdown (will be populated)
            'created_at': '2025-12-20T10:00:00Z',
            'updated_at': '2025-12-25T15:30:00Z'
        }

    # ===== SUCCESS SCENARIOS =====

    def test_get_page_with_export_success(self, service, mock_page_metadata):
        """Test successful page retrieval using export endpoint."""
        with patch.object(service, '_request') as mock_request, \
             patch.object(service, '_request_raw') as mock_request_raw:

            # Mock metadata request
            mock_request.return_value = mock_page_metadata.copy()

            # Mock successful export
            export_markdown = '# Test Content\n\nThis is a test.'
            mock_request_raw.return_value = export_markdown

            # Execute
            result = service.get_page(123)

            # Verify
            assert result['id'] == 123
            assert result['name'] == 'Test Page'
            assert result['markdown'] == export_markdown

            # Verify both calls were made
            mock_request.assert_called_once_with('GET', '/api/pages/123')
            mock_request_raw.assert_called_once_with('/api/pages/123/export/markdown')

    def test_export_markdown_returns_plain_text(self, service):
        """Test that _export_markdown returns plain text correctly."""
        with patch.object(service, '_request_raw') as mock_request_raw:
            expected_markdown = '# Heading\n\n**Bold** text.'
            mock_request_raw.return_value = expected_markdown

            result = service._export_markdown(123)

            assert result == expected_markdown
            mock_request_raw.assert_called_once_with('/api/pages/123/export/markdown')

    # ===== FALLBACK SCENARIOS =====

    def test_get_page_fallback_on_404(self, service, mock_page_metadata):
        """Test fallback to HTML conversion when export returns 404."""
        with patch.object(service, '_request') as mock_request, \
             patch.object(service, '_request_raw') as mock_request_raw, \
             patch.object(service, 'html_to_markdown') as mock_html_converter:

            # Mock metadata request
            page_data = mock_page_metadata.copy()
            page_data['html'] = '<h1>Test</h1>'
            page_data['markdown'] = ''
            mock_request.return_value = page_data

            # Mock 404 error from export endpoint
            error_response = Mock()
            error_response.status_code = 404
            mock_request_raw.side_effect = requests.exceptions.HTTPError(
                response=error_response
            )

            # Mock HTML conversion
            mock_html_converter.return_value = '# Test'

            # Execute
            result = service.get_page(123)

            # Verify fallback was used
            assert result['markdown'] == '# Test'
            mock_request_raw.assert_called_once()
            mock_html_converter.assert_called_once_with('<h1>Test</h1>')

    def test_get_page_fallback_on_403(self, service, mock_page_metadata):
        """Test fallback to HTML conversion when export returns 403 (forbidden)."""
        with patch.object(service, '_request') as mock_request, \
             patch.object(service, '_request_raw') as mock_request_raw, \
             patch.object(service, 'html_to_markdown') as mock_html_converter:

            # Mock metadata request
            page_data = mock_page_metadata.copy()
            page_data['html'] = '<p>Forbidden content</p>'
            page_data['markdown'] = ''
            mock_request.return_value = page_data

            # Mock 403 error
            error_response = Mock()
            error_response.status_code = 403
            mock_request_raw.side_effect = requests.exceptions.HTTPError(
                response=error_response
            )

            # Mock HTML conversion
            mock_html_converter.return_value = 'Forbidden content'

            # Execute
            result = service.get_page(123)

            # Verify fallback was used
            assert result['markdown'] == 'Forbidden content'
            mock_html_converter.assert_called_once()

    def test_get_page_fallback_on_timeout(self, service, mock_page_metadata):
        """Test fallback to HTML conversion when export times out."""
        with patch.object(service, '_request') as mock_request, \
             patch.object(service, '_request_raw') as mock_request_raw, \
             patch.object(service, 'html_to_markdown') as mock_html_converter:

            # Mock metadata request
            page_data = mock_page_metadata.copy()
            page_data['html'] = '<h2>Timeout Test</h2>'
            page_data['markdown'] = ''
            mock_request.return_value = page_data

            # Mock timeout
            mock_request_raw.side_effect = requests.exceptions.Timeout()

            # Mock HTML conversion
            mock_html_converter.return_value = '## Timeout Test'

            # Execute
            result = service.get_page(123)

            # Verify fallback was used
            assert result['markdown'] == '## Timeout Test'
            mock_html_converter.assert_called_once()

    def test_get_page_fallback_on_empty_export(self, service, mock_page_metadata):
        """Test fallback to HTML conversion when export returns empty content."""
        with patch.object(service, '_request') as mock_request, \
             patch.object(service, '_request_raw') as mock_request_raw, \
             patch.object(service, 'html_to_markdown') as mock_html_converter:

            # Mock metadata request
            page_data = mock_page_metadata.copy()
            page_data['html'] = '<p>Empty export</p>'
            page_data['markdown'] = ''
            mock_request.return_value = page_data

            # Mock empty export response
            mock_request_raw.return_value = ''

            # Mock HTML conversion
            mock_html_converter.return_value = 'Empty export'

            # Execute
            result = service.get_page(123)

            # Verify fallback was used
            assert result['markdown'] == 'Empty export'
            mock_html_converter.assert_called_once()

    def test_get_page_fallback_on_whitespace_only_export(self, service, mock_page_metadata):
        """Test fallback when export returns only whitespace."""
        with patch.object(service, '_request') as mock_request, \
             patch.object(service, '_request_raw') as mock_request_raw, \
             patch.object(service, 'html_to_markdown') as mock_html_converter:

            # Mock metadata request
            page_data = mock_page_metadata.copy()
            page_data['html'] = '<p>Whitespace test</p>'
            page_data['markdown'] = ''
            mock_request.return_value = page_data

            # Mock whitespace-only export
            mock_request_raw.return_value = '   \n\t  \n  '

            # Mock HTML conversion
            mock_html_converter.return_value = 'Whitespace test'

            # Execute
            result = service.get_page(123)

            # Verify fallback was used
            assert result['markdown'] == 'Whitespace test'
            mock_html_converter.assert_called_once()

    def test_get_page_fallback_on_generic_exception(self, service, mock_page_metadata):
        """Test fallback on any other exception during export."""
        with patch.object(service, '_request') as mock_request, \
             patch.object(service, '_request_raw') as mock_request_raw, \
             patch.object(service, 'html_to_markdown') as mock_html_converter:

            # Mock metadata request
            page_data = mock_page_metadata.copy()
            page_data['html'] = '<p>Error test</p>'
            page_data['markdown'] = ''
            mock_request.return_value = page_data

            # Mock generic exception
            mock_request_raw.side_effect = Exception('Network error')

            # Mock HTML conversion
            mock_html_converter.return_value = 'Error test'

            # Execute
            result = service.get_page(123)

            # Verify fallback was used
            assert result['markdown'] == 'Error test'
            mock_html_converter.assert_called_once()

    # ===== EDGE CASES =====

    def test_get_page_with_existing_markdown_field(self, service, mock_page_metadata):
        """Test when page already has markdown field populated."""
        with patch.object(service, '_request') as mock_request, \
             patch.object(service, '_request_raw') as mock_request_raw:

            # Mock page with markdown already populated
            page_data = mock_page_metadata.copy()
            page_data['markdown'] = '# Already has markdown'
            mock_request.return_value = page_data

            # Mock successful export
            mock_request_raw.return_value = '# Export markdown'

            # Execute
            result = service.get_page(123)

            # Verify export markdown overwrites existing
            assert result['markdown'] == '# Export markdown'

    def test_get_page_preserves_metadata(self, service, mock_page_metadata):
        """Test that all metadata fields are preserved."""
        with patch.object(service, '_request') as mock_request, \
             patch.object(service, '_request_raw') as mock_request_raw:

            mock_request.return_value = mock_page_metadata.copy()
            mock_request_raw.return_value = '# Test'

            result = service.get_page(123)

            # Verify all metadata preserved
            assert result['id'] == 123
            assert result['book_id'] == 45
            assert result['chapter_id'] == 67
            assert result['name'] == 'Test Page'
            assert result['updated_at'] == '2025-12-25T15:30:00Z'

    # ===== _request_raw HELPER TESTS =====

    def test_request_raw_success(self, service):
        """Test _request_raw helper for successful plain text response."""
        with patch('requests.request') as mock_requests:
            # Mock successful response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.text = 'Plain text content'
            mock_response.raise_for_status = Mock()
            mock_requests.return_value = mock_response

            result = service._request_raw('/api/test/endpoint')

            assert result == 'Plain text content'
            assert mock_requests.call_count == 1

    def test_request_raw_timeout(self, service):
        """Test _request_raw raises timeout exception."""
        with patch('requests.request') as mock_requests:
            mock_requests.side_effect = requests.exceptions.Timeout()

            with pytest.raises(requests.exceptions.Timeout):
                service._request_raw('/api/test/endpoint')

    def test_request_raw_http_error(self, service):
        """Test _request_raw raises HTTP error."""
        with patch('requests.request') as mock_requests:
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
                response=mock_response
            )
            mock_requests.return_value = mock_response

            with pytest.raises(requests.exceptions.HTTPError):
                service._request_raw('/api/test/endpoint')

    def test_request_raw_uses_timeout_setting(self, service):
        """Test that _request_raw respects timeout configuration."""
        with patch('requests.request') as mock_requests:
            mock_response = Mock()
            mock_response.text = 'content'
            mock_response.raise_for_status = Mock()
            mock_requests.return_value = mock_response

            service._request_raw('/api/test')

            # Verify timeout was passed
            call_kwargs = mock_requests.call_args[1]
            assert call_kwargs['timeout'] == 30

    def test_request_raw_uses_auth_headers(self, service):
        """Test that _request_raw includes authorization headers."""
        with patch('requests.request') as mock_requests:
            mock_response = Mock()
            mock_response.text = 'content'
            mock_response.raise_for_status = Mock()
            mock_requests.return_value = mock_response

            service._request_raw('/api/test')

            # Verify auth headers were included
            call_kwargs = mock_requests.call_args[1]
            assert 'headers' in call_kwargs
            assert 'Authorization' in call_kwargs['headers']
            assert call_kwargs['headers']['Authorization'] == 'Token test_token_id:test_token_secret'

    # ===== INTEGRATION-STYLE TESTS =====

    def test_full_export_flow_success(self, service):
        """Test complete flow: metadata + export success."""
        with patch('requests.request') as mock_requests:
            # First call: metadata
            metadata_response = Mock()
            metadata_response.status_code = 200
            metadata_response.json.return_value = {
                'id': 123,
                'name': 'Test',
                'html': '<h1>Test</h1>',
                'markdown': ''
            }
            metadata_response.raise_for_status = Mock()

            # Second call: export
            export_response = Mock()
            export_response.status_code = 200
            export_response.text = '# Test'
            export_response.raise_for_status = Mock()

            mock_requests.side_effect = [metadata_response, export_response]

            result = service.get_page(123)

            assert result['markdown'] == '# Test'
            assert mock_requests.call_count == 2

    def test_full_export_flow_with_fallback(self, service):
        """Test complete flow: metadata + export fail + HTML conversion."""
        with patch('requests.request') as mock_requests, \
             patch.object(service, 'html_to_markdown') as mock_converter:

            # First call: metadata
            metadata_response = Mock()
            metadata_response.status_code = 200
            metadata_response.json.return_value = {
                'id': 123,
                'name': 'Test',
                'html': '<h1>Test</h1>',
                'markdown': ''
            }
            metadata_response.raise_for_status = Mock()

            # Second call: export fails with 404
            export_response = Mock()
            export_response.status_code = 404
            export_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
                response=export_response
            )

            mock_requests.side_effect = [metadata_response, export_response]
            mock_converter.return_value = '# Test (converted)'

            result = service.get_page(123)

            assert result['markdown'] == '# Test (converted)'
            assert mock_requests.call_count == 2
            mock_converter.assert_called_once_with('<h1>Test</h1>')
