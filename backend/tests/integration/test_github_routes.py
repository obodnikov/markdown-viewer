"""
Integration tests for GitHub routes.
"""
import pytest
import json
from unittest.mock import patch, MagicMock


class TestGitHubRoutes:
    """Test cases for GitHub API routes."""

    def test_auth_redirect(self, client):
        """Test GitHub OAuth initiation."""
        response = client.get('/api/github/auth')
        assert response.status_code == 302  # Redirect
        assert 'github.com' in response.location

    @patch('routes.github.GitHubService')
    def test_get_user_authenticated(self, mock_service, client):
        """Test getting authenticated user."""
        with client.session_transaction() as sess:
            sess['github_token'] = 'test-token'

        mock_instance = MagicMock()
        mock_instance.get_user_info.return_value = {
            'login': 'testuser',
            'name': 'Test User'
        }
        mock_service.return_value = mock_instance

        response = client.get('/api/github/user')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['login'] == 'testuser'

    def test_get_user_not_authenticated(self, client):
        """Test getting user without authentication."""
        response = client.get('/api/github/user')
        assert response.status_code == 401

    @patch('routes.github.GitHubService')
    def test_list_repos(self, mock_service, client):
        """Test listing repositories."""
        with client.session_transaction() as sess:
            sess['github_token'] = 'test-token'

        mock_instance = MagicMock()
        mock_instance.list_repositories.return_value = [
            {'name': 'repo1', 'full_name': 'user/repo1'}
        ]
        mock_service.return_value = mock_instance

        response = client.get('/api/github/repos')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'repos' in data

    @patch('routes.github.GitHubService')
    def test_list_files(self, mock_service, client):
        """Test listing files in repository."""
        with client.session_transaction() as sess:
            sess['github_token'] = 'test-token'

        mock_instance = MagicMock()
        mock_instance.list_markdown_files.return_value = [
            {'name': 'README.md', 'path': 'README.md'}
        ]
        mock_service.return_value = mock_instance

        response = client.get('/api/github/files?repo=user/repo&path=')
        assert response.status_code == 200

    @patch('routes.github.GitHubService')
    def test_get_file(self, mock_service, client):
        """Test getting file content."""
        with client.session_transaction() as sess:
            sess['github_token'] = 'test-token'

        mock_instance = MagicMock()
        mock_instance.get_file_content.return_value = ('# Content', 'sha123')
        mock_service.return_value = mock_instance

        response = client.get('/api/github/file?repo=user/repo&path=README.md')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'content' in data
        assert 'sha' in data

    @patch('routes.github.GitHubService')
    def test_save_file(self, mock_service, client):
        """Test saving file to repository."""
        with client.session_transaction() as sess:
            sess['github_token'] = 'test-token'

        mock_instance = MagicMock()
        mock_instance.save_file.return_value = {'commit': {'sha': 'new123'}}
        mock_service.return_value = mock_instance

        response = client.post('/api/github/file', json={
            'repo': 'user/repo',
            'path': 'test.md',
            'content': '# Test',
            'message': 'Update test.md'
        })

        assert response.status_code == 200

    def test_logout(self, client):
        """Test GitHub logout."""
        with client.session_transaction() as sess:
            sess['github_token'] = 'test-token'

        response = client.post('/api/github/logout')
        assert response.status_code == 200

        with client.session_transaction() as sess:
            assert 'github_token' not in sess
