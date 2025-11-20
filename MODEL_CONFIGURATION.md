# LLM Model Configuration

## Overview

The list of available LLM models is now fully configurable through environment variables instead of being hardcoded.

---

## Configuration

### Environment Variable

Add to your `.env` file:

```bash
# Comma-separated list of model identifiers
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet,openai/gpt-4-turbo,google/gemini-pro
```

### Default Models

If not specified, these models are available by default:

```
anthropic/claude-3.5-sonnet
anthropic/claude-3-opus
anthropic/claude-3-haiku
openai/gpt-4-turbo
openai/gpt-4
openai/gpt-3.5-turbo
google/gemini-pro
meta-llama/llama-3-70b-instruct
```

---

## Usage Examples

### Example 1: Claude Models Only

```bash
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet,anthropic/claude-3-opus,anthropic/claude-3-haiku
```

### Example 2: OpenAI Models Only

```bash
OPENROUTER_MODELS=openai/gpt-4-turbo,openai/gpt-4,openai/gpt-3.5-turbo
```

### Example 3: Budget Models (Haiku + GPT-3.5)

```bash
OPENROUTER_MODELS=anthropic/claude-3-haiku,openai/gpt-3.5-turbo
```

### Example 4: Premium Models Only

```bash
OPENROUTER_MODELS=anthropic/claude-3-opus,openai/gpt-4-turbo
```

### Example 5: Single Model

```bash
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet
```

---

## Finding Model IDs

### Browse OpenRouter Models

Visit: https://openrouter.ai/models

You'll see the full catalog with model IDs like:
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4-turbo-preview`
- `google/gemini-pro-1.5`
- `meta-llama/llama-3.1-405b-instruct`
- `mistralai/mistral-large`
- `cohere/command-r-plus`

### Model ID Format

```
provider/model-name
```

Examples:
- `anthropic/claude-3-opus` ✅
- `openai/gpt-4` ✅
- `claude-3-opus` ❌ (missing provider)
- `anthropic/claude 3 opus` ❌ (spaces not allowed)

---

## Configuration in `.env`

### Full Example

```bash
# Flask Configuration
SECRET_KEY=your-secret-key
DEBUG=False

# Backend Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=5000

# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet

# Available Models (customize this!)
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet,anthropic/claude-3-opus,openai/gpt-4-turbo,google/gemini-pro

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

---

## How It Works

### Backend Configuration

The models list is loaded from `backend/config.py`:

```python
OPENROUTER_MODELS = [m.strip() for m in os.getenv('OPENROUTER_MODELS', 'default,list').split(',')]
```

### API Endpoint

The `/api/llm/models` endpoint returns the configured list:

```bash
curl http://localhost:5000/api/llm/models
```

Response:
```json
{
  "success": true,
  "models": [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4-turbo",
    "google/gemini-pro"
  ]
}
```

### Frontend Dropdown

The frontend automatically fetches this list on page load and populates the model dropdown in the "Custom LLM Prompt" section. The model IDs are converted to friendly names (e.g., `anthropic/claude-3.5-sonnet` becomes "Claude 3.5 Sonnet").

---

## Updating Models Without Restart

### Option 1: Restart Backend

```bash
# Edit .env
nano .env

# Restart backend
python3 start.py
```

### Option 2: Environment Variable Override

```bash
OPENROUTER_MODELS="model1,model2" python3 start.py
```

---

## Common Model Categories

### By Provider

**Anthropic (Claude):**
```bash
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet,anthropic/claude-3-opus,anthropic/claude-3-haiku,anthropic/claude-2.1
```

**OpenAI (GPT):**
```bash
OPENROUTER_MODELS=openai/gpt-4-turbo,openai/gpt-4,openai/gpt-3.5-turbo
```

**Google (Gemini):**
```bash
OPENROUTER_MODELS=google/gemini-pro-1.5,google/gemini-pro,google/gemini-flash
```

**Meta (Llama):**
```bash
OPENROUTER_MODELS=meta-llama/llama-3.1-405b-instruct,meta-llama/llama-3-70b-instruct
```

**Mistral AI:**
```bash
OPENROUTER_MODELS=mistralai/mistral-large,mistralai/mistral-medium,mistralai/mixtral-8x7b
```

### By Use Case

**Best Quality (Expensive):**
```bash
OPENROUTER_MODELS=anthropic/claude-3-opus,openai/gpt-4-turbo,google/gemini-pro-1.5
```

**Balanced (Medium Cost):**
```bash
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet,openai/gpt-4,google/gemini-pro
```

**Fast & Cheap:**
```bash
OPENROUTER_MODELS=anthropic/claude-3-haiku,openai/gpt-3.5-turbo,google/gemini-flash
```

**Open Source:**
```bash
OPENROUTER_MODELS=meta-llama/llama-3.1-405b-instruct,mistralai/mixtral-8x22b,qwen/qwen-2-72b
```

---

## Validation

### Test Your Configuration

```bash
# Start backend
python3 start.py

# In another terminal, test models endpoint
curl http://localhost:5000/api/llm/models

# Should return your configured models
```

### Check Logs

The backend will log the loaded models on startup:

```
✅ Configuration validated
🚀 Starting Markdown Viewer Backend
   Host: 0.0.0.0
   Port: 5000
   Models: 5 configured
```

---

## Troubleshooting

### Issue: Models not showing in dropdown

**Check:**
1. Backend is running
2. `.env` file has `OPENROUTER_MODELS` set
3. Restart backend after changing `.env`
4. Check browser console for API errors

**Test:**
```bash
curl http://localhost:5000/api/llm/models
```

### Issue: Invalid model ID error

**Cause:** Model ID has wrong format

**Solution:** Use format `provider/model-name`
- ✅ `anthropic/claude-3-opus`
- ❌ `claude-3-opus`

### Issue: Model not available

**Cause:** Model may not be available on OpenRouter

**Solution:**
1. Check https://openrouter.ai/models
2. Verify model ID spelling
3. Some models require special access

---

## Best Practices

### 1. Start Small
Begin with 3-5 models you actually use:
```bash
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet,openai/gpt-4-turbo,google/gemini-pro
```

### 2. Group by Purpose
Keep related models together:
```bash
# Translation models (multilingual)
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet,openai/gpt-4-turbo

# Code generation
OPENROUTER_MODELS=anthropic/claude-3-opus,openai/gpt-4

# Quick tasks
OPENROUTER_MODELS=anthropic/claude-3-haiku,openai/gpt-3.5-turbo
```

### 3. Document Your Choices
Add comments in `.env`:
```bash
# Using only Claude models for consistency
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet,anthropic/claude-3-opus
```

### 4. Test Before Production
```bash
# Test with single model first
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet python3 start.py
```

---

## Related Configuration

### Set Default Model

The first model in your list becomes the default if not specified:

```bash
# Default will be claude-3.5-sonnet
OPENROUTER_MODELS=anthropic/claude-3.5-sonnet,openai/gpt-4
```

Or explicitly set:
```bash
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```

### Model Costs

Check pricing at: https://openrouter.ai/models

Configure models based on your budget:
- **Haiku/GPT-3.5**: ~$0.0001-0.001 per 1K tokens
- **Sonnet/GPT-4**: ~$0.001-0.01 per 1K tokens
- **Opus/GPT-4-Turbo**: ~$0.01-0.03 per 1K tokens

---

## Summary

✅ **Before:** Models hardcoded in Python
✅ **After:** Models configurable in `.env`

**Configure:**
```bash
OPENROUTER_MODELS=model1,model2,model3
```

**Restart backend:**
```bash
python3 start.py
```

**Your custom models now appear in the UI!** 🎉
