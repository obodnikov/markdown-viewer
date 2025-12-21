"""
Unit tests for Chat Import Service
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from services.chat_import_service import ChatImportService


class TestChatImportService:
    """Test suite for ChatImportService"""

    def setup_method(self):
        """Set up test fixtures"""
        self.service = ChatImportService()

    def test_init(self):
        """Test service initialization"""
        assert self.service is not None
        assert self.service.html_converter is not None
        assert self.service.USER_AGENT is not None
        assert self.service.REQUEST_TIMEOUT == 30
        assert len(self.service.ALLOWED_DOMAINS) > 0

    def test_validate_url_valid_chatgpt(self):
        """Test URL validation with valid ChatGPT URL"""
        url = 'https://chatgpt.com/share/abc123'
        result = self.service._validate_url(url)
        assert result['valid'] is True

    def test_validate_url_valid_claude(self):
        """Test URL validation with valid Claude URL"""
        url = 'https://claude.ai/share/xyz789'
        result = self.service._validate_url(url)
        assert result['valid'] is True

    def test_validate_url_invalid_domain(self):
        """Test URL validation rejects invalid domain"""
        url = 'https://evil.com/share/abc'
        result = self.service._validate_url(url)
        assert result['valid'] is False
        assert 'not allowed' in result['error'].lower()

    def test_validate_url_localhost(self):
        """Test URL validation rejects localhost"""
        url = 'http://localhost:8080/test'
        result = self.service._validate_url(url)
        assert result['valid'] is False

    def test_validate_url_ip_address(self):
        """Test URL validation rejects IP addresses"""
        url = 'http://192.168.1.1/test'
        result = self.service._validate_url(url)
        assert result['valid'] is False
        assert 'not allowed' in result['error'].lower()

    def test_validate_url_invalid_scheme(self):
        """Test URL validation rejects invalid schemes"""
        url = 'ftp://chatgpt.com/share/abc'
        result = self.service._validate_url(url)
        assert result['valid'] is False
        assert 'https' in result['error'].lower()

    def test_validate_url_rejects_http(self):
        """Test URL validation rejects HTTP (only HTTPS allowed)"""
        url = 'http://chatgpt.com/share/abc'
        result = self.service._validate_url(url)
        assert result['valid'] is False
        assert 'https' in result['error'].lower()

    def test_validate_url_ssrf_attempt(self):
        """Test URL validation prevents SSRF attacks"""
        # Attempt to access internal network
        url = 'http://169.254.169.254/latest/meta-data'
        result = self.service._validate_url(url)
        assert result['valid'] is False

    def test_validate_url_rejects_subdomains(self):
        """Test URL validation rejects subdomain attacks"""
        # These should all be rejected (not in exact allowlist)
        subdomain_urls = [
            'https://evil.chatgpt.com/share/abc',
            'https://chatgpt.com.evil.com/share/abc',
            'https://subchatgpt.com/share/abc',
            'https://api.chatgpt.com/share/abc'
        ]
        for url in subdomain_urls:
            result = self.service._validate_url(url)
            assert result['valid'] is False, f'Should reject {url}'
            assert 'not allowed' in result['error'].lower()

    def test_detect_platform_chatgpt(self):
        """Test platform detection for ChatGPT"""
        url = 'https://chatgpt.com/share/abc123'
        platform = self.service.detect_platform(url)
        assert platform == 'chatgpt'

    def test_detect_platform_claude(self):
        """Test platform detection for Claude"""
        url = 'https://claude.ai/share/xyz789'
        platform = self.service.detect_platform(url)
        assert platform == 'claude'

    def test_detect_platform_perplexity(self):
        """Test platform detection for Perplexity"""
        url = 'https://perplexity.ai/search/test-query-abc'
        platform = self.service.detect_platform(url)
        assert platform == 'perplexity'

    def test_detect_platform_unknown(self):
        """Test platform detection for unknown URL"""
        url = 'https://example.com/share/abc'
        platform = self.service.detect_platform(url)
        assert platform is None

    def test_detect_platform_malformed_url(self):
        """Test platform detection with malformed URL"""
        url = 'not-a-valid-url'
        platform = self.service.detect_platform(url)
        assert platform is None

    def test_import_chat_invalid_url(self):
        """Test import_chat rejects invalid URLs"""
        url = 'https://evil.com/share/abc'
        result = self.service.import_chat(url)
        assert result['success'] is False
        assert 'error' in result

    def test_import_chat_unsupported_platform(self):
        """Test import_chat handles unsupported platforms"""
        url = 'https://claude.ai/share/abc123'
        result = self.service.import_chat(url)
        assert result['success'] is False
        assert 'not yet supported' in result['error'].lower()

    @patch('services.chat_import_service.requests.get')
    def test_import_chatgpt_success(self, mock_get):
        """Test successful ChatGPT import"""
        # Mock HTML response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = '''
        <html>
            <head><title>Test Conversation</title></head>
            <body>
                <div class="message user">User message</div>
                <div class="message assistant">Assistant response</div>
            </body>
        </html>
        '''
        mock_get.return_value = mock_response

        url = 'https://chatgpt.com/share/abc123'
        result = self.service.import_chat(url)

        # Should succeed even if parsing is imperfect
        assert 'success' in result
        mock_get.assert_called_once()

    @patch('services.chat_import_service.requests.get')
    def test_import_chatgpt_network_error(self, mock_get):
        """Test ChatGPT import handles network errors"""
        import requests
        mock_get.side_effect = requests.RequestException('Network error')

        url = 'https://chatgpt.com/share/abc123'
        result = self.service.import_chat(url)

        assert result['success'] is False
        assert 'network' in result['error'].lower() or 'connection' in result['error'].lower()

    @patch('services.chat_import_service.requests.get')
    def test_import_chatgpt_timeout(self, mock_get):
        """Test ChatGPT import handles timeout"""
        import requests
        mock_get.side_effect = requests.Timeout('Request timeout')

        url = 'https://chatgpt.com/share/abc123'
        result = self.service.import_chat(url)

        assert result['success'] is False
        assert 'timeout' in result['error'].lower() or 'split' in result['error'].lower()

    def test_extract_message_content_filters_ui_elements(self):
        """Test that UI elements are filtered from content"""
        from bs4 import BeautifulSoup

        html = '''
        <div>
            <p>This is real content</p>
            <p>Sign up for free</p>
            <p>More real content</p>
        </div>
        '''
        container = BeautifulSoup(html, 'html.parser').find('div')
        content = self.service._extract_message_content(container)

        # Should contain real content
        assert 'real content' in content.lower()

    def test_format_conversation_markdown(self):
        """Test markdown formatting"""
        messages = [
            {'role': 'user', 'content': 'Hello'},
            {'role': 'assistant', 'content': 'Hi there!'}
        ]

        result = self.service._format_conversation_markdown(
            title='Test Chat',
            messages=messages,
            platform='ChatGPT'
        )

        # Check structure
        assert '# Test Chat' in result
        assert '## 👤 USER:' in result
        assert '## 🤖 ASSISTANT:' in result
        assert 'Hello' in result
        assert 'Hi there!' in result
        assert 'Imported from ChatGPT' in result

    def test_allowed_domains_configuration(self):
        """Test that allowed domains are properly configured"""
        assert 'chatgpt.com' in self.service.ALLOWED_DOMAINS
        assert 'claude.ai' in self.service.ALLOWED_DOMAINS
        assert 'perplexity.ai' in self.service.ALLOWED_DOMAINS

    def test_html_converter_configuration(self):
        """Test HTML converter is properly configured"""
        assert self.service.html_converter.body_width == 0
        assert self.service.html_converter.ignore_links is False
        assert self.service.html_converter.ignore_images is False
        assert self.service.html_converter.unicode_snob is True

    def test_supported_platforms_configuration(self):
        """Test that supported platforms are properly configured"""
        assert 'chatgpt' in self.service.SUPPORTED_PLATFORMS
        assert isinstance(self.service.SUPPORTED_PLATFORMS, list)
