"""
Unit tests for configuration module.
"""
import os
import pytest
from config import Config


def test_config_defaults():
    """Test default configuration values."""
    assert Config.DEBUG is True
    assert Config.HOST == '0.0.0.0'
    assert Config.PORT == 5000
    assert Config.FLASK_PORT == 5050


def test_config_validation_missing_api_key(monkeypatch):
    """Test config validation fails when API key is missing."""
    monkeypatch.delenv('OPENROUTER_API_KEY', raising=False)

    with pytest.raises(ValueError, match="OPENROUTER_API_KEY"):
        Config.validate()


def test_config_validation_with_api_key(monkeypatch):
    """Test config validation passes with API key."""
    monkeypatch.setenv('OPENROUTER_API_KEY', 'test-key')

    # Should not raise
    Config.validate()


def test_config_cors_origins():
    """Test CORS origins configuration."""
    origins = Config.CORS_ORIGINS
    assert isinstance(origins, list)
    assert len(origins) >= 2
    assert 'http://localhost:8000' in origins


def test_config_translation_languages():
    """Test translation languages configuration."""
    languages = Config.TRANSLATION_LANGUAGES
    assert isinstance(languages, list)
    assert len(languages) > 0
    assert 'Spanish' in languages
    assert 'French' in languages


def test_config_openrouter_models():
    """Test OpenRouter models configuration."""
    models = Config.OPENROUTER_MODELS
    assert isinstance(models, list)
    assert len(models) > 0
    # Check for at least one model
    assert any('claude' in model.lower() or 'gpt' in model.lower() for model in models)


def test_config_file_upload_limits():
    """Test file upload configuration."""
    assert Config.MAX_CONTENT_LENGTH == 16 * 1024 * 1024  # 16MB


def test_config_bookstack_settings():
    """Test BookStack configuration."""
    assert hasattr(Config, 'BOOKSTACK_URL')
    assert hasattr(Config, 'BOOKSTACK_API_TIMEOUT')
    assert Config.BOOKSTACK_API_TIMEOUT == 30
