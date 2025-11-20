"""Configuration management for the markdown viewer backend."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    HOST = os.getenv('BACKEND_HOST', '0.0.0.0')
    PORT = int(os.getenv('BACKEND_PORT', '5000'))

    # OpenRouter
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
    OPENROUTER_DEFAULT_MODEL = os.getenv('OPENROUTER_DEFAULT_MODEL', 'anthropic/claude-3.5-sonnet')

    # Max tokens for LLM responses (higher = longer responses, but more expensive)
    # Adjust based on your typical document size
    OPENROUTER_MAX_TOKENS = int(os.getenv('OPENROUTER_MAX_TOKENS', '8000'))

    # Available models for UI (comma-separated list)
    # Can be configured to show only models you want to use
    _models_env = os.getenv('OPENROUTER_MODELS',
        'anthropic/claude-3.5-sonnet,'
        'anthropic/claude-3-opus,'
        'anthropic/claude-3-haiku,'
        'openai/gpt-4-turbo,'
        'openai/gpt-4,'
        'openai/gpt-3.5-turbo,'
        'google/gemini-pro,'
        'meta-llama/llama-3-70b-instruct'
    )
    OPENROUTER_MODELS = [m.strip() for m in _models_env.split(',') if m.strip()]

    # GitHub OAuth
    GITHUB_CLIENT_ID = os.getenv('GITHUB_CLIENT_ID')
    GITHUB_CLIENT_SECRET = os.getenv('GITHUB_CLIENT_SECRET')
    GITHUB_REDIRECT_URI = os.getenv('GITHUB_REDIRECT_URI', 'http://localhost:5000/api/github/callback')

    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000').split(',')

    # File uploads
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

    # Export settings
    PANDOC_PATH = os.getenv('PANDOC_PATH', 'pandoc')

    @classmethod
    def validate(cls):
        """Validate required configuration."""
        if not cls.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is required")
