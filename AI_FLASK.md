# CLAUDE.md – Python Web Application

## General
- Follow **PEP8** and use **type hints**.
- Organize app into `app/` with `models/`, `routes/`, `services/`, `templates/`, `static/`.
- Use **Jinja2 templates** or React frontends – but keep JS/CSS in separate files.
- Add docstrings for public routes and services.

## Rules
- Never hardcode secrets → use `.env` + `python-decouple` or `pydantic.BaseSettings`.
- Separate **business logic from routes** (e.g., `services/`).
- Limit files to ~800 lines.

## Testing (MANDATORY)
- **REQUIRED**: Write tests for all new features and bug fixes BEFORE marking work as complete.
- Use `pytest` with Flask test client for backend testing.
- **Test coverage requirement**: Aim for 80%+ coverage on services and routes.
- **Test structure**:
  - `backend/tests/unit/` - Unit tests for all services (business logic)
  - `backend/tests/integration/` - Integration tests for all routes (API endpoints)
  - `backend/tests/fixtures/` - Test data and mock responses
  - Mock external APIs (OpenRouter, GitHub, BookStack, pandoc, etc.)
- **Test-Driven Development (TDD) strongly encouraged**: Write tests before or alongside implementation.
- **CI/CD**: All tests must pass before deployment.
- Add at least **smoke tests** for all routes.
- **When implementing features**:
  1. Write tests for the feature
  2. Implement the feature
  3. Verify all tests pass
  4. Check coverage reports

## Error Handling
- Centralize HTTP error handlers (e.g., `404`, `500`).
- Return JSON for API endpoints, HTML for web pages.

✅ Example:
@router.get("/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Fetch a user by ID."""
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user