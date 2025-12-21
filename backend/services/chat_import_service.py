"""
Chat Import Service

Handles importing conversations from various chat platforms (ChatGPT, Claude, Perplexity).
Fetches shared conversation links and converts them to markdown format.
"""

import re
import requests
from bs4 import BeautifulSoup
import html2text
from datetime import datetime
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse
import ipaddress


class ChatImportService:
    """Service for importing chat conversations from various platforms."""

    # User agent to avoid bot detection by chat platforms
    # Uses a realistic browser string to access public share links
    USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

    # Timeout for HTTP requests (in seconds)
    # Allows sufficient time for large conversations while preventing indefinite hangs
    REQUEST_TIMEOUT = 30

    # Allowed domains for import (SSRF protection - security whitelist)
    # Only these exact domains (no subdomains) are permitted for URL validation
    # This prevents access to internal services, localhost, or arbitrary domains
    # Note: Not all allowed domains are fully supported yet (see SUPPORTED_PLATFORMS)
    ALLOWED_DOMAINS = {
        'chatgpt.com',           # OpenAI ChatGPT share links
        'claude.ai',             # Anthropic Claude share links (planned)
        'perplexity.ai',         # Perplexity search links (planned)
        'www.perplexity.ai'      # Alternative Perplexity domain
    }

    # Currently supported platforms for import
    # Platforms that have full implementation and testing
    SUPPORTED_PLATFORMS = ['chatgpt']  # Claude and Perplexity coming soon

    def __init__(self):
        """Initialize the chat import service."""
        self.html_converter = html2text.HTML2Text()
        self.html_converter.body_width = 0  # Don't wrap lines
        self.html_converter.ignore_links = False  # Preserve links
        self.html_converter.ignore_images = False  # Preserve images
        self.html_converter.ignore_emphasis = False  # Preserve bold/italic
        self.html_converter.unicode_snob = True  # Use unicode characters
        self.html_converter.skip_internal_links = True

    def _validate_url(self, url: str) -> Dict:
        """
        Validate URL for SSRF protection.

        Args:
            url: The URL to validate

        Returns:
            Dictionary with 'valid' boolean and optional 'error' message
        """
        try:
            # Parse URL
            parsed = urlparse(url)

            # Ensure scheme is HTTPS only (share links should be HTTPS for security)
            if parsed.scheme != 'https':
                return {
                    'valid': False,
                    'error': 'URL must use HTTPS protocol for security. HTTP is not allowed.'
                }

            # Validate hostname is in allowed domains (exact match, no subdomains)
            hostname = parsed.netloc.lower()
            if hostname not in self.ALLOWED_DOMAINS:
                return {
                    'valid': False,
                    'error': f'Domain not allowed. Supported domains: {", ".join(self.ALLOWED_DOMAINS)}'
                }

            # Additional check: prevent IP addresses (even if they somehow match domain)
            try:
                # If hostname is an IP address, reject it
                ipaddress.ip_address(hostname)
                return {
                    'valid': False,
                    'error': 'IP addresses are not allowed. Please use domain names.'
                }
            except ValueError:
                # Not an IP address, which is good
                pass

            return {'valid': True}

        except Exception as e:
            return {
                'valid': False,
                'error': f'Invalid URL format: {str(e)}'
            }

    def detect_platform(self, url: str) -> Optional[str]:
        """
        Detect which chat platform the URL belongs to.

        This method only parses the URL string - it does NOT make HTTP requests.
        Safe to call without prior URL validation.

        Args:
            url: The share URL

        Returns:
            Platform name ('chatgpt', 'claude', 'perplexity') or None if unknown
        """
        try:
            parsed = urlparse(url)
            hostname = parsed.netloc.lower()
            path = parsed.path.lower()

            # Match based on hostname and path structure
            if hostname == 'chatgpt.com' and '/share/' in path:
                return 'chatgpt'
            elif hostname == 'claude.ai' and '/share/' in path:
                return 'claude'
            elif hostname in ['perplexity.ai', 'www.perplexity.ai'] and '/search/' in path:
                return 'perplexity'

            return None
        except Exception:
            return None

    def import_chat(self, url: str) -> Dict:
        """
        Import a chat conversation from a share URL.

        This method validates the URL BEFORE making any HTTP requests to prevent SSRF attacks.

        Args:
            url: The share URL

        Returns:
            Dictionary with 'success', 'content', 'metadata' or 'error'
        """
        # Validate URL for SSRF protection (BEFORE any HTTP requests)
        validation = self._validate_url(url)
        if not validation['valid']:
            return {
                'success': False,
                'error': validation['error']
            }

        # Detect platform
        platform = self.detect_platform(url)

        if not platform:
            return {
                'success': False,
                'error': 'Invalid URL. Please provide a ChatGPT share link.'
            }

        if platform == 'chatgpt':
            return self._import_chatgpt(url)
        elif platform == 'claude':
            return {
                'success': False,
                'error': 'Claude import is not yet supported. Coming soon!'
            }
        elif platform == 'perplexity':
            return {
                'success': False,
                'error': 'Perplexity import is not yet supported. Coming soon!'
            }

        return {
            'success': False,
            'error': 'Unknown platform'
        }

    def _import_chatgpt(self, url: str) -> Dict:
        """
        Import a ChatGPT conversation.

        Args:
            url: ChatGPT share URL

        Returns:
            Dictionary with conversation data
        """
        try:
            # Fetch the page (disable redirects to prevent SSRF bypass)
            response = requests.get(
                url,
                headers={'User-Agent': self.USER_AGENT},
                timeout=self.REQUEST_TIMEOUT,
                allow_redirects=False  # Prevent redirect-based SSRF attacks
            )
            response.raise_for_status()

            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract conversation data
            title, messages = self._parse_chatgpt_html(soup)

            if not messages:
                return {
                    'success': False,
                    'error': 'No messages found. The share link may be invalid or expired.'
                }

            # Convert to markdown
            markdown_content = self._format_conversation_markdown(
                title=title,
                messages=messages,
                platform='ChatGPT'
            )

            return {
                'success': True,
                'content': markdown_content,
                'metadata': {
                    'title': title,
                    'platform': 'ChatGPT',
                    'message_count': len(messages),
                    'imported_at': datetime.now().isoformat()
                }
            }

        except requests.Timeout:
            return {
                'success': False,
                'error': 'Import timed out. Try splitting the conversation into smaller parts at chatgpt.com, then import each part separately.'
            }
        except requests.RequestException as e:
            return {
                'success': False,
                'error': f'Could not reach ChatGPT. Check your connection and try again. ({str(e)})'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Could not parse conversation. The share link may be invalid or expired. ({str(e)})'
            }

    def _parse_chatgpt_html(self, soup: BeautifulSoup) -> Tuple[str, list]:
        """
        Parse ChatGPT HTML to extract title and messages.

        Args:
            soup: BeautifulSoup object of the page

        Returns:
            Tuple of (title, messages_list)
        """
        # Try to extract title from meta tags or page title
        title = 'ChatGPT Conversation'

        # Try og:title meta tag first
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            title = og_title['content']
        else:
            # Try regular title tag
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text().strip()
                # Clean up "ChatGPT -" prefix if present
                title = re.sub(r'^ChatGPT\s*-\s*', '', title)

        messages = []

        # ChatGPT uses various container classes for messages
        # Try to find message containers (this may need updates if ChatGPT changes their HTML)
        message_containers = soup.find_all(['div', 'article'], class_=re.compile(r'(message|conversation-turn|group)'))

        for container in message_containers:
            # Try to determine if it's a user or assistant message
            role = self._detect_message_role(container)

            # Extract the message content
            content = self._extract_message_content(container)

            if content and role:
                messages.append({
                    'role': role,
                    'content': content
                })

        # If no messages found with the above method, try alternative parsing
        if not messages:
            messages = self._parse_chatgpt_alternative(soup)

        return title, messages

    def _detect_message_role(self, container) -> Optional[str]:
        """Detect if a message is from user or assistant based on HTML structure."""
        # Check for data attributes
        if container.get('data-role'):
            return container['data-role']

        # Check for class names
        classes = ' '.join(container.get('class', []))
        if 'user' in classes.lower():
            return 'user'
        elif 'assistant' in classes.lower() or 'gpt' in classes.lower():
            return 'assistant'

        # Check for nested elements that might indicate role
        if container.find(text=re.compile(r'(You|User)', re.IGNORECASE)):
            return 'user'

        return 'assistant'  # Default to assistant if uncertain

    def _extract_message_content(self, container) -> str:
        """Extract clean message content from a container element."""
        # Remove script and style tags
        for script in container.find_all(['script', 'style']):
            script.decompose()

        # Remove navigation/UI elements commonly found in ChatGPT
        ui_patterns = [
            'Attach', 'Search', 'Study', 'Create image', 'Voice',
            'By messaging ChatGPT', 'agree to our', 'Terms', 'Privacy',
            'Sign up', 'Log in', 'Start a new chat'
        ]

        # Get HTML content
        html_content = str(container)

        # Convert to markdown
        markdown = self.html_converter.handle(html_content)

        # Remove UI elements
        for pattern in ui_patterns:
            # Remove lines containing UI elements
            markdown = '\n'.join([
                line for line in markdown.split('\n')
                if pattern.lower() not in line.lower()
            ])

        # Clean up excessive whitespace
        markdown = re.sub(r'\n{3,}', '\n\n', markdown)
        markdown = markdown.strip()

        # Skip very short content (likely UI elements)
        if len(markdown) < 10:
            return ''

        return markdown

    def _parse_chatgpt_alternative(self, soup: BeautifulSoup) -> list:
        """Alternative parsing method for ChatGPT if primary method fails."""
        messages = []

        # Try to find any text content that looks like conversation
        # This is a fallback and may not be perfect
        all_paragraphs = soup.find_all(['p', 'div'])

        current_role = 'user'  # Start with user
        for p in all_paragraphs:
            text = p.get_text().strip()
            if len(text) > 10:  # Ignore very short snippets
                messages.append({
                    'role': current_role,
                    'content': text
                })
                # Alternate between user and assistant
                current_role = 'assistant' if current_role == 'user' else 'user'

        return messages

    def _format_conversation_markdown(self, title: str, messages: list, platform: str) -> str:
        """
        Format the conversation as markdown.

        Args:
            title: Conversation title
            messages: List of message dicts with 'role' and 'content'
            platform: Platform name (ChatGPT, Claude, etc.)

        Returns:
            Formatted markdown string
        """
        lines = []

        # Add title
        lines.append(f'# {title}')
        lines.append('')

        # Add metadata
        lines.append(f'*Imported from {platform} on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}*')
        lines.append('')
        lines.append('---')
        lines.append('')

        # Add messages
        for msg in messages:
            role = msg['role']
            content = msg['content']

            if role == 'user':
                lines.append('## 👤 USER:')
            else:
                lines.append('## 🤖 ASSISTANT:')

            lines.append(content)
            lines.append('')

        return '\n'.join(lines)
