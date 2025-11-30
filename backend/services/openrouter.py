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
            "Return ONLY the transformed markdown with ZERO explanations, comments, or meta-commentary. "
            "NEVER add phrases like 'Would you like me to continue', 'Continue with...', '[Continue...]', etc. "
            "IMPORTANT: Complete the ENTIRE transformation from beginning to end - do not truncate or stop mid-way. "
            "Your response should START with the transformed content and END with the transformed content. Nothing else."
        )

        # Build user prompt based on operation
        user_prompt = self._build_prompt(operation, content, params)

        try:
            from backend.config import Config

            response = self.client.chat.send(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=Config.OPENROUTER_MAX_TOKENS,
                temperature=0.3  # Lower temperature = more focused, less creative/chatty
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
                "Return ONLY the transformed markdown with ZERO explanations, comments, or meta-commentary. "
                "NEVER add phrases like 'Would you like me to continue', 'Continue with...', '[Continue...]', etc. "
                "IMPORTANT: Complete the ENTIRE transformation from beginning to end - do not truncate or stop mid-way. "
                "Your response should START with the transformed content and END with the transformed content. Nothing else."
            )
            messages.append({"role": "system", "content": system_prompt})

        user_message = f"{prompt}\n\n---\n\n{content}"
        messages.append({"role": "user", "content": user_message})

        try:
            from backend.config import Config

            response = self.client.chat.send(
                model=model,
                messages=messages,
                max_tokens=Config.OPENROUTER_MAX_TOKENS,
                temperature=0.3  # Lower temperature = more focused, less creative/chatty
            )
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
            return (
                f"Translate ALL of the following markdown content to {target_lang}. "
                f"Do NOT ask if you should continue. "
                f"Do NOT add any comments like 'Would you like me to continue' or 'Continue with remaining sections'. "
                f"Just provide the COMPLETE translation from start to finish. "
                f"Translate EVERY section, EVERY paragraph, EVERY line.\n\n"
                f"{content}"
            )

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
        """Get list of available models from configuration.

        Returns:
            List of model identifiers from Config.OPENROUTER_MODELS
        """
        from backend.config import Config
        return Config.OPENROUTER_MODELS

    def generate_regex_pattern(
        self,
        description: str,
        mode: str = 'find',
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate regex pattern from natural language description.

        Args:
            description: Natural language description of what to find
            mode: 'find' or 'replace'
            model: Override default model

        Returns:
            Dict containing pattern, flags, explanation, and examples
        """
        model = model or self.default_model

        system_prompt = (
            "You are a regex pattern generator. Generate regular expression patterns "
            "from natural language descriptions. Respond ONLY with valid JSON. "
            "No additional text, explanations, or markdown formatting."
        )

        user_prompt = f"""Generate a regular expression pattern based on this description:

"{description}"

Mode: {mode}

Respond with a JSON object containing:
- pattern: the regex pattern (without delimiters, properly escaped for JSON)
- flags: regex flags (e.g., "g", "gm", "gi")
- explanation: brief explanation of what the pattern does
- examples: array of 2-3 example matches
{f'- replacement: suggested replacement pattern' if mode == 'replace' else ''}

Example response:
{{
  "pattern": "^#{1,6}\\\\s+.+$",
  "flags": "gm",
  "explanation": "Matches all markdown headers from # to ######",
  "examples": ["# Title", "## Subtitle", "### Section"],
  "replacement": ""
}}

Respond with ONLY the JSON object, no other text."""

        try:
            from backend.config import Config
            import json
            import re

            response = self.client.chat.send(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1000,
                temperature=0.2  # Low temperature for consistent JSON output
            )

            response_text = response.choices[0].message.content.strip()

            # Try to extract JSON from the response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group(0))
                return {
                    'pattern': result.get('pattern', ''),
                    'flags': result.get('flags', 'g'),
                    'explanation': result.get('explanation', 'Pattern generated by AI'),
                    'examples': result.get('examples', []),
                    'replacement': result.get('replacement', '')
                }
            else:
                raise ValueError("Could not extract JSON from response")

        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse LLM response as JSON: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"OpenRouter API error: {str(e)}")
