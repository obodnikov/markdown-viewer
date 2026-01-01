"""
Unit tests for BookStack service.
"""
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from services.bookstack_service import BookStackService


@pytest.fixture
def bookstack_service():
    """Create BookStackService instance."""
    return BookStackService(
        base_url='https://test-bookstack.com',
        token_id='test-token-id',
        token_secret='test-token-secret'
    )


@pytest.fixture
def mock_requests():
    """Mock requests library."""
    with patch('services.bookstack_service.requests') as mock:
        yield mock


class TestBookStackService:
    """Test cases for BookStack service."""

    def test_init(self, bookstack_service):
        """Test service initialization."""
        assert bookstack_service.base_url == 'https://test-bookstack.com'
        assert bookstack_service.token_id == 'test-token-id'
        assert bookstack_service.token_secret == 'test-token-secret'

    def test_auth_header(self, bookstack_service):
        """Test authentication header generation."""
        headers = bookstack_service._get_headers()
        assert 'Authorization' in headers
        assert headers['Authorization'] == 'Token test-token-id:test-token-secret'

    @patch('services.bookstack_service.requests.get')
    def test_authenticate_success(self, mock_get, bookstack_service):
        """Test successful authentication."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'authenticated': True}
        mock_get.return_value = mock_response

        result = bookstack_service.authenticate()
        assert result is True

    @patch('services.bookstack_service.requests.get')
    def test_authenticate_failure(self, mock_get, bookstack_service):
        """Test failed authentication."""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_get.return_value = mock_response

        result = bookstack_service.authenticate()
        assert result is False

    @patch('services.bookstack_service.requests.get')
    def test_list_shelves(self, mock_get, bookstack_service):
        """Test listing shelves."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [
                {'id': 1, 'name': 'Shelf 1'},
                {'id': 2, 'name': 'Shelf 2'}
            ],
            'total': 2
        }
        mock_get.return_value = mock_response

        shelves = bookstack_service.list_shelves()
        assert len(shelves['data']) == 2
        assert shelves['total'] == 2

    @patch('services.bookstack_service.requests.get')
    def test_list_shelves_with_pagination(self, mock_get, bookstack_service):
        """Test listing shelves with pagination."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': [], 'total': 0}
        mock_get.return_value = mock_response

        bookstack_service.list_shelves(offset=10, count=5, sort='name')

        # Verify pagination parameters were passed
        call_args = mock_get.call_args
        assert 'offset=10' in call_args[0][0]
        assert 'count=5' in call_args[0][0]
        assert 'sort=name' in call_args[0][0]

    @patch('services.bookstack_service.requests.get')
    def test_get_shelf(self, mock_get, bookstack_service):
        """Test getting a specific shelf."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 1,
            'name': 'Test Shelf',
            'books': [{'id': 1, 'name': 'Book 1'}]
        }
        mock_get.return_value = mock_response

        shelf = bookstack_service.get_shelf(shelf_id=1)
        assert shelf['id'] == 1
        assert shelf['name'] == 'Test Shelf'
        assert len(shelf['books']) == 1

    @patch('services.bookstack_service.requests.get')
    def test_list_books(self, mock_get, bookstack_service):
        """Test listing books."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [{'id': 1, 'name': 'Book 1'}],
            'total': 1
        }
        mock_get.return_value = mock_response

        books = bookstack_service.list_books()
        assert len(books['data']) == 1

    @patch('services.bookstack_service.requests.get')
    def test_list_books_filtered_by_shelf(self, mock_get, bookstack_service):
        """Test listing books filtered by shelf."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [{'id': 1, 'name': 'Book 1'}],
            'total': 1
        }
        mock_get.return_value = mock_response

        bookstack_service.list_books(shelf_id=5)

        call_args = mock_get.call_args
        assert 'filter[shelf_id]=5' in call_args[0][0]

    @patch('services.bookstack_service.requests.get')
    def test_get_book(self, mock_get, bookstack_service):
        """Test getting a specific book."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 1,
            'name': 'Test Book',
            'contents': [
                {'type': 'chapter', 'id': 1, 'name': 'Chapter 1'},
                {'type': 'page', 'id': 1, 'name': 'Page 1'}
            ]
        }
        mock_get.return_value = mock_response

        book = bookstack_service.get_book(book_id=1)
        assert book['id'] == 1
        assert len(book['contents']) == 2

    @patch('services.bookstack_service.requests.get')
    def test_get_page(self, mock_get, bookstack_service):
        """Test getting a page."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 1,
            'name': 'Test Page',
            'html': '<h1>Test</h1><p>Content</p>',
            'markdown': '# Test\n\nContent',
            'updated_at': '2024-01-01 00:00:00'
        }
        mock_get.return_value = mock_response

        page = bookstack_service.get_page(page_id=1)
        assert page['id'] == 1
        assert page['name'] == 'Test Page'
        assert 'markdown' in page

    @patch('services.bookstack_service.requests.get')
    def test_get_page_html_conversion(self, mock_get, bookstack_service):
        """Test HTML to Markdown conversion when getting a page."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 1,
            'name': 'Test Page',
            'html': '<h1>Heading</h1><p>Paragraph text</p>',
            'updated_at': '2024-01-01 00:00:00'
        }
        mock_get.return_value = mock_response

        page = bookstack_service.get_page(page_id=1)
        # Should have markdown field from HTML conversion
        assert 'markdown' in page
        assert '# Heading' in page['markdown'] or 'Heading' in page['markdown']

    @patch('services.bookstack_service.requests.post')
    def test_create_page(self, mock_post, bookstack_service):
        """Test creating a new page."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 10,
            'name': 'New Page',
            'slug': 'new-page'
        }
        mock_post.return_value = mock_response

        result = bookstack_service.create_page(
            book_id=1,
            name='New Page',
            markdown='# Content'
        )

        assert result['id'] == 10
        assert result['name'] == 'New Page'

    @patch('services.bookstack_service.requests.post')
    def test_create_page_with_chapter(self, mock_post, bookstack_service):
        """Test creating a page in a chapter."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'id': 10}
        mock_post.return_value = mock_response

        bookstack_service.create_page(
            book_id=1,
            name='New Page',
            markdown='Content',
            chapter_id=5
        )

        call_args = mock_post.call_args
        data = call_args[1]['json']
        assert data['chapter_id'] == 5

    @patch('services.bookstack_service.requests.put')
    def test_update_page(self, mock_put, bookstack_service):
        """Test updating an existing page."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 1,
            'name': 'Updated Page',
            'updated_at': '2024-01-02 00:00:00'
        }
        mock_put.return_value = mock_response

        result = bookstack_service.update_page(
            page_id=1,
            markdown='# Updated content'
        )

        assert result['id'] == 1

    @patch('services.bookstack_service.requests.put')
    def test_update_page_with_name(self, mock_put, bookstack_service):
        """Test updating page with new name."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'id': 1}
        mock_put.return_value = mock_response

        bookstack_service.update_page(
            page_id=1,
            markdown='Content',
            name='New Name'
        )

        call_args = mock_put.call_args
        data = call_args[1]['json']
        assert data['name'] == 'New Name'

    @patch('services.bookstack_service.requests.delete')
    def test_delete_page(self, mock_delete, bookstack_service):
        """Test deleting a page."""
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response

        result = bookstack_service.delete_page(page_id=1)
        assert result is True

    @patch('services.bookstack_service.requests.get')
    def test_search_pages(self, mock_get, bookstack_service):
        """Test searching for pages."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [
                {'id': 1, 'name': 'Found Page 1'},
                {'id': 2, 'name': 'Found Page 2'}
            ],
            'total': 2
        }
        mock_get.return_value = mock_response

        results = bookstack_service.search_pages(query='test search')
        assert len(results['data']) == 2

    def test_html_to_markdown(self, bookstack_service):
        """Test HTML to Markdown conversion."""
        html = '<h1>Heading</h1><p>Paragraph with <strong>bold</strong> text.</p>'
        markdown = bookstack_service.html_to_markdown(html)

        assert '# Heading' in markdown or 'Heading' in markdown
        assert 'Paragraph' in markdown
        assert '**bold**' in markdown or 'bold' in markdown

    def test_html_to_markdown_with_lists(self, bookstack_service):
        """Test HTML to Markdown conversion with lists."""
        html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
        markdown = bookstack_service.html_to_markdown(html)

        assert 'Item 1' in markdown
        assert 'Item 2' in markdown

    @patch('services.bookstack_service.requests.get')
    def test_timeout_handling(self, mock_get, bookstack_service):
        """Test timeout handling."""
        mock_get.side_effect = Exception("Timeout")

        with pytest.raises(Exception, match="Timeout"):
            bookstack_service.list_shelves()

    @patch('services.bookstack_service.requests.get')
    def test_unauthorized_error(self, mock_get, bookstack_service):
        """Test handling of unauthorized errors."""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = Exception("Unauthorized")
        mock_get.return_value = mock_response

        with pytest.raises(Exception):
            bookstack_service.list_shelves()

    @patch('services.bookstack_service.requests.request')
    def test_list_shelves_with_details_basic(self, mock_request, bookstack_service):
        """Test list_shelves_with_details with basic data."""
        # Mock responses for the method's multiple API calls
        responses = [
            # First call: list_shelves
            MagicMock(status_code=200, json=lambda: {
                'data': [
                    {'id': 1, 'name': 'Shelf 1'},
                    {'id': 2, 'name': 'Shelf 2'}
                ],
                'total': 2
            }),
            # Second call: list_books (first page)
            MagicMock(status_code=200, json=lambda: {
                'data': [
                    {'id': 10, 'name': 'Book 1'},
                    {'id': 20, 'name': 'Book 2'},
                    {'id': 30, 'name': 'Book 3'}
                ],
                'total': 3
            }),
            # Third call: get_shelf(1)
            MagicMock(status_code=200, json=lambda: {
                'id': 1,
                'name': 'Shelf 1',
                'books': [{'id': 10, 'name': 'Book 1'}]
            }),
            # Fourth call: get_shelf(2)
            MagicMock(status_code=200, json=lambda: {
                'id': 2,
                'name': 'Shelf 2',
                'books': [{'id': 20, 'name': 'Book 2'}]
            })
        ]
        mock_request.side_effect = responses

        result = bookstack_service.list_shelves_with_details()

        # Verify results
        assert len(result['shelves']) == 2
        assert result['shelves'][0]['book_count'] == 1
        assert result['shelves'][1]['book_count'] == 1
        assert len(result['unshelved_books']) == 1  # Book 3 is not in any shelf
        assert result['unshelved_books'][0]['id'] == 30
        assert result['total_shelves'] == 2
        assert result['total_books'] == 3
        assert result['metadata']['failed_shelf_details'] == 0
        assert result['metadata']['books_pagination_incomplete'] is False

    @patch('services.bookstack_service.requests.request')
    def test_list_shelves_with_details_pagination(self, mock_request, bookstack_service):
        """Test list_shelves_with_details handles book pagination correctly."""
        responses = [
            # list_shelves
            MagicMock(status_code=200, json=lambda: {
                'data': [{'id': 1, 'name': 'Shelf 1'}],
                'total': 1
            }),
            # list_books - first page (100 books)
            MagicMock(status_code=200, json=lambda: {
                'data': [{'id': i, 'name': f'Book {i}'} for i in range(1, 101)],
                'total': 150
            }),
            # list_books - second page (50 books)
            MagicMock(status_code=200, json=lambda: {
                'data': [{'id': i, 'name': f'Book {i}'} for i in range(101, 151)],
                'total': 150
            }),
            # get_shelf(1)
            MagicMock(status_code=200, json=lambda: {
                'id': 1,
                'books': [{'id': i} for i in range(1, 51)]
            })
        ]
        mock_request.side_effect = responses

        result = bookstack_service.list_shelves_with_details()

        # Should have fetched all 150 books across 2 pages
        assert result['total_books'] == 150
        # 50 books in shelf, 100 unshelved
        assert len(result['unshelved_books']) == 100

    @patch('services.bookstack_service.requests.request')
    def test_list_shelves_with_details_empty_shelves(self, mock_request, bookstack_service):
        """Test list_shelves_with_details with empty shelves."""
        responses = [
            MagicMock(status_code=200, json=lambda: {'data': [], 'total': 0}),  # No shelves
            MagicMock(status_code=200, json=lambda: {  # But some books exist
                'data': [{'id': 1, 'name': 'Book 1'}],
                'total': 1
            })
        ]
        mock_request.side_effect = responses

        result = bookstack_service.list_shelves_with_details()

        assert len(result['shelves']) == 0
        assert len(result['unshelved_books']) == 1
        assert result['total_shelves'] == 0
        assert result['total_books'] == 1

    @patch('services.bookstack_service.requests.request')
    def test_list_shelves_with_details_shelf_fetch_failure(self, mock_request, bookstack_service):
        """Test list_shelves_with_details handles shelf detail fetch failures gracefully."""
        responses = [
            # list_shelves
            MagicMock(status_code=200, json=lambda: {
                'data': [
                    {'id': 1, 'name': 'Shelf 1'},
                    {'id': 2, 'name': 'Shelf 2'}
                ],
                'total': 2
            }),
            # list_books
            MagicMock(status_code=200, json=lambda: {
                'data': [{'id': 10, 'name': 'Book 1'}],
                'total': 1
            }),
            # get_shelf(1) - succeeds
            MagicMock(status_code=200, json=lambda: {
                'id': 1,
                'books': [{'id': 10}]
            }),
            # get_shelf(2) - fails
            MagicMock(status_code=500, raise_for_status=Mock(side_effect=Exception("Server error")))
        ]
        mock_request.side_effect = responses

        result = bookstack_service.list_shelves_with_details()

        # Should still return both shelves, with failed one having 0 books
        assert len(result['shelves']) == 2
        assert result['shelves'][0]['book_count'] == 1
        assert result['shelves'][1]['book_count'] == 0
        assert result['shelves'][1]['book_ids'] == []
        # Metadata should track the failure
        assert result['metadata']['failed_shelf_details'] == 1

    @patch('services.bookstack_service.requests.request')
    def test_list_shelves_with_details_all_books_shelved(self, mock_request, bookstack_service):
        """Test list_shelves_with_details when all books are in shelves."""
        responses = [
            # list_shelves
            MagicMock(status_code=200, json=lambda: {
                'data': [{'id': 1, 'name': 'Shelf 1'}],
                'total': 1
            }),
            # list_books
            MagicMock(status_code=200, json=lambda: {
                'data': [
                    {'id': 10, 'name': 'Book 1'},
                    {'id': 20, 'name': 'Book 2'}
                ],
                'total': 2
            }),
            # get_shelf(1) - contains all books
            MagicMock(status_code=200, json=lambda: {
                'id': 1,
                'books': [
                    {'id': 10, 'name': 'Book 1'},
                    {'id': 20, 'name': 'Book 2'}
                ]
            })
        ]
        mock_request.side_effect = responses

        result = bookstack_service.list_shelves_with_details()

        assert len(result['unshelved_books']) == 0
        assert result['shelves'][0]['book_count'] == 2
