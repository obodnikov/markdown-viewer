"""GitHub integration routes."""
import html
import secrets
import time
import urllib.parse
from flask import Blueprint, request, jsonify, session, redirect
import requests

try:
    from backend.services.github_service import GitHubService
    from backend.config import Config
except ImportError:
    from services.github_service import GitHubService
    from config import Config

github_bp = Blueprint('github', __name__, url_prefix='/api/github')

# Server-side registry for desktop OAuth tokens.
# Keyed by nonce, stores {'token': str, 'timestamp': float}.
# The system browser and Electron app have separate sessions, so we
# bridge the gap by storing the GitHub token here temporarily and
# letting the Electron app claim it via the nonce.
_pending_desktop_auths = {}
_DESKTOP_AUTH_TTL = 300  # 5 minutes



@github_bp.route('/auth', methods=['GET'])
def auth():
    """Initiate GitHub OAuth flow.

    Query params:
        source: 'desktop' if initiated from Electron app (optional)
        nonce: desktop auth nonce for token exchange (desktop only)

    Returns:
        Redirect to GitHub OAuth page
    """
    if not Config.GITHUB_CLIENT_ID:
        return jsonify({'error': 'GitHub OAuth not configured'}), 500

    source = request.args.get('source', 'web')
    if source not in ('web', 'desktop'):
        source = 'web'

    # Build state: source:csrf_token for web, source:csrf_token:nonce for desktop
    csrf_token = secrets.token_urlsafe(32)
    session['github_oauth_csrf'] = csrf_token

    if source == 'desktop':
        nonce = request.args.get('nonce', '')
        state = f"{source}:{csrf_token}:{nonce}"
    else:
        state = f"{source}:{csrf_token}"

    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={Config.GITHUB_CLIENT_ID}"
        f"&redirect_uri={Config.GITHUB_REDIRECT_URI}"
        f"&scope=repo,user"
        f"&state={urllib.parse.quote(state, safe='')}"
    )

    return redirect(github_auth_url)





@github_bp.route('/callback', methods=['GET'])
def callback():
    """Handle GitHub OAuth callback.

    Query params:
        code: OAuth code from GitHub
        state: 'source:csrf' (web) or 'source:csrf:nonce' (desktop)

    Returns:
        Redirect to frontend (web) or HTML success page (desktop)
    """
    code = request.args.get('code')
    state = request.args.get('state', 'web:')

    # Parse state: "source:csrf" or "source:csrf:nonce"
    parts = state.split(':', 2)
    source = parts[0] if len(parts) >= 1 else 'web'
    csrf_token = parts[1] if len(parts) >= 2 else ''
    nonce = parts[2] if len(parts) >= 3 else ''

    if source not in ('web', 'desktop'):
        source = 'web'
    is_desktop = source == 'desktop'

    # Validate CSRF token (browser session — same session that called /auth)
    expected_csrf = session.pop('github_oauth_csrf', None)
    if not expected_csrf or csrf_token != expected_csrf:
        if is_desktop:
            return _desktop_callback_page(False, 'Invalid OAuth state. Please try again.')
        return redirect('/?error=github_csrf_invalid')

    if not code:
        if is_desktop:
            return _desktop_callback_page(False, 'GitHub authentication was denied or failed.')
        return redirect('/?error=github_auth_failed')

    try:
        # Exchange code for access token
        token_response = requests.post(
            'https://github.com/login/oauth/access_token',
            data={
                'client_id': Config.GITHUB_CLIENT_ID,
                'client_secret': Config.GITHUB_CLIENT_SECRET,
                'code': code,
                'redirect_uri': Config.GITHUB_REDIRECT_URI
            },
            headers={'Accept': 'application/json'}
        )

        token_data = token_response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            if is_desktop:
                return _desktop_callback_page(False, 'Failed to obtain access token from GitHub.')
            return redirect('/?error=github_token_failed')

        if is_desktop and nonce:
            # Store token in server-side registry keyed by nonce.
            # The Electron app will claim it via /desktop-status?nonce=...
            _cleanup_expired_auths()
            _pending_desktop_auths[nonce] = {
                'token': access_token,
                'timestamp': time.time()
            }
            return _desktop_callback_page(True)

        if is_desktop and not nonce:
            # Desktop flow without nonce is invalid — should never happen
            return _desktop_callback_page(False, 'Desktop authentication requires a nonce. Please try again from the app.')

        # Web flow: store in session as before
        session['github_token'] = access_token
        return redirect('/?github_auth=success')

    except Exception as e:
        if is_desktop:
            return _desktop_callback_page(False, str(e))
        return redirect(f'/?error=github_callback_error&message={str(e)}')



def _desktop_callback_page(success, error_message=None):
    """Return an HTML page for the desktop OAuth callback.

    Shown in the user's system browser after GitHub redirects back.
    """
    if success:
        return (
            '<!DOCTYPE html><html><head><meta charset="utf-8">'
            '<title>GitHub Authentication</title>'
            '<style>'
            'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;'
            'display:flex;justify-content:center;align-items:center;'
            'min-height:100vh;margin:0;background:#0d1117;color:#c9d1d9;}'
            '.card{text-align:center;padding:48px;border-radius:12px;'
            'background:#161b22;border:1px solid #30363d;max-width:400px;}'
            '.icon{font-size:48px;margin-bottom:16px;}'
            'h2{margin:0 0 8px;color:#58a6ff;}'
            'p{margin:0;color:#8b949e;}'
            '</style></head><body>'
            '<div class="card">'
            '<div class="icon">&#9989;</div>'
            '<h2>Authentication Successful</h2>'
            '<p>You can close this tab and return to Markdown Viewer.</p>'
            '</div>'
            '<script>setTimeout(()=>window.close(),3000);</script>'
            '</body></html>'
        ), 200

    safe_message = html.escape(error_message or 'An unknown error occurred.')
    return (
        '<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<title>GitHub Authentication</title>'
        '<style>'
        'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;'
        'display:flex;justify-content:center;align-items:center;'
        'min-height:100vh;margin:0;background:#0d1117;color:#c9d1d9;}'
        '.card{text-align:center;padding:48px;border-radius:12px;'
        'background:#161b22;border:1px solid #30363d;max-width:400px;}'
        '.icon{font-size:48px;margin-bottom:16px;}'
        'h2{margin:0 0 8px;color:#f85149;}'
        'p{margin:0;color:#8b949e;}'
        '</style></head><body>'
        '<div class="card">'
        '<div class="icon">&#10060;</div>'
        '<h2>Authentication Failed</h2>'
        f'<p>{safe_message}</p>'
        '</div>'
        '</body></html>'
    ), 400


def _cleanup_expired_auths():
    """Remove expired entries from the pending desktop auths registry."""
    now = time.time()
    expired = [k for k, v in _pending_desktop_auths.items()
               if now - v['timestamp'] > _DESKTOP_AUTH_TTL]
    for k in expired:
        del _pending_desktop_auths[k]


@github_bp.route('/desktop-status', methods=['GET'])
def desktop_status():
    """Check if desktop OAuth completed and claim the token.

    Called by the Electron app polling loop. If the nonce has a token,
    it is moved into the caller's session and the nonce is consumed.

    Query params:
        nonce: The desktop auth nonce generated by the Electron app

    Returns:
        {"success": true, "user": {...}} if auth completed
        {"pending": true} if still waiting
        {"error": "..."} on invalid/expired nonce
    """
    nonce = request.args.get('nonce', '')
    if not nonce:
        return jsonify({'error': 'nonce parameter is required'}), 400

    _cleanup_expired_auths()

    entry = _pending_desktop_auths.pop(nonce, None)
    if not entry:
        # Either still pending or expired/invalid — caller should keep polling
        return jsonify({'pending': True}), 200

    # Claim the token into this session (the Electron app's session)
    access_token = entry['token']
    session['github_token'] = access_token

    # Return user info so the app can update the UI immediately
    try:
        service = GitHubService(access_token)
        user_info = service.get_user_info()
        return jsonify({'success': True, 'user': user_info})
    except RuntimeError as e:
        # Token is stored but user info fetch failed — still authenticated
        return jsonify({'success': True, 'user': None})





@github_bp.route('/user', methods=['GET'])
def get_user():
    """Get authenticated user information.

    Returns:
        {
            "success": true,
            "user": {
                "login": "username",
                "name": "Full Name",
                "email": "email@example.com",
                "avatar_url": "https://..."
            }
        }
    """
    token = session.get('github_token')

    if not token:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        service = GitHubService(token)
        user_info = service.get_user_info()

        return jsonify({
            'success': True,
            'user': user_info
        })

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500


@github_bp.route('/repos', methods=['GET'])
def list_repos():
    """List user repositories.

    Query params:
        sort: Sort method (updated, created, pushed, full_name)

    Returns:
        {
            "success": true,
            "repositories": [...]
        }
    """
    token = session.get('github_token')

    if not token:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        sort = request.args.get('sort', 'updated')
        service = GitHubService(token)
        repos = service.list_repositories(sort)

        return jsonify({
            'success': True,
            'repositories': repos
        })

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500


@github_bp.route('/files', methods=['GET'])
def list_files():
    """List files in repository.

    Query params:
        repo: Repository full name (owner/repo)
        path: Directory path (optional)

    Returns:
        {
            "success": true,
            "files": [...]
        }
    """
    token = session.get('github_token')

    if not token:
        return jsonify({'error': 'Not authenticated'}), 401

    repo = request.args.get('repo')
    path = request.args.get('path', '')

    if not repo:
        return jsonify({'error': 'repo parameter is required'}), 400

    try:
        service = GitHubService(token)
        files = service.list_markdown_files(repo, path)

        return jsonify({
            'success': True,
            'files': files
        })

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500


@github_bp.route('/file', methods=['GET'])
def get_file():
    """Get file content.

    Query params:
        repo: Repository full name (owner/repo)
        path: File path

    Returns:
        {
            "success": true,
            "file": {
                "content": "...",
                "sha": "...",
                "path": "...",
                "name": "...",
                "size": 1234
            }
        }
    """
    token = session.get('github_token')

    if not token:
        return jsonify({'error': 'Not authenticated'}), 401

    repo = request.args.get('repo')
    path = request.args.get('path')

    if not repo or not path:
        return jsonify({'error': 'repo and path parameters are required'}), 400

    try:
        service = GitHubService(token)
        file_data = service.get_file_content(repo, path)

        return jsonify({
            'success': True,
            'file': file_data
        })

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500


@github_bp.route('/file', methods=['POST'])
def save_file():
    """Save file to repository.

    Request JSON:
        {
            "repo": "owner/repo",
            "path": "file.md",
            "content": "markdown content",
            "message": "commit message",
            "sha": "file sha (for updates)",
            "branch": "branch name (optional)"
        }

    Returns:
        {
            "success": true,
            "commit": {
                "sha": "...",
                "message": "...",
                "path": "..."
            }
        }
    """
    token = session.get('github_token')

    if not token:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        repo = data.get('repo')
        path = data.get('path')
        content = data.get('content')
        message = data.get('message')
        sha = data.get('sha')
        branch = data.get('branch')

        if not repo or not path or not content or not message:
            return jsonify({'error': 'repo, path, content, and message are required'}), 400

        service = GitHubService(token)
        commit_info = service.save_file(repo, path, content, message, sha, branch)

        return jsonify({
            'success': True,
            'commit': commit_info
        })

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@github_bp.route('/logout', methods=['POST'])
def logout():
    """Logout and clear GitHub session.

    Returns:
        {
            "success": true
        }
    """
    session.pop('github_token', None)

    return jsonify({
        'success': True
    })
