"""OpenRouter API service for LLM transformations."""
from openrouter import OpenRouter
from typing import Dict, Any, Optional


class OpenRouterService:
    """Service for interacting with OpenRouter API."""

    def __init__(self, api_key: str, default_model: str = 'anthropic/claude-3.5-sonnet'):
        """Initialize OpenRouter client.

        Args:
            api_key: OpenRouter API key
            default_model: Default model to use for requests
        """
        self.client = OpenRouter(api_key=api_key)
        self.default_model = default_model

    def transform_text(
        self,
        content: str,
        operation: str,
        params: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None
    ) -> str:
        """Transform markdown content using LLM.

        Args:
            content: Markdown content to transform
            operation: Type of transformation (translate, reformat, etc.)
            params: Additional parameters for the operation
            model: Override default model

        Returns:
            Transformed markdown content
        """
        params = params or {}
        model = model or self.default_model

        # Build system prompt to preserve markdown structure
        system_prompt = (
            "You are a markdown transformation assistant. "
            "Preserve ALL markdown syntax (headers, lists, links, code blocks, tables, images). "
            "Only modify the text content as requested. "
            "Return only the transformed markdown without explanations."
        )

        # Build user prompt based on operation
        user_prompt = self._build_prompt(operation, content, params)

        try:
            response = self.client.chat.send(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            raise RuntimeError(f"OpenRouter API error: {str(e)}")

    def custom_prompt(
        self,
        content: str,
        prompt: str,
        model: Optional[str] = None,
        preserve_markdown: bool = True
    ) -> str:
        """Apply custom user prompt to markdown content.

        Args:
            content: Markdown content
            prompt: User's custom transformation prompt
            model: Override default model
            preserve_markdown: Whether to preserve markdown structure

        Returns:
            Transformed content
        """
        model = model or self.default_model

        messages = []

        if preserve_markdown:
            system_prompt = (
                "You are a markdown transformation assistant. "
                "Preserve ALL markdown syntax (headers, lists, links, code blocks, tables, images). "
                "Only modify the text content as requested. "
                "Return only the transformed markdown without explanations."
            )
            messages.append({"role": "system", "content": system_prompt})

        user_message = f"{prompt}\n\n---\n\n{content}"
        messages.append({"role": "user", "content": user_message})

        try:
            response = self.client.chat.send(model=model, messages=messages)
            return response.choices[0].message.content.strip()

        except Exception as e:
            raise RuntimeError(f"OpenRouter API error: {str(e)}")

    def _build_prompt(self, operation: str, content: str, params: Dict[str, Any]) -> str:
        """Build transformation prompt based on operation type.

        Args:
            operation: Type of transformation
            content: Content to transform
            params: Operation parameters

        Returns:
            Formatted prompt string
        """
        if operation == 'translate':
            target_lang = params.get('target_language', 'English')
            return f"Translate the following markdown to {target_lang}:\n\n{content}"

        elif operation == 'remove_newlines':
            mode = params.get('mode', 'smart')
            if mode == 'smart':
                instruction = (
                    "Remove unnecessary newlines within paragraphs, "
                    "but preserve line breaks in lists, code blocks, tables, and block quotes."
                )
            elif mode == 'aggressive':
                instruction = "Remove all newlines except those required for markdown structure."
            else:  # paragraph_only
                instruction = "Join lines only within paragraph blocks, preserve all other structures."

            return f"{instruction}\n\n{content}"

        elif operation == 'change_tone':
            tone = params.get('tone', 'formal')
            return f"Rewrite the following markdown in a {tone} tone:\n\n{content}"

        elif operation == 'summarize':
            length = params.get('length', 'medium')
            return f"Create a {length} summary of the following markdown:\n\n{content}"

        elif operation == 'expand':
            return f"Expand and elaborate on the following markdown content:\n\n{content}"

        else:
            raise ValueError(f"Unknown operation: {operation}")

    def list_available_models(self) -> list:
        """Get list of available models from OpenRouter.

        Returns:
            List of model identifiers
        """
        # Note: OpenRouter Python SDK doesn't expose model listing yet
        # Return common models for now
        return [
            'anthropic/claude-3.5-sonnet',
            'anthropic/claude-3-opus',
            'anthropic/claude-3-haiku',
            'openai/gpt-4-turbo',
            'openai/gpt-4',
            'openai/gpt-3.5-turbo',
            'google/gemini-pro',
            'meta-llama/llama-3-70b-instruct',
        ]
