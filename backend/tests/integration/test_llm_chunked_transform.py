"""Tests for the /api/llm/transform-chunked endpoint."""
import json
import pytest
from unittest.mock import patch, MagicMock


class TestChunkedTransform:
    """Test the chunked transform endpoint."""

    def _parse_ndjson(self, response):
        """Parse NDJSON response into list of events."""
        data = response.get_data(as_text=True)
        events = []
        for line in data.strip().split('\n'):
            if line.strip():
                events.append(json.loads(line))
        return events

    def test_small_content_single_chunk(self, client):
        """Small content should process as a single chunk."""
        with patch('backend.routes.llm.get_openrouter_service') as mock_get:
            mock_service = MagicMock()
            mock_service.transform_text_chunk.return_value = 'Translated content'
            mock_get.return_value = mock_service

            response = client.post('/api/llm/transform-chunked', json={
                'operation': 'translate',
                'content': '# Hello\n\nShort document.',
                'params': {'target_language': 'Spanish'}
            })

            assert response.status_code == 200
            events = self._parse_ndjson(response)

            # Should have: start, progress, complete
            assert events[0]['type'] == 'start'
            assert events[0]['total_chunks'] == 1
            assert events[0]['was_chunked'] is False
            assert events[-1]['type'] == 'complete'
            assert events[-1]['content'] == 'Translated content'

    def test_large_content_multiple_chunks(self, client):
        """Large content should be split into multiple chunks."""
        # Generate content with multiple sections
        sections = []
        for i in range(5):
            sections.append(f"## Section {i}\n\n" + " ".join(["word"] * 600))
        content = "\n\n".join(sections)

        with patch('backend.routes.llm.get_openrouter_service') as mock_get:
            mock_service = MagicMock()
            mock_service.transform_text_chunk.return_value = 'Translated chunk'
            mock_get.return_value = mock_service

            response = client.post('/api/llm/transform-chunked', json={
                'operation': 'translate',
                'content': content,
                'params': {'target_language': 'Spanish'}
            })

            assert response.status_code == 200
            events = self._parse_ndjson(response)

            start_event = events[0]
            assert start_event['type'] == 'start'
            assert start_event['total_chunks'] > 1
            assert start_event['was_chunked'] is True

            complete_event = events[-1]
            assert complete_event['type'] == 'complete'
            assert complete_event['success'] is True
            assert complete_event['chunks_processed'] > 1

    def test_progress_events_emitted(self, client):
        """Progress events should be emitted for each chunk."""
        sections = []
        for i in range(4):
            sections.append(f"## Section {i}\n\n" + " ".join(["word"] * 600))
        content = "\n\n".join(sections)

        with patch('backend.routes.llm.get_openrouter_service') as mock_get:
            mock_service = MagicMock()
            mock_service.transform_text_chunk.return_value = 'Chunk result'
            mock_get.return_value = mock_service

            response = client.post('/api/llm/transform-chunked', json={
                'operation': 'summarize',
                'content': content,
            })

            events = self._parse_ndjson(response)
            progress_events = [e for e in events if e['type'] == 'progress']
            assert len(progress_events) >= 2

    def test_chunk_error_stops_processing(self, client):
        """If a chunk fails, processing should stop with an error event."""
        sections = []
        for i in range(4):
            sections.append(f"## Section {i}\n\n" + " ".join(["word"] * 600))
        content = "\n\n".join(sections)

        with patch('backend.routes.llm.get_openrouter_service') as mock_get:
            mock_service = MagicMock()
            # First chunk succeeds, second fails
            mock_service.transform_text_chunk.side_effect = [
                'Chunk 1 result',
                RuntimeError('API timeout'),
            ]
            mock_get.return_value = mock_service

            response = client.post('/api/llm/transform-chunked', json={
                'operation': 'translate',
                'content': content,
                'params': {'target_language': 'French'}
            })

            events = self._parse_ndjson(response)
            error_events = [e for e in events if e['type'] == 'error']
            assert len(error_events) == 1
            assert 'timeout' in error_events[0]['error'].lower() or 'API' in error_events[0]['error']

            # Should NOT have a complete event
            complete_events = [e for e in events if e['type'] == 'complete']
            assert len(complete_events) == 0

    def test_missing_content_returns_400(self, client):
        """Missing content should return 400."""
        response = client.post('/api/llm/transform-chunked', json={
            'operation': 'translate',
        })
        assert response.status_code == 400

    def test_missing_operation_returns_400(self, client):
        """Missing operation should return 400."""
        response = client.post('/api/llm/transform-chunked', json={
            'content': 'Some content',
        })
        assert response.status_code == 400

    def test_non_string_content_returns_400(self, client):
        """Non-string content should return 400."""
        response = client.post('/api/llm/transform-chunked', json={
            'operation': 'translate',
            'content': 12345,
        })
        assert response.status_code == 400

    def test_non_string_model_returns_400(self, client):
        """Non-string model should return 400."""
        response = client.post('/api/llm/transform-chunked', json={
            'operation': 'translate',
            'content': 'Valid content',
            'model': ['invalid'],
        })
        assert response.status_code == 400

    def test_response_content_type_is_ndjson(self, client):
        """Response should have application/x-ndjson content type."""
        with patch('backend.routes.llm.get_openrouter_service') as mock_get:
            mock_service = MagicMock()
            mock_service.transform_text_chunk.return_value = 'Result'
            mock_get.return_value = mock_service

            response = client.post('/api/llm/transform-chunked', json={
                'operation': 'summarize',
                'content': '# Hello\n\nShort doc.',
            })

            assert 'application/x-ndjson' in response.content_type

    def test_overlap_context_passed_to_service(self, client):
        """Overlap context should be passed to the service for subsequent chunks."""
        sections = []
        for i in range(3):
            sections.append(f"## Section {i}\n\n" + " ".join(["word"] * 800))
        content = "\n\n".join(sections)

        mock_service = MagicMock()
        mock_service.transform_text_chunk.return_value = 'Translated'

        with patch('backend.routes.llm.get_openrouter_service', return_value=mock_service):
            response = client.post('/api/llm/transform-chunked', json={
                'operation': 'translate',
                'content': content,
                'params': {'target_language': 'German'}
            })

            # Force the streaming response to be consumed
            _ = response.get_data(as_text=True)

            # Check that transform_text_chunk was called multiple times
            assert mock_service.transform_text_chunk.call_count >= 2

            # First call should have empty overlap_context
            first_call_kwargs = mock_service.transform_text_chunk.call_args_list[0][1]
            assert first_call_kwargs.get('overlap_context', '') == ''

    def test_malformed_json_returns_400(self, client):
        """Malformed JSON body should return 400, not 500."""
        response = client.post('/api/llm/transform-chunked',
                              data='{"invalid json, missing bracket',
                              content_type='application/json')
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_service_init_failure_emits_error_event(self, client):
        """If get_openrouter_service() fails, stream should emit error event."""
        with patch('backend.routes.llm.get_openrouter_service',
                   side_effect=RuntimeError('API key missing')):
            response = client.post('/api/llm/transform-chunked', json={
                'operation': 'summarize',
                'content': '# Hello\n\nSome content here.',
            })

            assert response.status_code == 200  # Stream started
            events = self._parse_ndjson(response)

            # Should have start event then error event
            error_events = [e for e in events if e['type'] == 'error']
            assert len(error_events) == 1
            assert 'API key' in error_events[0]['error']

            # Should NOT have a complete event
            complete_events = [e for e in events if e['type'] == 'complete']
            assert len(complete_events) == 0

    def test_stream_always_ends_with_terminal_event(self, client):
        """Stream should always end with either 'complete' or 'error' event."""
        with patch('backend.routes.llm.get_openrouter_service') as mock_get:
            mock_service = MagicMock()
            mock_service.transform_text_chunk.return_value = 'Result'
            mock_get.return_value = mock_service

            response = client.post('/api/llm/transform-chunked', json={
                'operation': 'summarize',
                'content': '# Hello\n\nShort doc.',
            })

            events = self._parse_ndjson(response)
            assert len(events) >= 2
            last_event = events[-1]
            assert last_event['type'] in ('complete', 'error')

    def test_chunk_failure_emits_error_terminal_event(self, client):
        """When a chunk fails, the last event should be an error event."""
        sections = []
        for i in range(3):
            sections.append(f"## Section {i}\n\n" + " ".join(["word"] * 800))
        content = "\n\n".join(sections)

        mock_service = MagicMock()
        mock_service.transform_text_chunk.side_effect = RuntimeError('LLM timeout')

        with patch('backend.routes.llm.get_openrouter_service', return_value=mock_service):
            response = client.post('/api/llm/transform-chunked', json={
                'operation': 'translate',
                'content': content,
                'params': {'target_language': 'French'}
            })

            events = self._parse_ndjson(response)
            last_event = events[-1]
            assert last_event['type'] == 'error'
            assert 'timeout' in last_event['error'].lower() or 'LLM' in last_event['error']
