"""
Unit tests for OpenRouter service.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from services.openrouter import OpenRouterService
from config import Config


@pytest.fixture
def openrouter_service():
    """Create OpenRouterService instance."""
    return OpenRouterService()


@pytest.fixture
def mock_openrouter_client():
    """Mock OpenRouter client."""
    with patch('services.openrouter.OpenAI') as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


class TestOpenRouterService:
    """Test cases for OpenRouter service."""

    def test_init(self, openrouter_service):
        """Test service initialization."""
        assert openrouter_service.api_key == Config.OPENROUTER_API_KEY
        assert openrouter_service.default_model == Config.OPENROUTER_DEFAULT_MODEL

    def test_list_available_models(self, openrouter_service):
        """Test listing available models."""
        models = openrouter_service.list_available_models()
        assert isinstance(models, list)
        assert len(models) > 0
        assert all(isinstance(model, dict) for model in models)
        assert all('id' in model and 'name' in model for model in models)

    @patch('services.openrouter.OpenAI')
    def test_transform_text_translate(self, mock_openai, sample_markdown):
        """Test text transformation - translation."""
        # Setup mock
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="# Documento de Prueba"))]
        mock_client.chat.completions.create.return_value = mock_response

        service = OpenRouterService()
        result = service.transform_text(
            content=sample_markdown,
            operation='translate',
            params={'target_language': 'Spanish'}
        )

        assert result == "# Documento de Prueba"
        mock_client.chat.completions.create.assert_called_once()

    @patch('services.openrouter.OpenAI')
    def test_transform_text_change_tone(self, mock_openai, sample_markdown):
        """Test text transformation - tone change."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Casual content"))]
        mock_client.chat.completions.create.return_value = mock_response

        service = OpenRouterService()
        result = service.transform_text(
            content=sample_markdown,
            operation='change_tone',
            params={'tone': 'casual'}
        )

        assert result == "Casual content"

    @patch('services.openrouter.OpenAI')
    def test_transform_text_summarize(self, mock_openai, sample_markdown):
        """Test text transformation - summarization."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Summary here"))]
        mock_client.chat.completions.create.return_value = mock_response

        service = OpenRouterService()
        result = service.transform_text(
            content=sample_markdown,
            operation='summarize',
            params={}
        )

        assert result == "Summary here"

    @patch('services.openrouter.OpenAI')
    def test_transform_text_expand(self, mock_openai, sample_markdown):
        """Test text transformation - expansion."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Expanded content"))]
        mock_client.chat.completions.create.return_value = mock_response

        service = OpenRouterService()
        result = service.transform_text(
            content=sample_markdown,
            operation='expand',
            params={}
        )

        assert result == "Expanded content"

    @patch('services.openrouter.OpenAI')
    def test_transform_text_with_custom_model(self, mock_openai, sample_markdown):
        """Test transformation with custom model."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Result"))]
        mock_client.chat.completions.create.return_value = mock_response

        service = OpenRouterService()
        service.transform_text(
            content=sample_markdown,
            operation='summarize',
            params={},
            model='openai/gpt-4'
        )

        # Verify custom model was used
        call_args = mock_client.chat.completions.create.call_args
        assert call_args[1]['model'] == 'openai/gpt-4'

    @patch('services.openrouter.OpenAI')
    def test_custom_prompt(self, mock_openai, sample_markdown):
        """Test custom prompt functionality."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Custom result"))]
        mock_client.chat.completions.create.return_value = mock_response

        service = OpenRouterService()
        result = service.custom_prompt(
            content=sample_markdown,
            prompt="Make this funny",
            preserve_markdown=True
        )

        assert result == "Custom result"
        call_args = mock_client.chat.completions.create.call_args
        assert "preserve markdown structure" in call_args[1]['messages'][0]['content'].lower()

    @patch('services.openrouter.OpenAI')
    def test_custom_prompt_without_preserve(self, mock_openai, sample_markdown):
        """Test custom prompt without markdown preservation."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Result"))]
        mock_client.chat.completions.create.return_value = mock_response

        service = OpenRouterService()
        result = service.custom_prompt(
            content=sample_markdown,
            prompt="Analyze this",
            preserve_markdown=False
        )

        assert result == "Result"
        call_args = mock_client.chat.completions.create.call_args
        assert "preserve markdown structure" not in call_args[1]['messages'][0]['content'].lower()

    @patch('services.openrouter.OpenAI')
    def test_generate_regex_pattern(self, mock_openai):
        """Test regex pattern generation."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        json_response = '{"pattern": "\\\\d{3}-\\\\d{2}-\\\\d{4}", "explanation": "SSN format"}'
        mock_response.choices = [MagicMock(message=MagicMock(content=json_response))]
        mock_client.chat.completions.create.return_value = mock_response

        service = OpenRouterService()
        result = service.generate_regex_pattern(
            description="Match Social Security Number",
            mode="search"
        )

        assert 'pattern' in result
        assert 'explanation' in result
        assert result['pattern'] == '\\d{3}-\\d{2}-\\d{4}'

    @patch('services.openrouter.OpenAI')
    def test_generate_regex_pattern_replace_mode(self, mock_openai):
        """Test regex pattern generation in replace mode."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_response = MagicMock()
        json_response = '{"pattern": "foo", "replacement": "bar", "explanation": "Replace foo with bar"}'
        mock_response.choices = [MagicMock(message=MagicMock(content=json_response))]
        mock_client.chat.completions.create.return_value = mock_response

        service = OpenRouterService()
        result = service.generate_regex_pattern(
            description="Replace foo with bar",
            mode="replace"
        )

        assert 'pattern' in result
        assert 'replacement' in result
        assert result['replacement'] == 'bar'

    @patch('services.openrouter.OpenAI')
    def test_api_error_handling(self, mock_openai, sample_markdown):
        """Test API error handling."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_client.chat.completions.create.side_effect = Exception("API Error")

        service = OpenRouterService()
        with pytest.raises(Exception, match="API Error"):
            service.transform_text(
                content=sample_markdown,
                operation='summarize',
                params={}
            )

    def test_build_prompt_translate(self, openrouter_service):
        """Test prompt building for translation."""
        prompt = openrouter_service._build_prompt('translate', {'target_language': 'French'})
        assert 'translate' in prompt.lower()
        assert 'french' in prompt.lower()
        assert 'markdown structure' in prompt.lower()

    def test_build_prompt_change_tone(self, openrouter_service):
        """Test prompt building for tone change."""
        prompt = openrouter_service._build_prompt('change_tone', {'tone': 'formal'})
        assert 'tone' in prompt.lower()
        assert 'formal' in prompt.lower()

    def test_build_prompt_invalid_operation(self, openrouter_service):
        """Test prompt building with invalid operation."""
        prompt = openrouter_service._build_prompt('invalid_op', {})
        # Should return a default prompt
        assert isinstance(prompt, str)
        assert len(prompt) > 0
