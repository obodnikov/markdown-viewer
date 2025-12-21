"""
Unit tests for GitHub service.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from services.github_service import GitHubService


@pytest.fixture
def github_service():
    """Create GitHubService instance with mock token."""
    return GitHubService(access_token='test-token-12345')


@pytest.fixture
def mock_github():
    """Mock PyGithub client."""
    with patch('services.github_service.Github') as mock:
        yield mock


class TestGitHubService:
    """Test cases for GitHub service."""

    def test_init(self, github_service):
        """Test service initialization."""
        assert github_service.access_token == 'test-token-12345'

    @patch('services.github_service.Github')
    def test_get_user_info(self, mock_github):
        """Test getting authenticated user info."""
        # Setup mock
        mock_client = MagicMock()
        mock_github.return_value = mock_client
        mock_user = MagicMock()
        mock_user.login = 'testuser'
        mock_user.id = 12345
        mock_user.name = 'Test User'
        mock_user.email = 'test@example.com'
        mock_user.avatar_url = 'https://example.com/avatar.jpg'
        mock_client.get_user.return_value = mock_user

        service = GitHubService(access_token='test-token')
        user_info = service.get_user_info()

        assert user_info['login'] == 'testuser'
        assert user_info['id'] == 12345
        assert user_info['name'] == 'Test User'
        assert user_info['email'] == 'test@example.com'

    @patch('services.github_service.Github')
    def test_list_repositories(self, mock_github):
        """Test listing user repositories."""
        mock_client = MagicMock()
        mock_github.return_value = mock_client
        mock_user = MagicMock()

        # Create mock repos
        mock_repo1 = MagicMock()
        mock_repo1.id = 1
        mock_repo1.name = 'repo1'
        mock_repo1.full_name = 'testuser/repo1'
        mock_repo1.description = 'Test repo 1'
        mock_repo1.private = False
        mock_repo1.updated_at = '2024-01-01T00:00:00Z'

        mock_repo2 = MagicMock()
        mock_repo2.id = 2
        mock_repo2.name = 'repo2'
        mock_repo2.full_name = 'testuser/repo2'
        mock_repo2.description = 'Test repo 2'
        mock_repo2.private = True
        mock_repo2.updated_at = '2024-01-02T00:00:00Z'

        mock_user.get_repos.return_value = [mock_repo1, mock_repo2]
        mock_client.get_user.return_value = mock_user

        service = GitHubService(access_token='test-token')
        repos = service.list_repositories(sort='updated')

        assert len(repos) == 2
        assert repos[0]['name'] == 'repo1'
        assert repos[1]['name'] == 'repo2'
        assert repos[1]['private'] is True

    @patch('services.github_service.Github')
    def test_list_markdown_files(self, mock_github):
        """Test listing markdown files in repository."""
        mock_client = MagicMock()
        mock_github.return_value = mock_client
        mock_repo = MagicMock()

        # Create mock contents
        mock_file1 = MagicMock()
        mock_file1.type = 'file'
        mock_file1.name = 'README.md'
        mock_file1.path = 'README.md'
        mock_file1.size = 1234

        mock_file2 = MagicMock()
        mock_file2.type = 'file'
        mock_file2.name = 'doc.markdown'
        mock_file2.path = 'docs/doc.markdown'
        mock_file2.size = 5678

        mock_file3 = MagicMock()
        mock_file3.type = 'file'
        mock_file3.name = 'script.py'
        mock_file3.path = 'script.py'
        mock_file3.size = 999

        mock_dir = MagicMock()
        mock_dir.type = 'dir'
        mock_dir.name = 'docs'
        mock_dir.path = 'docs'

        mock_repo.get_contents.return_value = [mock_file1, mock_file2, mock_file3, mock_dir]
        mock_client.get_repo.return_value = mock_repo

        service = GitHubService(access_token='test-token')
        files = service.list_markdown_files(repo='testuser/repo', path='')

        # Should only return markdown files (.md, .markdown)
        assert len(files) == 2
        assert any(f['name'] == 'README.md' for f in files)
        assert any(f['name'] == 'doc.markdown' for f in files)
        assert not any(f['name'] == 'script.py' for f in files)

    @patch('services.github_service.Github')
    def test_get_file_content(self, mock_github):
        """Test getting file content."""
        mock_client = MagicMock()
        mock_github.return_value = mock_client
        mock_repo = MagicMock()
        mock_file = MagicMock()
        mock_file.decoded_content = b'# Test\n\nContent here'
        mock_file.sha = 'abc123'

        mock_repo.get_contents.return_value = mock_file
        mock_client.get_repo.return_value = mock_repo

        service = GitHubService(access_token='test-token')
        content, sha = service.get_file_content(repo='testuser/repo', path='README.md')

        assert content == '# Test\n\nContent here'
        assert sha == 'abc123'

    @patch('services.github_service.Github')
    def test_save_file_create_new(self, mock_github):
        """Test creating a new file."""
        mock_client = MagicMock()
        mock_github.return_value = mock_client
        mock_repo = MagicMock()
        mock_result = {'commit': MagicMock(sha='new123')}

        mock_repo.create_file.return_value = mock_result
        mock_client.get_repo.return_value = mock_repo

        service = GitHubService(access_token='test-token')
        result = service.save_file(
            repo='testuser/repo',
            path='new-file.md',
            content='# New File',
            message='Create new file',
            sha=None
        )

        assert 'commit' in result
        mock_repo.create_file.assert_called_once()

    @patch('services.github_service.Github')
    def test_save_file_update_existing(self, mock_github):
        """Test updating an existing file."""
        mock_client = MagicMock()
        mock_github.return_value = mock_client
        mock_repo = MagicMock()
        mock_result = {'commit': MagicMock(sha='update123')}

        mock_repo.update_file.return_value = mock_result
        mock_client.get_repo.return_value = mock_repo

        service = GitHubService(access_token='test-token')
        result = service.save_file(
            repo='testuser/repo',
            path='existing.md',
            content='# Updated',
            message='Update file',
            sha='old123'
        )

        assert 'commit' in result
        mock_repo.update_file.assert_called_once()

    @patch('services.github_service.Github')
    def test_save_file_with_branch(self, mock_github):
        """Test saving file to specific branch."""
        mock_client = MagicMock()
        mock_github.return_value = mock_client
        mock_repo = MagicMock()
        mock_result = {'commit': MagicMock(sha='branch123')}

        mock_repo.create_file.return_value = mock_result
        mock_client.get_repo.return_value = mock_repo

        service = GitHubService(access_token='test-token')
        result = service.save_file(
            repo='testuser/repo',
            path='file.md',
            content='Content',
            message='Commit message',
            sha=None,
            branch='feature-branch'
        )

        # Verify branch parameter was passed
        call_args = mock_repo.create_file.call_args
        assert call_args[1]['branch'] == 'feature-branch'

    @patch('services.github_service.Github')
    def test_error_handling_invalid_token(self, mock_github):
        """Test error handling for invalid token."""
        mock_github.side_effect = Exception("Bad credentials")

        with pytest.raises(Exception, match="Bad credentials"):
            service = GitHubService(access_token='invalid-token')
            service.get_user_info()

    @patch('services.github_service.Github')
    def test_error_handling_repo_not_found(self, mock_github):
        """Test error handling for repository not found."""
        mock_client = MagicMock()
        mock_github.return_value = mock_client
        mock_client.get_repo.side_effect = Exception("Not Found")

        service = GitHubService(access_token='test-token')
        with pytest.raises(Exception, match="Not Found"):
            service.list_markdown_files(repo='nonexistent/repo', path='')

    @patch('services.github_service.Github')
    def test_list_txt_files_included(self, mock_github):
        """Test that .txt files are included in markdown file listing."""
        mock_client = MagicMock()
        mock_github.return_value = mock_client
        mock_repo = MagicMock()

        mock_txt_file = MagicMock()
        mock_txt_file.type = 'file'
        mock_txt_file.name = 'notes.txt'
        mock_txt_file.path = 'notes.txt'
        mock_txt_file.size = 100

        mock_repo.get_contents.return_value = [mock_txt_file]
        mock_client.get_repo.return_value = mock_repo

        service = GitHubService(access_token='test-token')
        files = service.list_markdown_files(repo='testuser/repo', path='')

        assert len(files) == 1
        assert files[0]['name'] == 'notes.txt'
