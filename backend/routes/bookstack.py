"""BookStack integration routes."""
import logging
from flask import Blueprint, request, jsonify, session
import requests

try:
    from backend.services.bookstack_service import BookStackService
    from backend.config import Config
except ImportError:
    from services.bookstack_service import BookStackService
    from config import Config

logger = logging.getLogger(__name__)
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
        logger.debug("No BookStack credentials found in session")
        return None

    if not Config.BOOKSTACK_URL:
        logger.error("BookStack URL not configured in environment")
        return None

    logger.debug(f"Creating BookStack service for URL: {Config.BOOKSTACK_URL}")
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
    logger.info("BookStack authentication attempt started")
    try:
        data = request.get_json()

        # Validate JSON body exists
        if data is None:
            logger.warning("Authentication failed: Invalid or missing JSON body")
            return jsonify({'error': 'Invalid or missing JSON body'}), 400

        token_id = data.get('token_id')
        token_secret = data.get('token_secret')

        if not token_id or not token_secret:
            logger.warning("Authentication failed: Missing token_id or token_secret")
            return jsonify({'error': 'Token ID and secret are required'}), 400

        if not Config.BOOKSTACK_URL:
            logger.error("Authentication failed: BookStack URL not configured")
            return jsonify({'error': 'BookStack URL not configured'}), 500

        logger.debug(f"Attempting to authenticate with BookStack at {Config.BOOKSTACK_URL}")

        # Create service and validate credentials
        service = BookStackService(
            Config.BOOKSTACK_URL,
            token_id,
            token_secret,
            Config.BOOKSTACK_API_TIMEOUT
        )

        auth_result = service.authenticate()

        # Store credentials in session
        session['bookstack_token_id'] = token_id
        session['bookstack_token_secret'] = token_secret
        session['bookstack_authenticated'] = True
        session['bookstack_user'] = auth_result

        # Log authentication with instance info and sanitized token ID
        token_id_masked = f"{token_id[:8]}...{token_id[-4:]}" if len(token_id) > 12 else "***"
        logger.info(f"BookStack authentication successful | instance={auth_result.get('instance')} token_id={token_id_masked} api_version={auth_result.get('api_version')}")

        return jsonify({
            'success': True,
            'user': auth_result
        })

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            logger.warning(f"BookStack authentication failed: Invalid credentials | status_code=401")
            return jsonify({'error': 'Invalid credentials'}), 401
        logger.error(f"BookStack authentication failed: HTTP error | status_code={e.response.status_code} error={str(e)}")
        return jsonify({'error': f'Authentication failed: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"BookStack authentication failed: Unexpected error | error={str(e)}", exc_info=True)
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

    logger.debug(f"BookStack authentication status check | authenticated={authenticated}")

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
    user = session.get('bookstack_user', {})
    user_name = user.get('name', 'unknown')

    session.pop('bookstack_token_id', None)
    session.pop('bookstack_token_secret', None)
    session.pop('bookstack_authenticated', None)
    session.pop('bookstack_user', None)

    logger.info(f"BookStack logout successful | user={user_name}")

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
        logger.warning("List shelves request rejected: Not authenticated")
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        count = request.args.get('count', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        sort = request.args.get('sort', '+name')

        logger.debug(f"Listing shelves | count={count} offset={offset} sort={sort}")
        result = service.list_shelves(count, offset, sort)
        logger.info(f"Shelves listed successfully | total={result.get('total', 0)}")
        return jsonify(result)

    except requests.exceptions.HTTPError as e:
        logger.error(f"Failed to list shelves | status_code={e.response.status_code} error={str(e)}")
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        logger.error(f"Failed to list shelves | error={str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@bookstack_bp.route('/shelves/details', methods=['GET'])
def list_shelves_with_details():
    """
    List all shelves with detailed information including book counts and associations.

    This endpoint aggregates data to eliminate N+1 queries on the frontend.
    It provides all shelf data with book counts and identifies unshelved books.

    Query params:
        count: int (default 100) - Number of shelves to return
        offset: int (default 0) - Offset for pagination
        sort: string (default '+name') - Sort field

    Returns:
        {
            "shelves": [
                {
                    ...shelf fields...,
                    "book_count": int,
                    "book_ids": [int, ...]
                }
            ],
            "unshelved_books": [...],
            "total_shelves": int,
            "total_books": int
        }
    """
    service = get_bookstack_service()
    if not service:
        logger.warning("List shelves with details request rejected: Not authenticated")
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        count = request.args.get('count', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        sort = request.args.get('sort', '+name')

        logger.debug(f"Listing shelves with details | count={count} offset={offset} sort={sort}")
        result = service.list_shelves_with_details(count, offset, sort)
        logger.info(f"Shelves with details listed successfully | shelves={len(result.get('shelves', []))} unshelved_books={len(result.get('unshelved_books', []))}")
        return jsonify(result)

    except requests.exceptions.HTTPError as e:
        logger.error(f"Failed to list shelves with details | status_code={e.response.status_code} error={str(e)}")
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        logger.error(f"Failed to list shelves with details | error={str(e)}", exc_info=True)
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
        logger.warning(f"Get page request rejected: Not authenticated | page_id={page_id}")
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        logger.debug(f"Fetching page | page_id={page_id}")
        page = service.get_page(page_id)
        logger.info(f"Page fetched successfully | page_id={page_id} title={page.get('name', 'untitled')} has_markdown={bool(page.get('markdown'))}")
        return jsonify(page)

    except requests.exceptions.HTTPError as e:
        logger.error(f"Failed to fetch page | page_id={page_id} status_code={e.response.status_code} error={str(e)}")
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        logger.error(f"Failed to fetch page | page_id={page_id} error={str(e)}", exc_info=True)
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
        logger.warning("Create page request rejected: Not authenticated")
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.get_json()
        book_id = data.get('book_id')
        name = data.get('name')
        markdown = data.get('markdown')
        chapter_id = data.get('chapter_id')
        tags = data.get('tags')

        if not book_id or not name or markdown is None:
            logger.warning(f"Create page request rejected: Missing required fields | book_id={book_id} name={name} has_markdown={markdown is not None}")
            return jsonify({'error': 'book_id, name, and markdown are required'}), 400

        logger.info(f"Creating new page | book_id={book_id} chapter_id={chapter_id} name={name}")
        page = service.create_page(book_id, name, markdown, chapter_id, tags)
        logger.info(f"Page created successfully | page_id={page.get('id')} name={name}")

        return jsonify({
            'success': True,
            'page': page
        })

    except requests.exceptions.HTTPError as e:
        logger.error(f"Failed to create page | book_id={book_id} name={name} status_code={e.response.status_code} error={str(e)}")
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        logger.error(f"Failed to create page | book_id={book_id} name={name} error={str(e)}", exc_info=True)
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
        logger.warning(f"Update page request rejected: Not authenticated | page_id={page_id}")
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.get_json()
        markdown = data.get('markdown')
        name = data.get('name')
        tags = data.get('tags')
        client_updated_at = data.get('updated_at')
        conflict_resolution = data.get('conflict_resolution')

        if markdown is None:
            logger.warning(f"Update page request rejected: Missing markdown | page_id={page_id}")
            return jsonify({'error': 'markdown is required'}), 400

        # Check for conflicts if client provided updated_at
        conflict = False
        if client_updated_at and conflict_resolution != 'overwrite':
            logger.debug(f"Checking for conflicts | page_id={page_id} client_updated_at={client_updated_at}")
            current_page = service.get_page(page_id)
            server_updated_at = current_page.get('updated_at')

            if server_updated_at and server_updated_at != client_updated_at:
                # Conflict detected
                logger.warning(f"Conflict detected | page_id={page_id} client_updated_at={client_updated_at} server_updated_at={server_updated_at}")
                return jsonify({
                    'success': False,
                    'conflict': True,
                    'remote_page': current_page
                })

        # No conflict or overwrite requested - proceed with update
        logger.info(f"Updating page | page_id={page_id} name={name} conflict_resolution={conflict_resolution}")
        page = service.update_page(page_id, markdown, name, tags)
        logger.info(f"Page updated successfully | page_id={page_id} name={page.get('name')}")

        return jsonify({
            'success': True,
            'page': page,
            'conflict': False
        })

    except requests.exceptions.HTTPError as e:
        logger.error(f"Failed to update page | page_id={page_id} status_code={e.response.status_code} error={str(e)}")
        return jsonify({'error': f'BookStack API error: {str(e)}'}), e.response.status_code
    except Exception as e:
        logger.error(f"Failed to update page | page_id={page_id} error={str(e)}", exc_info=True)
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
