"""
Unit tests for configuration module.
"""
import os
import runpy
import pytest
import config as config_module
from config import Config


def load_config_with_env(monkeypatch, **env):
    """Load the configuration from scratch with the given environment."""
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    return runpy.run_path(config_module.__file__)['Config']


def test_export_tools_keep_defaults_when_values_are_empty(monkeypatch):
    """The desktop app passes empty values for tools it did not find."""
    config = load_config_with_env(monkeypatch, PANDOC_PATH='', PDF_ENGINE='', RSVG_CONVERT_PATH='')

    assert config.PANDOC_PATH == 'pandoc'
    assert config.PDF_ENGINE == 'xelatex'
    assert config.RSVG_CONVERT_PATH == 'rsvg-convert'


def test_export_settings_come_from_environment(monkeypatch):
    """Test tool paths and fonts are read from the environment."""
    config = load_config_with_env(
        monkeypatch,
        PANDOC_PATH='/opt/pandoc',
        PDF_ENGINE='/opt/xelatex',
        RSVG_CONVERT_PATH='/opt/rsvg-convert',
        PDF_MAIN_FONT='Liberation Serif',
        PDF_MONO_FONT='Liberation Mono'
    )

    assert config.PANDOC_PATH == '/opt/pandoc'
    assert config.PDF_ENGINE == '/opt/xelatex'
    assert config.RSVG_CONVERT_PATH == '/opt/rsvg-convert'
    assert config.PDF_MAIN_FONT == 'Liberation Serif'
    assert config.PDF_MONO_FONT == 'Liberation Mono'


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
