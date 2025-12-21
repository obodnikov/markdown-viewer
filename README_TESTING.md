# Testing Guide for Markdown Viewer

## Overview

This document provides comprehensive testing guidance for the Markdown Viewer application, covering both backend (Python/Flask) and frontend (JavaScript/ES modules) testing.

## Table of Contents

- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [E2E Testing](#e2e-testing)
- [Running Tests](#running-tests)
- [Coverage Reports](#coverage-reports)
- [CI/CD Integration](#cicd-integration)
- [Writing New Tests](#writing-new-tests)

---

## Backend Testing

### Setup

1. **Install testing dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Testing dependencies included:**
   - `pytest` - Main testing framework
   - `pytest-flask` - Flask-specific test utilities
   - `pytest-cov` - Coverage reporting
   - `pytest-mock` - Mocking utilities
   - `responses` - HTTP request mocking

### Test Structure

```
backend/tests/
├── conftest.py                 # Shared fixtures and configuration
├── fixtures/
│   ├── sample.md              # Test markdown files
│   └── mock_responses.json    # Mock API responses
├── unit/
│   ├── test_config.py         # Configuration tests
│   ├── test_openrouter_service.py
│   ├── test_github_service.py
│   ├── test_bookstack_service.py
│   └── test_export_service.py
└── integration/
    ├── test_llm_routes.py
    ├── test_github_routes.py
    ├── test_bookstack_routes.py
    └── test_export_routes.py
```

### Running Backend Tests

```bash
# Run all tests
cd backend
pytest

# Run with coverage
pytest --cov=. --cov-report=html --cov-report=term

# Run specific test file
pytest tests/unit/test_openrouter_service.py

# Run specific test
pytest tests/unit/test_openrouter_service.py::TestOpenRouterService::test_transform_text_translate

# Run with verbose output
pytest -v

# Run only unit tests
pytest tests/unit/

# Run only integration tests
pytest tests/integration/
```

### Backend Test Coverage

Current test coverage targets:

- **Services (Unit Tests):** 80%+ coverage
  - OpenRouter service: LLM transformations, custom prompts, regex generation
  - GitHub service: OAuth, file operations, repository browsing
  - BookStack service: Authentication, CRUD operations, HTML conversion
  - Export service: Pandoc integration, format conversions

- **Routes (Integration Tests):** 80%+ coverage
  - LLM routes: All transformation operations
  - GitHub routes: OAuth flow, file management
  - BookStack routes: Full API integration
  - Export routes: All export formats

### Key Backend Test Patterns

#### Example: Service Unit Test
```python
@patch('services.openrouter.OpenAI')
def test_transform_text_translate(mock_openai, sample_markdown):
    """Test text transformation - translation."""
    mock_client = MagicMock()
    mock_openai.return_value = mock_client
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="Translated"))]
    mock_client.chat.completions.create.return_value = mock_response

    service = OpenRouterService()
    result = service.transform_text(
        content=sample_markdown,
        operation='translate',
        params={'target_language': 'Spanish'}
    )

    assert result == "Translated"
```

#### Example: Route Integration Test
```python
@patch('routes.llm.OpenRouterService')
def test_transform_endpoint_translate(mock_service, client, sample_markdown):
    """Test transform endpoint with translation."""
    mock_instance = MagicMock()
    mock_instance.transform_text.return_value = "# Documento de Prueba"
    mock_service.return_value = mock_instance

    response = client.post('/api/llm/transform', json={
        'operation': 'translate',
        'content': sample_markdown,
        'params': {'target_language': 'Spanish'}
    })

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['result'] == "# Documento de Prueba"
```

---

## Frontend Testing

### Setup

1. **Install testing dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Testing dependencies included:**
   - `vitest` - Fast unit test runner
   - `@testing-library/dom` - DOM testing utilities
   - `happy-dom` - Lightweight DOM environment
   - `@vitest/ui` - Visual test interface
   - `@vitest/coverage-v8` - Coverage reporting
   - `msw` - API mocking (Mock Service Worker)

### Test Structure

```
scripts/tests/
├── setup.js                   # Test environment setup
├── unit/
│   ├── utils/
│   │   ├── storage.test.js
│   │   ├── api.test.js
│   │   └── tokenizer.test.js
│   ├── transforms/
│   │   ├── newline-remover.test.js
│   │   ├── llm-client.test.js
│   │   └── find-replace.test.js
│   ├── editor/
│   │   ├── editor.test.js
│   │   └── sync.test.js
│   └── file/
│       ├── local.test.js
│       ├── export.test.js
│       ├── github.test.js
│       └── bookstack.test.js
└── integration/
    ├── app.test.js
    └── workflows.test.js
```

### Running Frontend Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Watch mode (re-run on changes)
npm run test:watch

# Run specific test file
npx vitest run scripts/tests/unit/utils/storage.test.js
```

### Frontend Test Coverage

Current test coverage targets:

- **Utilities:** 80%+ coverage
  - Storage: localStorage operations
  - API client: fetch wrappers
  - Tokenizer: GPT token counting

- **Transforms:** 70%+ coverage
  - Newline removal (3 modes)
  - LLM client integration
  - Find & replace logic

- **Editor:** 70%+ coverage
  - Content management
  - Scroll synchronization
  - View mode switching

- **File Operations:** 70%+ coverage
  - Local file handling
  - GitHub integration
  - BookStack integration
  - Export functionality

### Key Frontend Test Patterns

#### Example: Utility Test
```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Storage Utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save data to localStorage', () => {
    // Arrange: Create test data
    const testData = { title: 'Test', content: '# Test' };

    // Act: Save to localStorage
    localStorage.setItem('currentDocument', JSON.stringify(testData));

    // Assert: Verify data was saved correctly
    const stored = localStorage.getItem('currentDocument');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored)).toEqual(testData);
  });
});
```

#### Example: API Test with Mocking
```javascript
import { describe, it, expect, vi } from 'vitest';

describe('API Client', () => {
  it('should make POST request with JSON body', async () => {
    const requestBody = { content: 'test' };
    const mockResponse = { result: 'success' };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST'
    }));
  });
});
```

---

## E2E Testing

### Setup

E2E tests use Playwright to test complete user workflows.

```bash
# Install Playwright browsers
npx playwright install
```

### Test Structure

```
scripts/tests/e2e/
├── editor-workflow.spec.js      # Core editing functionality
├── export-workflow.spec.js      # Export operations
├── transform-workflow.spec.js   # LLM transformations
├── github-integration.spec.js   # GitHub OAuth and file ops
└── bookstack-integration.spec.js # BookStack integration
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (debug)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test scripts/tests/e2e/editor-workflow.spec.js

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### E2E Test Coverage

Critical user workflows:

1. **Editor Workflow:**
   - Load application
   - Type in editor and see preview
   - Switch view modes
   - Toggle dark mode
   - Create new document
   - Character/word counting

2. **Export Workflow:**
   - Open export dialog
   - Select format options
   - Export to MD/HTML/PDF/DOCX

3. **Transform Workflow:**
   - Open transform sidebar
   - Select transform operation
   - Choose model and language
   - Apply transformation

4. **GitHub Integration:**
   - OAuth authentication
   - Browse repositories
   - Open/save files

5. **BookStack Integration:**
   - Authenticate with tokens
   - Browse shelves/books/pages
   - Load/save pages
   - Handle conflicts

### Key E2E Test Patterns

#### Example: Editor Test
```javascript
import { test, expect } from '@playwright/test';

test.describe('Editor Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should type in editor and see preview', async ({ page }) => {
    const editor = page.locator('textarea').first();
    await editor.fill('# Hello World\n\nThis is a **test**.');

    await page.waitForTimeout(500);

    const preview = page.locator('.preview-pane, #preview');
    await expect(preview).toContainText('Hello World');
    await expect(preview).toContainText('test');
  });
});
```

---

## Coverage Reports

### Backend Coverage

After running tests with coverage:

```bash
cd backend
pytest --cov=. --cov-report=html
```

Open `backend/htmlcov/index.html` in a browser to view detailed coverage reports.

### Frontend Coverage

After running tests with coverage:

```bash
npm run test:coverage
```

Open `coverage/index.html` in a browser to view detailed coverage reports.

### Coverage Requirements

- **Minimum coverage:** 80% for services and critical routes
- **Target coverage:** 90%+ for new features
- **Excluded from coverage:**
  - Test files
  - Configuration files
  - Vendor/node_modules

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest --cov=. --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Writing New Tests

### Best Practices

1. **Follow AAA Pattern:**
   - **Arrange:** Set up test data and mocks
   - **Act:** Execute the code being tested
   - **Assert:** Verify the results

2. **Use Descriptive Names:**
   ```python
   def test_transform_text_translate_preserves_markdown_structure():
       # Clear what this test does
   ```

3. **One Assertion Per Test (when possible):**
   - Focus on testing one behavior
   - Makes failures easier to diagnose

4. **Mock External Dependencies:**
   - Mock API calls (OpenRouter, GitHub, BookStack)
   - Mock file system operations
   - Mock pandoc for export tests

5. **Use Fixtures:**
   - Reuse common test data
   - Keep tests DRY (Don't Repeat Yourself)

6. **Test Edge Cases:**
   - Empty strings
   - Large documents
   - Unicode characters
   - Missing parameters
   - API failures

### Adding a New Backend Test

1. **Create test file:**
   ```bash
   touch backend/tests/unit/test_new_service.py
   ```

2. **Write test:**
   ```python
   import pytest
   from unittest.mock import patch, MagicMock
   from services.new_service import NewService

   @pytest.fixture
   def new_service():
       return NewService()

   class TestNewService:
       def test_some_method(self, new_service):
           result = new_service.some_method('input')
           assert result == 'expected_output'
   ```

3. **Run test:**
   ```bash
   pytest backend/tests/unit/test_new_service.py
   ```

### Adding a New Frontend Test

1. **Create test file:**
   ```bash
   touch scripts/tests/unit/new-module.test.js
   ```

2. **Write test:**
   ```javascript
   import { describe, it, expect } from 'vitest';

   describe('New Module', () => {
     it('should do something', () => {
       // Test implementation
       expect(true).toBe(true);
     });
   });
   ```

3. **Run test:**
   ```bash
   npx vitest run scripts/tests/unit/new-module.test.js
   ```

### Adding a New E2E Test

1. **Create test file:**
   ```bash
   touch scripts/tests/e2e/new-workflow.spec.js
   ```

2. **Write test:**
   ```javascript
   import { test, expect } from '@playwright/test';

   test.describe('New Workflow', () => {
     test('should perform action', async ({ page }) => {
       await page.goto('/');
       // Test implementation
     });
   });
   ```

3. **Run test:**
   ```bash
   npx playwright test scripts/tests/e2e/new-workflow.spec.js
   ```

---

## Troubleshooting

### Backend Tests

**Issue:** `ModuleNotFoundError`
```bash
# Solution: Ensure backend directory is in Python path
cd backend
pytest
```

**Issue:** Mock not working
```bash
# Solution: Check import path in @patch decorator
@patch('routes.llm.OpenRouterService')  # Full path to where it's imported
```

### Frontend Tests

**Issue:** `ReferenceError: fetch is not defined`
```bash
# Solution: fetch is mocked in setup.js
# Verify setup.js is loaded in vitest.config.js
```

**Issue:** DOM elements not found
```bash
# Solution: Use appropriate selectors and wait for elements
await page.locator('selector').waitFor();
```

### E2E Tests

**Issue:** Test timeout
```bash
# Solution: Increase timeout in test or config
test('...', async ({ page }) => {
  await page.goto('/', { timeout: 30000 });
});
```

**Issue:** Servers not starting
```bash
# Solution: Check ports 8000 and 5050 are available
# Or use different ports in playwright.config.js
```

---

## Summary

- **Backend:** pytest with 80%+ coverage on services and routes
- **Frontend:** Vitest with 80%+ coverage on utilities and core modules
- **E2E:** Playwright testing critical user workflows
- **CI/CD:** Automated testing on every commit
- **Coverage:** Comprehensive reports for both backend and frontend

For questions or issues, refer to:
- [AI_FLASK.md](AI_FLASK.md) - Backend coding guidelines
- [AI.md](AI.md) - Frontend coding guidelines
- [CLAUDE.md](CLAUDE.md) - Project rules

---

**Last Updated:** 2025-12-21
**Test Coverage Target:** 80%+ for all critical code paths
