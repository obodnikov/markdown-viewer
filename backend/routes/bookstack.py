"""BookStack integration routes."""
from flask import Blueprint, request, jsonify, session
from services.bookstack_service import BookStackService
from config import Config
import requests


bookstack_bp = Blueprint('bookstack', __name__, url_prefix='/api/bookstack')


def get_bookstack_service():
    """
    Get BookStackService instance from session credentials.

    Returns:
        BookStackService instance or None if not authenticated
    """
    token_id = session.get('bookstack_token_id')
    token_secret = session.get('bookstack_token_secret')

    if not token_id or not token_secret:
        return None

    if not Config.BOOKSTACK_URL:
        return None

    return BookStackService(
        Config.BOOKSTACK_URL,
        token_id,
        token_secret,
        Config.BOOKSTACK_API_TIMEOUT
    )


@bookstack_bp.route('/authenticate', methods=['POST'])
def authenticate():
    """
    Authenticate user with BookStack API tokens.

    Request body:
        {
            "token_id": "string",
            "token_secret": "string"
        }

    Returns:
        {
            "success": true,
            "user": {...}
        }
    """
    try:
        data = request.get_json()
        token_id = data.get('token_id')
        token_secret = data.get('token_secret')

        if not token_id or not token_secret:
            return jsonify({'error': 'Token ID and secret are required'}), 400

        if not Config.BOOKSTACK_URL:
            return jsonify({'error': 'BookStack URL not configured'}), 500

        # Create service and validate credentials
        service = BookStackService(
            Config.BOOKSTACK_URL,
            token_id,
            token_secret,
            Config.BOOKSTACK_API_TIMEOUT
        )

        user = service.authenticate()

        # Store credentials in session
        session['bookstack_token_id'] = token_id
        session['bookstack_token_secret'] = token_secret
        session['bookstack_authenticated'] = True
        session['bookstack_user'] = user

        return jsonify({
            'success': True,
            'user': user
        })

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            return jsonify({'error': 'Invalid credentials'}), 401
        return jsonify({'error': f'Authentication failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/status', methods=['GET'])
def status():
    """
    Check authentication status.

    Returns:
        {
            "authenticated": bool,
            "user": {...} or null
        }
    """
    authenticated = session.get('bookstack_authenticated', False)
    user = session.get('bookstack_user')

    return jsonify({
        'authenticated': authenticated,
        'user': user if authenticated else None
    })


@bookstack_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout and clear session.

    Returns:
        {
            "success": true
        }
    """
    session.pop('bookstack_token_id', None)
    session.pop('bookstack_token_secret', None)
    session.pop('bookstack_authenticated', None)
    session.pop('bookstack_user', None)

    return jsonify({'success': True})


@bookstack_bp.route('/shelves', methods=['GET'])
def list_shelves():
    """
    List all shelves.

    Query params:
        count: int (default 100)
        offset: int (default 0)
        sort: string (default '+name')

    Returns:
        {
            "data": [...],
            "total": int
        }
    """
    service = get_bookstack_service()
    if not service:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        count = request.args.get('count', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        sort = request.args.get('sort', '+name')

        result = service.list_shelves(count, offset, sort)
        return jsonify(result)

    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/shelves/<int:shelf_id>', methods=['GET'])
def get_shelf(shelf_id):
    """
    Get shelf details with books.

    Returns:
        Shelf object with books array
    """
    service = get_bookstack_service()
    if not service:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        shelf = service.get_shelf(shelf_id)
        return jsonify(shelf)

    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/books', methods=['GET'])
def list_books():
    """
    List all books.

    Query params:
        count: int (default 100)
        offset: int (default 0)
        sort: string (default '+name')
        shelf_id: int (optional)

    Returns:
        {
            "data": [...],
            "total": int
        }
    """
    service = get_bookstack_service()
    if not service:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        count = request.args.get('count', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        sort = request.args.get('sort', '+name')
        shelf_id = request.args.get('shelf_id', type=int)

        result = service.list_books(count, offset, sort, shelf_id)
        return jsonify(result)

    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    """
    Get book details with chapters and pages.

    Returns:
        Book object with chapters and pages arrays
    """
    service = get_bookstack_service()
    if not service:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        book = service.get_book(book_id)
        return jsonify(book)

    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/pages/<int:page_id>', methods=['GET'])
def get_page(page_id):
    """
    Get page content and metadata.

    Returns:
        Page object with markdown content
    """
    service = get_bookstack_service()
    if not service:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        page = service.get_page(page_id)
        return jsonify(page)

    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/pages', methods=['POST'])
def create_page():
    """
    Create new page.

    Request body:
        {
            "book_id": int,
            "name": "string",
            "markdown": "string",
            "chapter_id": int (optional),
            "tags": [{"name": "string"}] (optional)
        }

    Returns:
        {
            "success": true,
            "page": {...}
        }
    """
    service = get_bookstack_service()
    if not service:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.get_json()
        book_id = data.get('book_id')
        name = data.get('name')
        markdown = data.get('markdown')
        chapter_id = data.get('chapter_id')
        tags = data.get('tags')

        if not book_id or not name or markdown is None:
            return jsonify({'error': 'book_id, name, and markdown are required'}), 400

        page = service.create_page(book_id, name, markdown, chapter_id, tags)

        return jsonify({
            'success': True,
            'page': page
        })

    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/pages/<int:page_id>', methods=['PUT'])
def update_page(page_id):
    """
    Update existing page.

    Request body:
        {
            "markdown": "string",
            "name": "string" (optional),
            "tags": [...] (optional),
            "updated_at": "timestamp" (for conflict detection),
            "conflict_resolution": "overwrite" (optional)
        }

    Returns:
        {
            "success": true,
            "page": {...},
            "conflict": bool
        }
    """
    service = get_bookstack_service()
    if not service:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.get_json()
        markdown = data.get('markdown')
        name = data.get('name')
        tags = data.get('tags')
        client_updated_at = data.get('updated_at')
        conflict_resolution = data.get('conflict_resolution')

        if markdown is None:
            return jsonify({'error': 'markdown is required'}), 400

        # Check for conflicts if client provided updated_at
        conflict = False
        if client_updated_at and conflict_resolution != 'overwrite':
            current_page = service.get_page(page_id)
            server_updated_at = current_page.get('updated_at')

            if server_updated_at and server_updated_at != client_updated_at:
                # Conflict detected
                return jsonify({
                    'success': False,
                    'conflict': True,
                    'remote_page': current_page
                })

        # No conflict or overwrite requested - proceed with update
        page = service.update_page(page_id, markdown, name, tags)

        return jsonify({
            'success': True,
            'page': page,
            'conflict': False
        })

    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/pages/<int:page_id>', methods=['DELETE'])
def delete_page(page_id):
    """
    Delete page.

    Returns:
        {
            "success": true
        }
    """
    service = get_bookstack_service()
    if not service:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        service.delete_page(page_id)
        return jsonify({'success': True})

    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/search', methods=['GET'])
def search():
    """
    Search for pages.

    Query params:
        query: string
        count: int (default 20)

    Returns:
        {
            "data": [...],
            "total": int
        }
    """
    service = get_bookstack_service()
    if not service:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        query = request.args.get('query', '')
        count = request.args.get('count', 20, type=int)

        if not query:
            return jsonify({'error': 'query parameter is required'}), 400

        result = service.search_pages(query, count)
        return jsonify(result)

    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500
