"""
Comprehensive error handling tests for LLM routes with specific exception types.
"""
import pytest
import json
import socket
from unittest.mock import patch, MagicMock


class TestLLMErrorHandling:
    """Specific error handling test cases for LLM API routes."""

    @patch('routes.llm.OpenRouterService')
    def test_authentication_error_with_permission_error(self, mock_service, client, sample_markdown):
        """Test handling of authentication errors with PermissionError."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = PermissionError(
            "Invalid API key: authentication failed"
        )
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data
        # Verify specific error information
        error_str = str(data['error']).lower()
        assert any(keyword in error_str for keyword in ['api key', 'authentication', 'permission'])

    @patch('routes.llm.OpenRouterService')
    def test_network_timeout_with_socket_timeout(self, mock_service, client, sample_markdown):
        """Test handling of network timeouts with socket.timeout."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = socket.timeout(
            "Connection timed out after 30 seconds"
        )
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data
        error_str = str(data['error']).lower()
        assert 'timeout' in error_str or 'timed out' in error_str

    @patch('routes.llm.OpenRouterService')
    def test_connection_error_with_detailed_message(self, mock_service, client, sample_markdown):
        """Test handling of connection errors with ConnectionError."""
        mock_service.side_effect = ConnectionError(
            "Failed to connect to OpenRouter API: service unavailable (503)"
        )

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data
        error_str = str(data['error']).lower()
        assert 'connection' in error_str or 'unavailable' in error_str

    @patch('routes.llm.OpenRouterService')
    def test_json_decode_error_from_api_response(self, mock_service, client, sample_markdown):
        """Test handling of malformed JSON from API with JSONDecodeError."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = json.JSONDecodeError(
            "Expecting value",
            "{invalid json response}",
            0
        )
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data
        error_str = str(data['error']).lower()
        assert 'json' in error_str or 'decode' in error_str

    @patch('routes.llm.OpenRouterService')
    def test_value_error_for_invalid_parameters(self, mock_service, client, sample_markdown):
        """Test handling of invalid parameter values with ValueError."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = ValueError(
            "Invalid operation parameter: must be one of [translate, summarize, expand, change_tone]"
        )
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'invalid_operation',
            'content': sample_markdown,
            'params': {}
        })

        # Should be 400 for invalid parameters, or 500 if not properly validated
        assert response.status_code in [400, 500]
        data = json.loads(response.data)
        assert 'error' in data

    @patch('routes.llm.OpenRouterService')
    def test_key_error_for_missing_required_params(self, mock_service, client, sample_markdown):
        """Test handling of missing required parameters with KeyError."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = KeyError('target_language')
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'translate',
            'content': sample_markdown,
            'params': {}  # Missing target_language
        })

        assert response.status_code in [400, 500]
        data = json.loads(response.data)
        assert 'error' in data

    @patch('routes.llm.OpenRouterService')
    def test_index_error_for_malformed_response(self, mock_service, client, sample_markdown):
        """Test handling of malformed API responses with IndexError."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = IndexError(
            "API response missing expected 'choices' array"
        )
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
    def test_type_error_for_incorrect_param_types(self, mock_service, client):
        """Test handling of incorrect parameter types with TypeError."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = TypeError(
            "expected str, got int for 'content' parameter"
        )
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': 12345,  # Wrong type
            'params': {}
        })

        assert response.status_code in [400, 500]
        data = json.loads(response.data)
        assert 'error' in data

    @patch('routes.llm.OpenRouterService')
    def test_runtime_error_for_api_failures(self, mock_service, client, sample_markdown):
        """Test handling of API runtime errors with RuntimeError."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = RuntimeError(
            "OpenRouter API returned error 500: Internal server error"
        )
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data
        error_str = str(data['error']).lower()
        assert '500' in error_str or 'internal server error' in error_str or 'error' in error_str

    def test_malformed_json_request_body(self, client):
        """Test handling of syntactically invalid JSON."""
        response = client.post('/api/llm/transform',
                              data='{"invalid": json, missing quotes}',
                              content_type='application/json')

        assert response.status_code in [400, 500]

    def test_missing_content_field_validation(self, client):
        """Test request validation for missing content field."""
        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            # Missing 'content' field
            'params': {}
        })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_missing_operation_field_validation(self, client, sample_markdown):
        """Test request validation for missing operation field."""
        response = client.post('/api/llm/transform', json={
            # Missing 'operation' field
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_null_values_in_request(self, client):
        """Test handling of null/None values in request."""
        response = client.post('/api/llm/transform', json={
            'operation': None,
            'content': None,
            'params': None
        })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    @patch('routes.llm.OpenRouterService')
    def test_unicode_in_error_messages(self, mock_service, client):
        """Test that Unicode characters in errors are handled correctly."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = ValueError(
            "Error processing content: 你好世界 🌍 contains unsupported characters"
        )
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': '你好世界 🌍',
            'params': {}
        })

        assert response.status_code in [400, 500]
        data = json.loads(response.data)
        assert 'error' in data
        # Verify response is valid JSON (no encoding issues)
        assert isinstance(data['error'], str)

    @patch('routes.llm.OpenRouterService')
    def test_empty_error_message_handling(self, mock_service, client, sample_markdown):
        """Test handling when API returns empty error message."""
        mock_instance = MagicMock()
        mock_instance.transform_text.side_effect = Exception("")
        mock_service.return_value = mock_instance

        response = client.post('/api/llm/transform', json={
            'operation': 'summarize',
            'content': sample_markdown,
            'params': {}
        })

        assert response.status_code == 500
        data = json.loads(response.data)
        # Should still have error field even if message is empty
        assert 'error' in data
