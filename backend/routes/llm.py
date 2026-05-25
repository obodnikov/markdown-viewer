"""LLM transformation routes."""
import math
from flask import Blueprint, request, jsonify

try:
    from backend.services.openrouter import OpenRouterService
    from backend.config import Config
except ImportError:
    from services.openrouter import OpenRouterService
    from config import Config

llm_bp = Blueprint('llm', __name__, url_prefix='/api/llm')


def _estimate_tokens(text: str) -> int:
    """Estimate token count from text using word-based and character-based heuristics.

    Uses the higher of two estimates to handle both whitespace-separated
    languages and CJK/symbol-heavy text that has fewer word boundaries.
    Uses ceiling math to keep the guard conservative near boundaries.

    Args:
        text: Input text to estimate tokens for. Must be a string.

    Returns:
        Estimated token count (conservative/ceiling).
    """
    if not isinstance(text, str):
        return 0
    word_estimate = math.ceil(len(text.split()) * 1.3)
    # Character-based estimate: ~4 chars per token for English,
    # ~1.5 chars per token for CJK. Use ~3 as a conservative middle ground.
    char_estimate = math.ceil(len(text) / 3)
    return max(word_estimate, char_estimate)


# Conservative max output token limits per model family.
# If a model is not listed, falls back to Config.OPENROUTER_MAX_TOKENS.
_MODEL_MAX_TOKENS = {
    'anthropic/claude-3.5-sonnet': 8192,
    'anthropic/claude-3-opus': 4096,
    'anthropic/claude-3-haiku': 4096,
    'openai/gpt-4-turbo': 4096,
    'openai/gpt-4': 8192,
    'openai/gpt-3.5-turbo': 4096,
    'google/gemini-pro': 8192,
    'meta-llama/llama-3-70b-instruct': 4096,
}


def _get_max_tokens_for_model(model=None) -> int:
    """Get the effective max_tokens limit for a given model.

    Args:
        model: Model identifier (e.g., 'anthropic/claude-3.5-sonnet').
               If None or non-string, uses Config.OPENROUTER_MAX_TOKENS.

    Returns:
        The effective max token limit to use for size validation.
    """
    if isinstance(model, str) and model in _MODEL_MAX_TOKENS:
        # Use the lower of model limit and configured limit
        return min(_MODEL_MAX_TOKENS[model], Config.OPENROUTER_MAX_TOKENS)
    return Config.OPENROUTER_MAX_TOKENS


def _check_content_size(*texts: str, model: str = None):
    """Return error response if combined text exceeds 80% of max_tokens, else None.

    This prevents sending oversized content to the LLM which would likely
    result in truncated output or wasted API credits.

    Args:
        *texts: One or more text strings whose combined size is checked.
        model: Optional model identifier for model-aware threshold.
    """
    estimated_tokens = sum(_estimate_tokens(t) for t in texts)
    max_tokens = _get_max_tokens_for_model(model)
    threshold = int(max_tokens * 0.8)
    if estimated_tokens > threshold:
        return jsonify({
            'error': (
                f'Content too large for LLM processing. '
                f'Estimated ~{estimated_tokens} tokens exceeds 80% of the '
                f'{max_tokens} token limit. '
                f'Please split the document into smaller sections.'
            )
        }), 413
    return None


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

        if not isinstance(content, str):
            return jsonify({'error': 'content must be a string'}), 400

        if model is not None and not isinstance(model, str):
            return jsonify({'error': 'model must be a string'}), 400

        size_error = _check_content_size(content, model=model)
        if size_error:
            return size_error

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


@llm_bp.route('/transform-chunked', methods=['POST'])
def transform_chunked():
    """Transform large markdown content by splitting into chunks.

    Automatically splits content at heading/paragraph boundaries,
    processes each chunk via LLM, and reassembles the result.
    Returns progress information for each chunk.

    Request JSON:
        {
            "operation": "translate",
            "content": "large markdown text...",
            "params": {"target_language": "Spanish"},
            "model": "anthropic/claude-3.5-sonnet"  // optional
        }

    Returns (streaming JSON lines):
        {"type": "start", "total_chunks": 5, "total_words": 12000}
        {"type": "progress", "chunk_index": 0, "total_chunks": 5}
        {"type": "progress", "chunk_index": 1, "total_chunks": 5}
        ...
        {"type": "complete", "success": true, "content": "full transformed markdown", "chunks_processed": 5}

    Or on error:
        {"type": "error", "error": "...", "chunk_index": -1}
    """
    import json

    try:
        from backend.services.markdown_chunker import chunk_markdown
    except ImportError:
        from services.markdown_chunker import chunk_markdown

    # Validate request before starting the stream.
    # Use silent=True to avoid werkzeug BadRequest on malformed JSON.
    data = request.get_json(silent=True)

    if not data:
        return jsonify({'error': 'No JSON data provided or malformed JSON'}), 400

    operation = data.get('operation')
    content = data.get('content')
    params = data.get('params', {})
    model = data.get('model')

    if not operation:
        return jsonify({'error': 'operation is required'}), 400

    if not content:
        return jsonify({'error': 'content is required'}), 400

    if not isinstance(content, str):
        return jsonify({'error': 'content must be a string'}), 400

    if not isinstance(params, dict):
        return jsonify({'error': 'params must be an object'}), 400

    if model is not None and not isinstance(model, str):
        return jsonify({'error': 'model must be a string'}), 400

    # Chunk the content before starting the stream
    try:
        chunk_result = chunk_markdown(content, target_words=2000)
    except Exception as e:
        return jsonify({'error': f'Failed to chunk content: {str(e)}'}), 500

    def generate():
        """Stream progress as JSON lines.

        The entire generator body is wrapped in try/except to guarantee
        a terminal event (either 'complete' or 'error') is always emitted.
        """
        try:
            # Start event
            yield json.dumps({
                'type': 'start',
                'total_chunks': len(chunk_result.chunks),
                'total_words': chunk_result.total_words,
                'was_chunked': chunk_result.was_chunked,
            }) + '\n'

            service = get_openrouter_service()
            transformed_chunks = []

            for chunk in chunk_result.chunks:
                # Progress event
                yield json.dumps({
                    'type': 'progress',
                    'chunk_index': chunk.index,
                    'total_chunks': len(chunk_result.chunks),
                }) + '\n'

                result = service.transform_text_chunk(
                    chunk_content=chunk.content,
                    operation=operation,
                    params=params,
                    model=model,
                    overlap_context=chunk.overlap_context,
                )
                transformed_chunks.append(result)

            # Complete event with full reassembled content
            full_content = '\n\n'.join(transformed_chunks)
            yield json.dumps({
                'type': 'complete',
                'success': True,
                'content': full_content,
                'chunks_processed': len(transformed_chunks),
                'operation': operation,
            }) + '\n'

        except Exception as e:
            # Guarantee a terminal error event on any failure
            yield json.dumps({
                'type': 'error',
                'error': str(e),
                'chunk_index': chunk.index if 'chunk' in dir() else -1,
            }) + '\n'

    from flask import Response
    return Response(
        generate(),
        mimetype='application/x-ndjson',
        headers={'X-Content-Type-Options': 'nosniff'},
    )


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

        if not isinstance(content, str):
            return jsonify({'error': 'content must be a string'}), 400

        if not isinstance(prompt, str):
            return jsonify({'error': 'prompt must be a string'}), 400

        if model is not None and not isinstance(model, str):
            return jsonify({'error': 'model must be a string'}), 400

        size_error = _check_content_size(content, prompt, model=model)
        if size_error:
            return size_error

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
