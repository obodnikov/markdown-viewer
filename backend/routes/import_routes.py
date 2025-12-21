"""
Import Routes

API endpoints for importing content from external sources (ChatGPT, Claude, Perplexity).
"""

from flask import Blueprint, request, jsonify
from services.chat_import_service import ChatImportService

import_bp = Blueprint('import', __name__, url_prefix='/api/import')

# Initialize service
chat_import_service = ChatImportService()


@import_bp.route('/chatgpt', methods=['POST'])
def import_chatgpt():
    """
    Import a ChatGPT conversation from a share link.

    Request body:
        {
            "url": "https://chatgpt.com/share/xxx"
        }

    Returns:
        {
            "success": true,
            "content": "# Markdown content...",
            "metadata": {
                "title": "Conversation Title",
                "platform": "ChatGPT",
                "message_count": 24,
                "imported_at": "2025-12-21T..."
            }
        }

    Or on error:
        {
            "success": false,
            "error": "Error message"
        }
    """
    try:
        data = request.get_json()

        if not data or 'url' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: url'
            }), 400

        url = data['url'].strip()

        if not url:
            return jsonify({
                'success': False,
                'error': 'URL cannot be empty'
            }), 400

        # Import the conversation (validation happens in service layer)
        result = chat_import_service.import_chat(url)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@import_bp.route('/detect-platform', methods=['POST'])
def detect_platform():
    """
    Detect which chat platform a URL belongs to.

    Request body:
        {
            "url": "https://chatgpt.com/share/xxx"
        }

    Returns:
        {
            "platform": "chatgpt",
            "supported": true
        }

    Or:
        {
            "platform": null,
            "supported": false,
            "error": "Unknown platform"
        }
    """
    try:
        data = request.get_json()

        if not data or 'url' not in data:
            return jsonify({
                'platform': None,
                'supported': False,
                'error': 'Missing required field: url'
            }), 400

        url = data['url'].strip()
        platform = chat_import_service.detect_platform(url)

        if platform:
            # Check if platform is supported
            supported = platform in chat_import_service.SUPPORTED_PLATFORMS

            return jsonify({
                'platform': platform,
                'supported': supported
            }), 200
        else:
            # Format platform names properly (ChatGPT instead of Chatgpt)
            platform_names = {'chatgpt': 'ChatGPT', 'claude': 'Claude', 'perplexity': 'Perplexity'}
            supported_list = ', '.join(
                platform_names.get(p, p.capitalize())
                for p in chat_import_service.SUPPORTED_PLATFORMS
            )
            return jsonify({
                'platform': None,
                'supported': False,
                'error': f'Unknown platform. Supported: {supported_list}'
            }), 400

    except Exception as e:
        return jsonify({
            'platform': None,
            'supported': False,
            'error': f'Server error: {str(e)}'
        }), 500
