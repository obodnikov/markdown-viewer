"""
Integration tests for BookStack routes.
"""
import pytest
import json
from unittest.mock import patch, MagicMock


class TestBookStackRoutes:
    """Test cases for BookStack API routes."""

    @patch('routes.bookstack.BookStackService')
    def test_authenticate(self, mock_service, client):
        """Test BookStack authentication."""
        mock_instance = MagicMock()
        mock_instance.authenticate.return_value = True
        mock_service.return_value = mock_instance

        response = client.post('/api/bookstack/authenticate', json={
            'token_id': 'test-id',
            'token_secret': 'test-secret'
        })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['authenticated'] is True

    def test_authenticate_missing_credentials(self, client):
        """Test authentication with missing credentials."""
        response = client.post('/api/bookstack/authenticate', json={
            'token_id': 'test-id'
        })

        assert response.status_code == 400

    def test_status_not_authenticated(self, client):
        """Test status check when not authenticated."""
        response = client.get('/api/bookstack/status')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['authenticated'] is False

    def test_status_authenticated(self, client):
        """Test status check when authenticated."""
        with client.session_transaction() as sess:
            sess['bookstack_token_id'] = 'test-id'
            sess['bookstack_token_secret'] = 'test-secret'

        response = client.get('/api/bookstack/status')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['authenticated'] is True

    @patch('routes.bookstack.BookStackService')
    def test_list_shelves(self, mock_service, client):
        """Test listing shelves."""
        with client.session_transaction() as sess:
            sess['bookstack_token_id'] = 'test-id'
            sess['bookstack_token_secret'] = 'test-secret'

        mock_instance = MagicMock()
        mock_instance.list_shelves.return_value = {
            'data': [{'id': 1, 'name': 'Shelf 1'}],
            'total': 1
        }
        mock_service.return_value = mock_instance

        response = client.get('/api/bookstack/shelves')
        assert response.status_code == 200

    @patch('routes.bookstack.BookStackService')
    def test_get_shelf(self, mock_service, client):
        """Test getting shelf details."""
        with client.session_transaction() as sess:
            sess['bookstack_token_id'] = 'test-id'
            sess['bookstack_token_secret'] = 'test-secret'

        mock_instance = MagicMock()
        mock_instance.get_shelf.return_value = {'id': 1, 'name': 'Shelf'}
        mock_service.return_value = mock_instance

        response = client.get('/api/bookstack/shelves/1')
        assert response.status_code == 200

    @patch('routes.bookstack.BookStackService')
    def test_get_page(self, mock_service, client):
        """Test getting page content."""
        with client.session_transaction() as sess:
            sess['bookstack_token_id'] = 'test-id'
            sess['bookstack_token_secret'] = 'test-secret'

        mock_instance = MagicMock()
        mock_instance.get_page.return_value = {
            'id': 1,
            'markdown': '# Page',
            'updated_at': '2024-01-01'
        }
        mock_service.return_value = mock_instance

        response = client.get('/api/bookstack/pages/1')
        assert response.status_code == 200

    @patch('routes.bookstack.BookStackService')
    def test_create_page(self, mock_service, client):
        """Test creating a new page."""
        with client.session_transaction() as sess:
            sess['bookstack_token_id'] = 'test-id'
            sess['bookstack_token_secret'] = 'test-secret'

        mock_instance = MagicMock()
        mock_instance.create_page.return_value = {'id': 10, 'name': 'New Page'}
        mock_service.return_value = mock_instance

        response = client.post('/api/bookstack/pages', json={
            'book_id': 1,
            'name': 'New Page',
            'markdown': '# Content'
        })

        assert response.status_code == 200

    @patch('routes.bookstack.BookStackService')
    def test_update_page(self, mock_service, client):
        """Test updating a page."""
        with client.session_transaction() as sess:
            sess['bookstack_token_id'] = 'test-id'
            sess['bookstack_token_secret'] = 'test-secret'

        mock_instance = MagicMock()
        mock_instance.update_page.return_value = {'id': 1, 'updated_at': '2024-01-02'}
        mock_service.return_value = mock_instance

        response = client.put('/api/bookstack/pages/1', json={
            'markdown': '# Updated'
        })

        assert response.status_code == 200

    @patch('routes.bookstack.BookStackService')
    def test_delete_page(self, mock_service, client):
        """Test deleting a page."""
        with client.session_transaction() as sess:
            sess['bookstack_token_id'] = 'test-id'
            sess['bookstack_token_secret'] = 'test-secret'

        mock_instance = MagicMock()
        mock_instance.delete_page.return_value = True
        mock_service.return_value = mock_instance

        response = client.delete('/api/bookstack/pages/1')
        assert response.status_code == 200

    def test_logout(self, client):
        """Test BookStack logout."""
        with client.session_transaction() as sess:
            sess['bookstack_token_id'] = 'test-id'
            sess['bookstack_token_secret'] = 'test-secret'

        response = client.post('/api/bookstack/logout')
        assert response.status_code == 200

        with client.session_transaction() as sess:
            assert 'bookstack_token_id' not in sess
