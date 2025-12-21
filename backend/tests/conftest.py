"""
Pytest configuration and shared fixtures for backend tests.
"""
import os
import sys
import pytest
from unittest.mock import MagicMock

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from config import Config


class TestConfig(Config):
    """Test configuration class."""
    TESTING = True
    DEBUG = True
    SECRET_KEY = 'test-secret-key'
    OPENROUTER_API_KEY = 'test-api-key'
    GITHUB_CLIENT_ID = 'test-github-client-id'
    GITHUB_CLIENT_SECRET = 'test-github-client-secret'
    BOOKSTACK_URL = 'https://test-bookstack.com'
    CORS_ORIGINS = ['http://localhost:8000', 'http://127.0.0.1:8000']


@pytest.fixture
def app():
    """Create and configure a test Flask application instance."""
    app = create_app(TestConfig)
    app.config['TESTING'] = True
    yield app


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def mock_session():
    """Create a mock session for testing session-based authentication."""
    return {}


@pytest.fixture
def sample_markdown():
    """Sample markdown content for testing."""
    return """# Test Document

This is a **test** document with *markdown* formatting.

## Features
- Item 1
- Item 2
- Item 3

```python
def hello():
    print("Hello, World!")
```

> This is a blockquote.
"""


@pytest.fixture
def sample_html():
    """Sample HTML content for testing BookStack conversion."""
    return """<h1>Test Document</h1>
<p>This is a <strong>test</strong> document with <em>HTML</em> formatting.</p>
<ul>
<li>Item 1</li>
<li>Item 2</li>
<li>Item 3</li>
</ul>
"""


@pytest.fixture
def mock_openrouter_response():
    """Mock OpenRouter API response."""
    return {
        "choices": [{
            "message": {
                "content": "Translated content here"
            }
        }],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30
        }
    }


@pytest.fixture
def mock_github_user():
    """Mock GitHub user data."""
    return {
        "login": "testuser",
        "id": 12345,
        "name": "Test User",
        "email": "test@example.com",
        "avatar_url": "https://example.com/avatar.jpg"
    }


@pytest.fixture
def mock_github_repo():
    """Mock GitHub repository data."""
    return {
        "id": 123,
        "name": "test-repo",
        "full_name": "testuser/test-repo",
        "description": "Test repository",
        "private": False,
        "updated_at": "2024-01-01T00:00:00Z"
    }


@pytest.fixture
def mock_bookstack_shelf():
    """Mock BookStack shelf data."""
    return {
        "id": 1,
        "name": "Test Shelf",
        "slug": "test-shelf",
        "description": "Test shelf description",
        "created_at": "2024-01-01 00:00:00",
        "updated_at": "2024-01-01 00:00:00"
    }


@pytest.fixture
def mock_bookstack_book():
    """Mock BookStack book data."""
    return {
        "id": 1,
        "name": "Test Book",
        "slug": "test-book",
        "description": "Test book description",
        "created_at": "2024-01-01 00:00:00",
        "updated_at": "2024-01-01 00:00:00"
    }


@pytest.fixture
def mock_bookstack_page():
    """Mock BookStack page data."""
    return {
        "id": 1,
        "name": "Test Page",
        "slug": "test-page",
        "html": "<h1>Test</h1><p>Content</p>",
        "markdown": "# Test\n\nContent",
        "book_id": 1,
        "chapter_id": None,
        "created_at": "2024-01-01 00:00:00",
        "updated_at": "2024-01-01 00:00:00"
    }
