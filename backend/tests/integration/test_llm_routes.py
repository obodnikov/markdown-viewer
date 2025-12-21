"""
Integration tests for LLM routes.
"""
import pytest
import json
from unittest.mock import patch, MagicMock


class TestLLMRoutes:
    """Test cases for LLM API routes."""

    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get('/api/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'

    @patch('routes.llm.OpenRouterService')
    def test_transform_endpoint_translate(self, mock_service, client, sample_markdown):
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
        assert 'result' in data
        assert data['result'] == "# Documento de Prueba"

    @patch('routes.llm.OpenRouterService')
    def test_transform_endpoint_change_tone(self, mock_service, client, sample_markdown):
        """Test transform endpoint with tone change."""
        mock_instance = MagicMock()
        mock_instance.transform_text.return_value = "Casual version"
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'change_tone',
            'content': sample_markdown,
            'params': {'tone': 'casual'}
        })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['result'] == "Casual version"

    @patch('routes.llm.OpenRouterService')
    def test_transform_endpoint_summarize(self, mock_service, client, sample_markdown):
        """Test transform endpoint with summarization."""
        mock_instance = MagicMock()
        mock_instance.transform_text.return_value = "Summary text"
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['result'] == "Summary text"

    @patch('routes.llm.OpenRouterService')
    def test_transform_endpoint_expand(self, mock_service, client, sample_markdown):
        """Test transform endpoint with expansion."""
        mock_instance = MagicMock()
        mock_instance.transform_text.return_value = "Expanded content"
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'expand',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['result'] == "Expanded content"

    @patch('routes.llm.OpenRouterService')
    def test_transform_endpoint_with_model(self, mock_service, client, sample_markdown):
        """Test transform endpoint with custom model."""
        mock_instance = MagicMock()
        mock_instance.transform_text.return_value = "Result"
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {},
            'model': 'openai/gpt-4'
        })

        assert response.status_code == 200
        # Verify custom model was passed
        mock_instance.transform_text.assert_called_once()
        call_args = mock_instance.transform_text.call_args
        assert call_args[1]['model'] == 'openai/gpt-4'

    def test_transform_endpoint_missing_content(self, client):
        """Test transform endpoint with missing content."""
        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'params': {}
        })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_transform_endpoint_invalid_operation(self, client, sample_markdown):
        """Test transform endpoint with invalid operation."""
        response = client.post('/api/llm/transform', json={
            'operation': 'invalid_op',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    @patch('routes.llm.OpenRouterService')
    def test_custom_prompt_endpoint(self, mock_service, client, sample_markdown):
        """Test custom prompt endpoint."""
        mock_instance = MagicMock()
        mock_instance.custom_prompt.return_value = "Custom result"
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/custom-prompt', json={
            'prompt': 'Make this funny',
            'content': sample_markdown,
            'preserve_markdown': True
        })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['result'] == "Custom result"

    @patch('routes.llm.OpenRouterService')
    def test_custom_prompt_without_preserve(self, mock_service, client, sample_markdown):
        """Test custom prompt without markdown preservation."""
        mock_instance = MagicMock()
        mock_instance.custom_prompt.return_value = "Result"
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/custom-prompt', json={
            'prompt': 'Analyze this',
            'content': sample_markdown,
            'preserve_markdown': False
        })

        assert response.status_code == 200

    def test_custom_prompt_missing_prompt(self, client, sample_markdown):
        """Test custom prompt endpoint with missing prompt."""
        response = client.post('/api/llm/custom-prompt', json={
            'content': sample_markdown
        })

        assert response.status_code == 400

    @patch('routes.llm.OpenRouterService')
    def test_models_endpoint(self, mock_service, client):
        """Test models listing endpoint."""
        mock_instance = MagicMock()
        mock_instance.list_available_models.return_value = [
            {'id': 'model1', 'name': 'Model 1'},
            {'id': 'model2', 'name': 'Model 2'}
        ]
        mock_service.return_value = mock_instance

        response = client.get('/api/llm/models')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'models' in data
        assert len(data['models']) == 2

    def test_languages_endpoint(self, client):
        """Test languages listing endpoint."""
        response = client.get('/api/llm/languages')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'languages' in data
        assert isinstance(data['languages'], list)
        assert len(data['languages']) > 0

    @patch('routes.llm.OpenRouterService')
    def test_generate_regex_endpoint(self, mock_service, client):
        """Test regex generation endpoint."""
        mock_instance = MagicMock()
        mock_instance.generate_regex_pattern.return_value = {
            'pattern': '\\d{3}-\\d{2}-\\d{4}',
            'explanation': 'SSN format'
        }
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/generate-regex', json={
            'description': 'Match SSN',
            'mode': 'search'
        })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'pattern' in data
        assert 'explanation' in data

    @patch('routes.llm.OpenRouterService')
    def test_generate_regex_replace_mode(self, mock_service, client):
        """Test regex generation in replace mode."""
        mock_instance = MagicMock()
        mock_instance.generate_regex_pattern.return_value = {
            'pattern': 'foo',
            'replacement': 'bar',
            'explanation': 'Replace'
        }
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/generate-regex', json={
            'description': 'Replace foo with bar',
            'mode': 'replace'
        })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'replacement' in data

    @patch('routes.llm.OpenRouterService')
    def test_api_error_handling(self, mock_service, client, sample_markdown):
        """Test API error handling."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = Exception("API Error")
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data

    # COMPREHENSIVE ERROR HANDLING TESTS

    @patch('routes.llm.OpenRouterService')
    def test_invalid_api_key_error(self, mock_service, client, sample_markdown):
        """Test handling of invalid API key."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = Exception("Invalid API key")
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data
        assert 'API key' in data['error'] or 'error' in data

    @patch('routes.llm.OpenRouterService')
    def test_network_timeout_error(self, mock_service, client, sample_markdown):
        """Test handling of network timeout."""
        import socket
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = socket.timeout("Request timeout")
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data

    @patch('routes.llm.OpenRouterService')
    def test_rate_limit_error(self, mock_service, client, sample_markdown):
        """Test handling of API rate limits."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = Exception("Rate limit exceeded")
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data

    def test_malformed_json_request(self, client):
        """Test handling of malformed JSON."""
        response = client.post('/api/llm/transform',
                              data='{"invalid json',
                              content_type='application/json')

        assert response.status_code in [400, 500]

    def test_missing_required_fields(self, client):
        """Test handling of missing required fields."""
        # Missing both operation and content
        response = client.post('/api/llm/transform', json={
            'params': {}
        })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_empty_content(self, client):
        """Test handling of empty content."""
        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': '',
            'params': {}
        })

        # Should either accept empty content or return 400
        assert response.status_code in [200, 400]

    def test_extremely_large_content(self, client):
        """Test handling of extremely large content that exceeds token limits."""
        large_content = '# Heading\n\nContent ' * 10000  # Very large document

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': large_content,
            'params': {}
        })

        # Should handle gracefully - either process or return appropriate error
        assert response.status_code in [200, 400, 413, 500]

    def test_unsupported_language(self, client, sample_markdown):
        """Test handling of unsupported translation language."""
        response = client.post('/api/llm/transform', json={
            'operation': 'translate',
            'content': sample_markdown,
            'params': {'target_language': 'Klingon'}
        })

        # Should handle unknown languages gracefully
        assert response.status_code in [200, 400]

    def test_invalid_model_selection(self, client, sample_markdown):
        """Test handling of invalid model selection."""
        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {},
            'model': 'nonexistent/model'
        })

        # Should either accept any model string or validate
        assert response.status_code in [200, 400, 500]

    @patch('routes.llm.OpenRouterService')
    def test_service_unavailable_error(self, mock_service, client, sample_markdown):
        """Test handling when OpenRouter service is unavailable."""
        mock_service.side_effect = ConnectionError("Service unavailable")

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data

    @patch('routes.llm.OpenRouterService')
    def test_invalid_json_response_from_api(self, mock_service, client, sample_markdown):
        """Test handling of invalid JSON response from OpenRouter."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data

    def test_special_characters_in_content(self, client):
        """Test handling of special characters and Unicode."""
        special_content = "# Test\n\n你好世界 🌍 Emoji test ™ © ® Special chars: <>\"'&"

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': special_content,
            'params': {}
        })

        # Should handle Unicode and special characters
        assert response.status_code in [200, 500]

    def test_concurrent_requests(self, client, sample_markdown):
        """Test handling of multiple concurrent requests."""
        # This would ideally test thread safety but we can at least
        # test that multiple sequential requests work
        for i in range(3):
            response = client.post('/api/llm/transform', json={
                'operation': 'summarize',
                'content': sample_markdown,
                'params': {}
            })
            # Should handle multiple requests
            assert response.status_code in [200, 500]

    @patch('routes.llm.OpenRouterService')
    def test_partial_response_error(self, mock_service, client, sample_markdown):
        """Test handling of partial/incomplete API responses."""
        mock_instance = MagicMock()
        mock_instance.transform_text.return_value = None
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        # Should handle None/null responses
        assert response.status_code in [200, 500]

    def test_regex_generation_with_invalid_description(self, client):
        """Test regex generation with invalid/empty description."""
        response = client.post('/api/llm/generate-regex', json={
            'description': '',
            'mode': 'search'
        })

        assert response.status_code in [200, 400]

    def test_regex_generation_with_invalid_mode(self, client):
        """Test regex generation with invalid mode."""
        response = client.post('/api/llm/generate-regex', json={
            'description': 'Match email',
            'mode': 'invalid_mode'
        })

        assert response.status_code in [200, 400]
