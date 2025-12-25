"""BookStack API integration service."""
import logging
import time
import requests
import html2text
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class BookStackService:
    """Service for interacting with BookStack API."""

    def __init__(self, base_url: str, token_id: str, token_secret: str, timeout: int = 30):
        """
        Initialize BookStack service.

        Args:
            base_url: BookStack instance URL (e.g., https://bookstack.example.com)
            token_id: API token ID
            token_secret: API token secret
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.token_id = token_id
        self.token_secret = token_secret
        self.timeout = timeout

        logger.debug(f"BookStackService initialized | base_url={self.base_url} timeout={timeout}")

        # Configure html2text for markdown conversion
        self.html_converter = html2text.HTML2Text()
        self.html_converter.body_width = 0  # Don't wrap lines
        self.html_converter.ignore_links = False
        self.html_converter.ignore_images = False
        self.html_converter.ignore_emphasis = False
        self.html_converter.skip_internal_links = False
        self.html_converter.inline_links = True
        self.html_converter.protect_links = True
        self.html_converter.unicode_snob = True

    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers for API requests."""
        return {
            'Authorization': f'Token {self.token_id}:{self.token_secret}',
            'Content-Type': 'application/json'
        }

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make HTTP request to BookStack API.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (e.g., '/api/pages')
            **kwargs: Additional arguments for requests

        Returns:
            JSON response as dictionary

        Raises:
            requests.exceptions.HTTPError: On HTTP error
            requests.exceptions.RequestException: On request error
        """
        url = f'{self.base_url}{endpoint}'
        headers = self._get_headers()

        start_time = time.time()
        logger.debug(f"BookStack API request | method={method} endpoint={endpoint}")

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                timeout=self.timeout,
                **kwargs
            )
            elapsed = time.time() - start_time

            response.raise_for_status()

            logger.debug(f"BookStack API response | method={method} endpoint={endpoint} status_code={response.status_code} elapsed={elapsed:.2f}s")

            return response.json()

        except requests.exceptions.Timeout as e:
            elapsed = time.time() - start_time
            logger.error(f"BookStack API timeout | method={method} endpoint={endpoint} timeout={self.timeout}s elapsed={elapsed:.2f}s")
            raise
        except requests.exceptions.HTTPError as e:
            elapsed = time.time() - start_time
            logger.error(f"BookStack API HTTP error | method={method} endpoint={endpoint} status_code={e.response.status_code} elapsed={elapsed:.2f}s")
            raise
        except requests.exceptions.RequestException as e:
            elapsed = time.time() - start_time
            logger.error(f"BookStack API request error | method={method} endpoint={endpoint} elapsed={elapsed:.2f}s error={str(e)}")
            raise

    def authenticate(self) -> Dict[str, Any]:
        """
        Validate credentials by making a simple API request.

        Since BookStack API doesn't have a /api/users/me endpoint,
        we use /api/docs.json which requires only basic API access permission
        (no shelf/book/page-specific permissions needed).

        Returns:
            Authentication info with instance metadata

        Raises:
            requests.exceptions.HTTPError: If authentication fails
        """
        # Test authentication with the most basic endpoint that requires no special permissions
        # /api/docs.json only requires the basic "Access System API" permission
        result = self._request('GET', '/api/docs.json')

        # Extract instance info from docs endpoint
        instance_name = result.get('base_url', 'BookStack').split('//')[-1].split('/')[0]

        # Return a user-like structure for compatibility with existing code
        # that expects user info in session
        return {
            'authenticated': True,
            'message': 'Authentication successful',
            'name': f'User @ {instance_name}',  # Show instance to help identify which BookStack
            'instance': instance_name,
            'api_version': result.get('version', 'unknown')
        }

    def list_shelves(self, count: int = 100, offset: int = 0, sort: str = '+name') -> Dict[str, Any]:
        """
        List all shelves.

        Args:
            count: Number of results to return
            offset: Offset for pagination
            sort: Sort field (+/- for asc/desc, e.g., '+name', '-created_at')

        Returns:
            Dictionary with 'data' (list of shelves) and 'total' (count)
        """
        params = {
            'count': count,
            'offset': offset,
            'sort': sort
        }
        return self._request('GET', '/api/shelves', params=params)

    def get_shelf(self, shelf_id: int) -> Dict[str, Any]:
        """
        Get shelf details with books.

        Args:
            shelf_id: Shelf ID

        Returns:
            Shelf dictionary with books array
        """
        return self._request('GET', f'/api/shelves/{shelf_id}')

    def list_books(self, count: int = 100, offset: int = 0, sort: str = '+name',
                   shelf_id: Optional[int] = None) -> Dict[str, Any]:
        """
        List all books, optionally filtered by shelf.

        Args:
            count: Number of results to return
            offset: Offset for pagination
            sort: Sort field
            shelf_id: Optional shelf ID to filter by

        Returns:
            Dictionary with 'data' (list of books) and 'total' (count)
        """
        params = {
            'count': count,
            'offset': offset,
            'sort': sort
        }
        if shelf_id:
            params['filter[shelf_id]'] = shelf_id

        return self._request('GET', '/api/books', params=params)

    def get_book(self, book_id: int) -> Dict[str, Any]:
        """
        Get book details with chapters and pages.

        Args:
            book_id: Book ID

        Returns:
            Book dictionary with chapters and pages arrays
        """
        return self._request('GET', f'/api/books/{book_id}')

    def get_page(self, page_id: int) -> Dict[str, Any]:
        """
        Get page content and metadata.

        Strategy:
        1. Get page metadata (for id, name, updated_at, etc.)
        2. Try to get markdown using export endpoint (recommended)
        3. Fallback to HTML→Markdown conversion if export fails

        Args:
            page_id: Page ID

        Returns:
            Page dictionary with content (markdown or HTML)
        """
        # First, get page metadata (needed for all fields like id, name, updated_at, etc.)
        page = self._request('GET', f'/api/pages/{page_id}')

        # Try the recommended export/markdown endpoint first
        try:
            logger.debug(f"Attempting to fetch page using export/markdown endpoint | page_id={page_id}")

            markdown_content = self._export_markdown(page_id)

            if markdown_content and len(markdown_content.strip()) > 0:
                page['markdown'] = markdown_content
                logger.info(f"Successfully retrieved page via export/markdown endpoint | page_id={page_id} markdown_length={len(markdown_content)}")
                return page
            else:
                logger.warning(f"Export endpoint returned empty content | page_id={page_id}")

        except requests.exceptions.HTTPError as e:
            # Export endpoint might not be available or permission denied
            if e.response.status_code == 404:
                logger.info(f"Export endpoint not available (404) | page_id={page_id} - falling back to HTML conversion")
            elif e.response.status_code == 403:
                logger.warning(f"Export endpoint forbidden (403) | page_id={page_id} - falling back to HTML conversion")
            else:
                logger.warning(f"Export endpoint failed with status {e.response.status_code} | page_id={page_id} - falling back to HTML conversion")
        except Exception as e:
            logger.warning(f"Export endpoint failed | page_id={page_id} error={str(e)} - falling back to HTML conversion")

        # Fallback: Convert HTML to markdown if needed
        if page.get('html') and not page.get('markdown'):
            logger.info(f"Converting HTML to Markdown (fallback method) | page_id={page_id} html_length={len(page.get('html', ''))}")
            page['markdown'] = self.html_to_markdown(page['html'])
            logger.debug(f"HTML conversion complete | page_id={page_id} markdown_length={len(page.get('markdown', ''))}")

        return page

    def _export_markdown(self, page_id: int) -> str:
        """
        Export page as markdown using BookStack's export endpoint.

        The /export/markdown endpoint returns plain text (not JSON),
        so we need special handling.

        Args:
            page_id: Page ID

        Returns:
            Markdown content as string

        Raises:
            requests.exceptions.HTTPError: On HTTP error
            requests.exceptions.RequestException: On request error
        """
        # Use shared _request_raw helper to maintain consistency
        # with URL building, headers, timeout, and error handling
        endpoint = f'/api/pages/{page_id}/export/markdown'
        response_text = self._request_raw('GET', endpoint)
        return response_text

    def _request_raw(self, method: str, endpoint: str, **kwargs) -> str:
        """
        Make HTTP request to BookStack API and return raw text response.

        Similar to _request() but returns plain text instead of parsing JSON.
        Maintains identical structure and signature with _request() for consistency.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (e.g., '/api/pages/123/export/markdown')
            **kwargs: Additional arguments for requests

        Returns:
            Raw text response

        Raises:
            requests.exceptions.HTTPError: On HTTP error
            requests.exceptions.RequestException: On request error
        """
        url = f'{self.base_url}{endpoint}'
        headers = self._get_headers()

        start_time = time.time()
        logger.debug(f"BookStack API request (raw) | method={method} endpoint={endpoint}")

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                timeout=self.timeout,
                **kwargs
            )
            elapsed = time.time() - start_time

            response.raise_for_status()

            # Return raw text instead of JSON
            content = response.text

            logger.debug(f"BookStack API response (raw) | method={method} endpoint={endpoint} status_code={response.status_code} elapsed={elapsed:.2f}s content_length={len(content)}")

            return content

        except requests.exceptions.Timeout as e:
            elapsed = time.time() - start_time
            logger.error(f"BookStack API timeout (raw) | method={method} endpoint={endpoint} timeout={self.timeout}s elapsed={elapsed:.2f}s")
            raise
        except requests.exceptions.HTTPError as e:
            elapsed = time.time() - start_time
            logger.error(f"BookStack API HTTP error (raw) | method={method} endpoint={endpoint} status_code={e.response.status_code} elapsed={elapsed:.2f}s")
            raise
        except requests.exceptions.RequestException as e:
            elapsed = time.time() - start_time
            logger.error(f"BookStack API request error (raw) | method={method} endpoint={endpoint} elapsed={elapsed:.2f}s error={str(e)}")
            raise

    def create_page(self, book_id: int, name: str, markdown: str,
                   chapter_id: Optional[int] = None,
                   tags: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Create new page in BookStack.

        Args:
            book_id: ID of book to create page in
            name: Page name/title
            markdown: Page content in markdown
            chapter_id: Optional chapter ID
            tags: Optional list of tag dicts: [{"name": "tag1"}, ...]

        Returns:
            Created page dictionary
        """
        data = {
            'book_id': book_id,
            'name': name,
            'markdown': markdown
        }

        if chapter_id:
            data['chapter_id'] = chapter_id

        if tags:
            data['tags'] = tags

        return self._request('POST', '/api/pages', json=data)

    def update_page(self, page_id: int, markdown: str,
                   name: Optional[str] = None,
                   tags: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Update existing page.

        Args:
            page_id: Page ID to update
            markdown: Updated markdown content
            name: Optional updated page name
            tags: Optional updated tags

        Returns:
            Updated page dictionary
        """
        data = {
            'markdown': markdown
        }

        if name:
            data['name'] = name

        if tags:
            data['tags'] = tags

        return self._request('PUT', f'/api/pages/{page_id}', json=data)

    def delete_page(self, page_id: int) -> None:
        """
        Delete page.

        Args:
            page_id: Page ID to delete
        """
        self._request('DELETE', f'/api/pages/{page_id}')

    def html_to_markdown(self, html: str) -> str:
        """
        Convert HTML to markdown.

        Args:
            html: HTML content

        Returns:
            Markdown content
        """
        if not html:
            return ''

        try:
            markdown = self.html_converter.handle(html)
            logger.debug(f"HTML to Markdown conversion successful | input_length={len(html)} output_length={len(markdown)}")
            return markdown.strip()
        except Exception as e:
            # If conversion fails, return HTML as-is with warning
            logger.error(f"HTML to Markdown conversion failed | error={str(e)} html_length={len(html)}", exc_info=True)
            return f"<!-- HTML conversion failed: {str(e)} -->\n\n{html}"

    def search_pages(self, query: str, count: int = 20) -> Dict[str, Any]:
        """
        Search for pages.

        Args:
            query: Search query string
            count: Number of results to return

        Returns:
            Dictionary with 'data' (list of matching pages) and 'total' (count)
        """
        params = {
            'query': query,
            'count': count,
            'type': 'page'
        }
        return self._request('GET', '/api/search', params=params)
