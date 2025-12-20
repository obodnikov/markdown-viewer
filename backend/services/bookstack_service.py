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
        we use /api/shelves as a lightweight authentication test.

        Returns:
            Success indicator with basic info

        Raises:
            requests.exceptions.HTTPError: If authentication fails
        """
        # Test authentication with a simple shelves request
        result = self._request('GET', '/api/shelves', params={'count': 1})

        # Return a simplified response indicating successful authentication
        return {
            'authenticated': True,
            'message': 'Authentication successful'
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

        Args:
            page_id: Page ID

        Returns:
            Page dictionary with content (markdown or HTML)
        """
        page = self._request('GET', f'/api/pages/{page_id}')

        # Convert HTML to markdown if needed
        if page.get('html') and not page.get('markdown'):
            logger.info(f"Converting HTML to Markdown | page_id={page_id} html_length={len(page.get('html', ''))}")
            page['markdown'] = self.html_to_markdown(page['html'])
            logger.debug(f"HTML conversion complete | page_id={page_id} markdown_length={len(page.get('markdown', ''))}")

        return page

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
