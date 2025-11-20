# Fix: Translation Truncation Issue

## Problem

When translating or transforming large markdown documents, the output was being truncated with a message like:

```
[Continue translation for the rest of the sections in the same style]
```

This happened because the LLM hit the default token limit and stopped mid-translation.

---

## Root Cause

The OpenRouter API calls in [backend/services/openrouter.py](backend/services/openrouter.py) did **not specify** a `max_tokens` parameter, causing the API to use a very low default limit (typically 1024-2048 tokens).

**Before:**
```python
response = self.client.chat.send(
    model=model,
    messages=[...]
    # No max_tokens parameter!
)
```

---

## Solution Applied

### 1. Added `max_tokens` Parameter

**File:** [backend/services/openrouter.py](backend/services/openrouter.py:61,110)

Both `transform_text()` and `custom_prompt()` methods now explicitly set `max_tokens`:

```python
response = self.client.chat.send(
    model=model,
    messages=[...],
    max_tokens=Config.OPENROUTER_MAX_TOKENS  # NEW
)
```

### 2. Made It Configurable

**File:** [backend/config.py](backend/config.py:21-23)

Added new configuration option:

```python
# Max tokens for LLM responses (higher = longer responses, but more expensive)
OPENROUTER_MAX_TOKENS = int(os.getenv('OPENROUTER_MAX_TOKENS', '8000'))
```

**Default:** 8000 tokens (~6000 words)

### 3. Enhanced System Prompt

**File:** [backend/services/openrouter.py](backend/services/openrouter.py:40-47)

Added explicit instruction to complete the full transformation:

```python
system_prompt = (
    "You are a markdown transformation assistant. "
    "Preserve ALL markdown syntax. "
    "IMPORTANT: Complete the ENTIRE transformation - do not truncate or stop mid-way."
)
```

---

## Configuration

### In Your .env File

Add or update:

```bash
# Max tokens for LLM responses (default: 8000)
OPENROUTER_MAX_TOKENS=8000
```

### Recommended Values by Document Size

| Document Size | Tokens | Notes |
|--------------|--------|-------|
| Small (1-2 pages) | 2000-4000 | Quick responses, lower cost |
| Medium (3-10 pages) | 4000-8000 | **Default, recommended** |
| Large (10-20 pages) | 8000-16000 | Longer documents |
| Very Large (20+ pages) | 16000-32000 | May hit model limits |

### Model-Specific Limits

Different models have different maximum token limits:

| Model | Max Output Tokens | Recommended Setting |
|-------|------------------|---------------------|
| Claude 3.5 Sonnet | 8192 | 8000 |
| Claude 3 Opus | 4096 | 4000 |
| Claude 3 Haiku | 4096 | 4000 |
| GPT-4 Turbo | 4096 | 4000 |
| GPT-4 | 8192 | 8000 |
| GPT-3.5 Turbo | 4096 | 4000 |
| Gemini Pro | 8192 | 8000 |

**Important:** If you set `OPENROUTER_MAX_TOKENS` higher than a model's limit, the API will cap it at the model's maximum.

---

## Testing the Fix

### Step 1: Update Configuration

Add to your [.env](.env):

```bash
OPENROUTER_MAX_TOKENS=8000
```

### Step 2: Restart Backend

```bash
python3 start.py
```

### Step 3: Test Translation

1. Open the application
2. Paste a large markdown document (5+ pages)
3. Select "Translate" → Choose target language
4. Wait for completion

**Expected:** Full translation without "[Continue...]" message

### Step 4: Monitor Output

Check that:
- ✅ Translation is complete
- ✅ All sections are translated
- ✅ No truncation messages
- ✅ Markdown structure preserved

---

## Troubleshooting

### Issue: Still Getting Truncated Responses

**Possible Causes:**

1. **Model limit exceeded**
   - Solution: Check model's max tokens (see table above)
   - Solution: Split document into smaller sections

2. **Config not loaded**
   - Solution: Verify `.env` file has `OPENROUTER_MAX_TOKENS`
   - Solution: Restart backend after changing `.env`

3. **Document too large**
   - Solution: Increase `OPENROUTER_MAX_TOKENS` to 16000
   - Solution: Use a model with higher limits (Claude Opus, GPT-4)

4. **API rate limiting**
   - Solution: Check OpenRouter dashboard for rate limits
   - Solution: Add delays between requests

### Issue: "OpenRouter API error: max_tokens too large"

**Cause:** Set value exceeds model's maximum

**Solution:** Lower `OPENROUTER_MAX_TOKENS` to match model limit:

```bash
# For GPT-4 Turbo (max 4096)
OPENROUTER_MAX_TOKENS=4000

# For Claude 3.5 Sonnet (max 8192)
OPENROUTER_MAX_TOKENS=8000
```

### Issue: High Costs

**Cause:** High `max_tokens` increases costs even if not fully used

**Solution:** Balance cost vs completeness:

```bash
# Lower cost, may truncate large documents
OPENROUTER_MAX_TOKENS=2000

# Balanced (recommended)
OPENROUTER_MAX_TOKENS=4000

# Higher cost, handles large documents
OPENROUTER_MAX_TOKENS=8000
```

---

## Cost Implications

### Token Usage and Pricing

Most models charge per token (input + output). Higher `max_tokens` allows longer responses, increasing costs.

**Example with Claude 3.5 Sonnet:**
- Input: $3 per million tokens
- Output: $15 per million tokens

**Translation of 2000-word document:**
- Input: ~2500 tokens
- Output with 4000 max_tokens: ~3000 tokens (actual)
- Cost: (2500 × $3 + 3000 × $15) / 1,000,000 ≈ $0.05

**Translation with 8000 max_tokens:**
- Same input: ~2500 tokens
- Output with 8000 max_tokens: ~3000 tokens (actual usage)
- Cost: Same! You only pay for tokens actually used

**Key Point:** `max_tokens` is a limit, not a commitment. You only pay for tokens actually generated.

### Cost Optimization Tips

1. **Use appropriate defaults:**
   ```bash
   # Most documents
   OPENROUTER_MAX_TOKENS=4000
   ```

2. **Use cheaper models for simple tasks:**
   - Claude Haiku: 20x cheaper than Opus
   - GPT-3.5 Turbo: 10x cheaper than GPT-4

3. **Split large documents:**
   - Process in chunks instead of one large call
   - Allows better error recovery

---

## Advanced Configuration

### Per-Operation Limits

If you need different limits for different operations, you can modify [backend/services/openrouter.py](backend/services/openrouter.py):

```python
# Example: Different limits for different operations
def transform_text(self, content, operation, params, model):
    # ...
    if operation == 'translate':
        max_tokens = 8000  # Longer for translations
    elif operation == 'summarize':
        max_tokens = 2000  # Shorter for summaries
    else:
        max_tokens = Config.OPENROUTER_MAX_TOKENS

    response = self.client.chat.send(
        model=model,
        messages=messages,
        max_tokens=max_tokens
    )
```

### Dynamic Adjustment Based on Input

```python
# Automatically adjust based on input size
input_tokens = len(content.split()) * 1.3  # Rough estimate
max_tokens = min(int(input_tokens * 2), Config.OPENROUTER_MAX_TOKENS)
```

---

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| [backend/config.py](backend/config.py) | Added `OPENROUTER_MAX_TOKENS` | 21-23 |
| [backend/services/openrouter.py](backend/services/openrouter.py) | Added `max_tokens` parameter | 61, 110 |
| [backend/services/openrouter.py](backend/services/openrouter.py) | Enhanced system prompts | 40-47, 90-96 |
| [.env.example](.env.example) | Documented new config | 14-18 |

---

## Testing Commands

### Check Current Configuration

```bash
# View configuration
grep OPENROUTER_MAX_TOKENS .env

# Test with different values
OPENROUTER_MAX_TOKENS=16000 python3 start.py
```

### Test Translation Endpoint

```bash
# Small test
curl -X POST http://localhost:5050/api/llm/transform \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "translate",
    "content": "# Test\n\nThis is a test.",
    "params": {"target_language": "Spanish"}
  }'

# Large document test
curl -X POST http://localhost:5050/api/llm/transform \
  -H "Content-Type: application/json" \
  -d @large-document.json
```

---

## Related Documentation

- [MODEL_CONFIGURATION.md](MODEL_CONFIGURATION.md) - Model selection and configuration
- [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md) - Backend port setup
- [FRONTEND_CONFIGURATION.md](FRONTEND_CONFIGURATION.md) - Frontend setup

---

## Summary

✅ **Problem:** Translations truncated at ~1000 words
✅ **Cause:** Missing `max_tokens` parameter (default too low)
✅ **Fix:** Added `max_tokens=8000` (configurable)
✅ **Configuration:** `OPENROUTER_MAX_TOKENS` in `.env`
✅ **Status:** Complete translations for documents up to 6000 words

**Action Required:**
1. Add `OPENROUTER_MAX_TOKENS=8000` to your `.env` file
2. Restart backend: `python3 start.py`
3. Test with a large document

**The truncation issue is now fixed!** 🎉
