"""LLM transformation routes."""
from flask import Blueprint, request, jsonify

try:
    from backend.services.openrouter import OpenRouterService
    from backend.config import Config
except ImportError:
    from services.openrouter import OpenRouterService
    from config import Config

llm_bp = Blueprint('llm', __name__, url_prefix='/api/llm')


def get_openrouter_service() -> OpenRouterService:
    """Get OpenRouter service instance."""
    return OpenRouterService(
        api_key=Config.OPENROUTER_API_KEY,
        default_model=Config.OPENROUTER_DEFAULT_MODEL
    )


@llm_bp.route('/transform', methods=['POST'])
def transform():
    """Transform markdown content using predefined operations.

    Request JSON:
        {
            "operation": "translate",
            "content": "markdown text",
            "params": {"target_language": "Spanish"},
            "model": "anthropic/claude-3.5-sonnet"  // optional
        }

    Returns:
        {
            "success": true,
            "content": "transformed markdown",
            "operation": "translate"
        }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        operation = data.get('operation')
        content = data.get('content')
        params = data.get('params', {})
        model = data.get('model')

        if not operation:
            return jsonify({'error': 'operation is required'}), 400

        if not content:
            return jsonify({'error': 'content is required'}), 400

        service = get_openrouter_service()
        result = service.transform_text(content, operation, params, model)

        return jsonify({
            'success': True,
            'content': result,
            'operation': operation
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@llm_bp.route('/custom-prompt', methods=['POST'])
def custom_prompt():
    """Apply custom user prompt to markdown content.

    Request JSON:
        {
            "prompt": "Rewrite in formal tone",
            "content": "markdown text",
            "model": "anthropic/claude-3.5-sonnet",  // optional
            "preserve_markdown": true  // optional, default true
        }

    Returns:
        {
            "success": true,
            "content": "transformed markdown"
        }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        prompt = data.get('prompt')
        content = data.get('content')
        model = data.get('model')
        preserve_markdown = data.get('preserve_markdown', True)

        if not prompt:
            return jsonify({'error': 'prompt is required'}), 400

        if not content:
            return jsonify({'error': 'content is required'}), 400

        service = get_openrouter_service()
        result = service.custom_prompt(content, prompt, model, preserve_markdown)

        return jsonify({
            'success': True,
            'content': result
        })

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@llm_bp.route('/models', methods=['GET'])
def list_models():
    """List available models.

    Returns:
        {
            "success": true,
            "models": [
                "anthropic/claude-3.5-sonnet",
                "openai/gpt-4-turbo",
                ...
            ]
        }
    """
    try:
        service = get_openrouter_service()
        models = service.list_available_models()

        return jsonify({
            'success': True,
            'models': models
        })

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@llm_bp.route('/languages', methods=['GET'])
def list_languages():
    """List available translation languages.

    Returns:
        {
            "success": true,
            "languages": [
                "Spanish",
                "French",
                ...
            ]
        }
    """
    try:
        return jsonify({
            'success': True,
            'languages': Config.TRANSLATION_LANGUAGES
        })

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@llm_bp.route('/generate-regex', methods=['POST'])
def generate_regex():
    """Generate regex pattern from natural language description using LLM.

    Request JSON:
        {
            "description": "find all email addresses",
            "mode": "find"  // or "replace"
        }

    Returns:
        {
            "success": true,
            "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
            "flags": "g",
            "explanation": "Matches email addresses",
            "examples": ["user@example.com", "name@domain.co.uk"],
            "replacement": ""
        }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        description = data.get('description')
        mode = data.get('mode', 'find')

        if not description:
            return jsonify({'error': 'description is required'}), 400

        service = get_openrouter_service()
        result = service.generate_regex_pattern(description, mode)

        return jsonify({
            'success': True,
            'pattern': result.get('pattern', ''),
            'flags': result.get('flags', 'g'),
            'explanation': result.get('explanation', ''),
            'examples': result.get('examples', []),
            'replacement': result.get('replacement', '')
        })

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500
