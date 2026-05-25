"""Tests for LLM content size validation (token limit guard).

Tests the _check_content_size and _estimate_tokens helpers that prevent
oversized content from being sent to the LLM API.
"""
import pytest
from unittest.mock import patch, MagicMock


class TestContentSizeValidation:
    """Test content size validation for /api/llm/transform and /api/llm/custom-prompt."""

    def _generate_content(self, word_count: int) -> str:
        """Generate content with approximately the given word count."""
        return ' '.join(['word'] * word_count)

    def test_transform_just_below_threshold_passes(self, client):
        """Content just below 80% threshold should proceed to LLM call."""
        # 8000 * 0.8 = 6400 token threshold
        # With char estimate: 6400 * 3 = 19200 chars needed
        # With word estimate: 6400 / 1.3 ≈ 4923 words
        # 'word ' is 5 chars, so 4900 words = 24500 chars > 19200
        # char_estimate = 24500/3 = 8166 > 6400 — would trigger!
        # Need to use shorter content. 19000 chars / 5 = 3800 words
        content = self._generate_content(3800)

        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            mock_service = MagicMock()
            mock_service.transform_text.return_value = 'transformed'
            mock_get_service.return_value = mock_service

            response = client.post('/api/llm/transform', json={
                'operation': 'summarize',
                'content': content
            })

            assert response.status_code == 200
            assert response.get_json()['success'] is True
            mock_service.transform_text.assert_called_once()

    def test_transform_just_above_threshold_returns_413(self, client):
        """Content just above 80% threshold should return 413."""
        # 6400 tokens * 3 chars/token = 19200 chars needed for char estimate
        # Use enough words that char estimate exceeds threshold
        content = self._generate_content(5000)

        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            response = client.post('/api/llm/transform', json={
                'operation': 'summarize',
                'content': content
            })

            assert response.status_code == 413
            data = response.get_json()
            assert 'error' in data
            assert 'too large' in data['error'].lower()
            assert '80%' in data['error']
            # Verify LLM service was never called
            mock_get_service.assert_not_called()

    def test_transform_small_content_passes(self, client):
        """Small content should pass size check without issues."""
        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            mock_service = MagicMock()
            mock_service.transform_text.return_value = 'result'
            mock_get_service.return_value = mock_service

            response = client.post('/api/llm/transform', json={
                'operation': 'summarize',
                'content': '# Hello\n\nShort document.'
            })

            assert response.status_code == 200

    def test_custom_prompt_large_content_returns_413(self, client):
        """Custom prompt with large content should return 413."""
        content = self._generate_content(5000)

        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            response = client.post('/api/llm/custom-prompt', json={
                'prompt': 'Summarize this',
                'content': content
            })

            assert response.status_code == 413
            data = response.get_json()
            assert 'too large' in data['error'].lower()
            # Verify LLM service was never called
            mock_get_service.assert_not_called()

    def test_custom_prompt_large_prompt_plus_content_returns_413(self, client):
        """Custom prompt where prompt + content combined exceed threshold."""
        # Each part alone might be below threshold, but combined they exceed it
        content = self._generate_content(2500)
        prompt = self._generate_content(2500)

        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            response = client.post('/api/llm/custom-prompt', json={
                'prompt': prompt,
                'content': content
            })

            assert response.status_code == 413
            data = response.get_json()
            assert 'too large' in data['error'].lower()
            # Verify LLM service was never called
            mock_get_service.assert_not_called()

    def test_custom_prompt_small_content_passes(self, client):
        """Small content + prompt should pass size check."""
        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            mock_service = MagicMock()
            mock_service.custom_prompt.return_value = 'result'
            mock_get_service.return_value = mock_service

            response = client.post('/api/llm/custom-prompt', json={
                'prompt': 'Rewrite in formal tone',
                'content': '# Hello\n\nShort document.'
            })

            assert response.status_code == 200

    def test_transform_non_string_content_returns_400(self, client):
        """Non-string content should return 400, not 500."""
        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': 12345
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'string' in data['error'].lower()

    def test_custom_prompt_non_string_content_returns_400(self, client):
        """Non-string content in custom-prompt should return 400."""
        response = client.post('/api/llm/custom-prompt', json={
            'prompt': 'Summarize',
            'content': ['not', 'a', 'string']
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'string' in data['error'].lower()

    def test_custom_prompt_non_string_prompt_returns_400(self, client):
        """Non-string prompt in custom-prompt should return 400."""
        response = client.post('/api/llm/custom-prompt', json={
            'prompt': 123,
            'content': 'Valid content'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'string' in data['error'].lower()

    def test_413_response_includes_token_limit_info(self, client):
        """413 response should include the configured token limit in the message."""
        content = self._generate_content(5000)

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': content
        })

        assert response.status_code == 413
        data = response.get_json()
        # Should mention the configured max_tokens value (8000 in test config)
        assert '8000' in data['error']

    def test_model_aware_threshold_smaller_model(self, client):
        """Model with smaller context window should use lower threshold."""
        # claude-3-haiku has 4096 max tokens, threshold = 4096 * 0.8 = 3276
        # Content that fits under 8000*0.8=6400 but exceeds 4096*0.8=3276
        # 3276 tokens * 3 chars/token = 9828 chars needed
        # Use 2200 words = 11000 chars → char_estimate = 3666 > 3276
        content = self._generate_content(2200)

        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            response = client.post('/api/llm/transform', json={
                'operation': 'summarize',
                'content': content,
                'model': 'anthropic/claude-3-haiku'
            })

            assert response.status_code == 413
            data = response.get_json()
            assert '4096' in data['error']
            mock_get_service.assert_not_called()

    def test_model_aware_threshold_unknown_model_uses_default(self, client):
        """Unknown model should fall back to Config.OPENROUTER_MAX_TOKENS."""
        content = self._generate_content(5000)

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': content,
            'model': 'some-unknown/model-xyz'
        })

        assert response.status_code == 413
        data = response.get_json()
        # Falls back to default 8000
        assert '8000' in data['error']

    def test_cjk_content_uses_char_estimate(self, client):
        """CJK text with few word boundaries should use character-based estimate."""
        # CJK text has very few spaces, so word-based estimate would be low.
        # 6400 tokens * 3 chars/token = 19200 chars needed to exceed threshold.
        # Generate a long CJK string with no spaces.
        cjk_content = '这是测试内容' * 3500  # 6 chars * 3500 = 21000 chars

        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            response = client.post('/api/llm/transform', json={
                'operation': 'summarize',
                'content': cjk_content
            })

            assert response.status_code == 413
            mock_get_service.assert_not_called()

    def test_exact_threshold_boundary_passes(self, client):
        """Content at exactly the threshold boundary should pass (not strictly greater)."""
        # Threshold = 8000 * 0.8 = 6400
        # We need estimated_tokens <= 6400 to pass
        # With ceil: word_estimate = ceil(N * 1.3), char_estimate = ceil(len/3)
        # For 'a ' repeated: each word is 'a', joined by spaces
        # N words of 'a' → string length = 2*N - 1
        # word_estimate = ceil(N * 1.3), char_estimate = ceil((2N-1)/3)
        # word_estimate dominates. Need ceil(N * 1.3) <= 6400
        # N <= 6400 / 1.3 = 4923.07 → N = 4923 → ceil(4923*1.3) = ceil(6399.9) = 6400
        # 6400 <= 6400 → passes (not strictly greater)
        content = ' '.join(['a'] * 4923)

        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            mock_service = MagicMock()
            mock_service.transform_text.return_value = 'result'
            mock_get_service.return_value = mock_service

            response = client.post('/api/llm/transform', json={
                'operation': 'summarize',
                'content': content
            })

            assert response.status_code == 200
            mock_service.transform_text.assert_called_once()

    def test_transform_non_string_model_returns_400(self, client):
        """Non-string model in transform should return 400."""
        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': 'Valid content here.',
            'model': ['not', 'a', 'string']
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'model' in data['error'].lower()
        assert 'string' in data['error'].lower()

    def test_transform_numeric_model_returns_400(self, client):
        """Numeric model in transform should return 400."""
        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': 'Valid content here.',
            'model': 12345
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'model' in data['error'].lower()

    def test_custom_prompt_non_string_model_returns_400(self, client):
        """Non-string model in custom-prompt should return 400."""
        response = client.post('/api/llm/custom-prompt', json={
            'prompt': 'Summarize',
            'content': 'Valid content here.',
            'model': {'key': 'value'}
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'model' in data['error'].lower()
        assert 'string' in data['error'].lower()

    def test_transform_null_model_uses_default(self, client):
        """Null/None model should use default (not error)."""
        with patch('backend.routes.llm.get_openrouter_service') as mock_get_service:
            mock_service = MagicMock()
            mock_service.transform_text.return_value = 'result'
            mock_get_service.return_value = mock_service

            response = client.post('/api/llm/transform', json={
                'operation': 'summarize',
                'content': 'Short content.',
                'model': None
            })

            assert response.status_code == 200
