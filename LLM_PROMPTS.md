# LLM Prompts Reference

This document contains all LLM prompts used in the Markdown Viewer application.

**Note on Formatting:** Prompts in this document are shown with line breaks for readability. In the actual code, these are concatenated into single strings with spaces between sentences.

---

## System Prompts

### Main Transformation System Prompt

**Location:** [backend/services/openrouter.py:41-49](backend/services/openrouter.py:41-49)

**Used for:** All predefined transformations (translate, change tone, summarize, expand)

```
You are a markdown transformation assistant.
Preserve ALL markdown syntax (headers, lists, links, code blocks, tables, images).
Only modify the text content as requested.
Return ONLY the transformed markdown with ZERO explanations, comments, or meta-commentary.
NEVER add phrases like 'Would you like me to continue', 'Continue with...', '[Continue...]', etc.
IMPORTANT: Complete the ENTIRE transformation from beginning to end - do not truncate or stop mid-way.
Your response should START with the transformed content and END with the transformed content.
Nothing else.
```

**Key Features:**
- Preserves markdown syntax
- Forbids meta-commentary
- Lists specific forbidden phrases
- Requires complete transformation
- Bookends response format

---

### Custom Prompt System Prompt

**Location:** [backend/services/openrouter.py:88-96](backend/services/openrouter.py:88-96)

**Used for:** User-defined custom transformations

**When `preserve_markdown=True`:**
```
You are a markdown transformation assistant.
Preserve ALL markdown syntax (headers, lists, links, code blocks, tables, images).
Only modify the text content as requested.
Return ONLY the transformed markdown with ZERO explanations, comments, or meta-commentary.
NEVER add phrases like 'Would you like me to continue', 'Continue with...', '[Continue...]', etc.
IMPORTANT: Complete the ENTIRE transformation from beginning to end - do not truncate or stop mid-way.
Your response should START with the transformed content and END with the transformed content.
Nothing else.
```

**When `preserve_markdown=False`:**
- No system prompt (user has full control)

---

## Operation-Specific User Prompts

### 1. Translation

**Location:** [backend/services/openrouter.py:119-126](backend/services/openrouter.py:119-126)

**Operation:** `translate`

**Parameters:** `target_language` (e.g., "Spanish", "French", "Russian")

**Prompt Template:**
```
Translate ALL of the following markdown content to {target_language}.
Do NOT ask if you should continue.
Do NOT add any comments like 'Would you like me to continue' or 'Continue with remaining sections'.
Just provide the COMPLETE translation from start to finish.
Translate EVERY section, EVERY paragraph, EVERY line.

{content}
```

**Example (Spanish):**
```
Translate ALL of the following markdown content to Spanish.
Do NOT ask if you should continue.
Do NOT add any comments like 'Would you like me to continue' or 'Continue with remaining sections'.
Just provide the COMPLETE translation from start to finish.
Translate EVERY section, EVERY paragraph, EVERY line.

# Getting Started

This guide will help you...
```

**Design Rationale:**
- Explicitly says "ALL" and "EVERY"
- Lists forbidden meta-commentary
- Imperative language ("Do NOT ask")
- Removes ambiguity about completeness

---

### 2. Remove Newlines

**Location:** [backend/services/openrouter.py:128-144](backend/services/openrouter.py:128-144)

**Operation:** `remove_newlines`

**Parameters:** `mode` = `smart` | `paragraph` | `aggressive`

#### Mode: Smart (Default)
```
Remove unnecessary newlines within paragraphs.
Preserve line breaks in lists, code blocks, tables, and block quotes.

{content}
```

#### Mode: Paragraph Only
```
Join lines only within paragraph blocks.
Preserve all other structures.

{content}
```

#### Mode: Aggressive
```
Remove all newlines except those required for markdown structure.

{content}
```

**Design Rationale:**
- Different modes for different use cases
- Smart mode preserves markdown structure
- Clear instructions about what to preserve

---

### 3. Change Tone

**Location:** [backend/services/openrouter.py:146-148](backend/services/openrouter.py:146-148)

**Operation:** `change_tone`

**Parameters:** `tone` (e.g., "formal", "casual", "technical", "friendly")

**Prompt Template:**
```
Rewrite the following markdown in a {tone} tone:

{content}
```

**Examples:**

**Formal:**
```
Rewrite the following markdown in a formal tone:

# Hey there!

Let's get started with this cool app...
```

**Casual:**
```
Rewrite the following markdown in a casual tone:

# Introduction

This document provides comprehensive information...
```

**Technical:**
```
Rewrite the following markdown in a technical tone:

# How It Works

This feature uses some technology to do things...
```

---

### 4. Summarize

**Location:** [backend/services/openrouter.py:150-152](backend/services/openrouter.py:150-152)

**Operation:** `summarize`

**Parameters:** `length` = `short` | `medium` | `long` (default: `medium`)

**Prompt Template:**
```
Create a {length} summary of the following markdown:

{content}
```

**Examples:**

**Short:**
```
Create a short summary of the following markdown:

{content}
```

**Medium:**
```
Create a medium summary of the following markdown:

{content}
```

**Long:**
```
Create a long summary of the following markdown:

{content}
```

**Design Rationale:**
- Simple and clear
- Length parameter gives user control
- Preserves markdown in output via system prompt

---

### 5. Expand

**Location:** [backend/services/openrouter.py:154-155](backend/services/openrouter.py:154-155)

**Operation:** `expand`

**Parameters:** None

**Prompt Template:**
```
Expand and elaborate on the following markdown content:

{content}
```

**Design Rationale:**
- Simple instruction
- LLM adds detail and explanation
- Useful for turning outlines into full documents

---

### 6. Custom Prompt

**Location:** [backend/services/openrouter.py:99-100](backend/services/openrouter.py:99-100)

**Operation:** `custom_prompt` (user-defined)

**Parameters:**
- `prompt` (user-provided instruction)
- `preserve_markdown` (boolean)

**Prompt Template:**
```
{user_prompt}

---

{content}
```

**Example:**
```
Make this more technical and add code examples where appropriate

---

# Getting Started

This guide will help you...
```

**Design Rationale:**
- User prompt first (instruction)
- Separator (`---`)
- Content second (material to transform)
- Gives user maximum flexibility

---

## API Parameters

### Standard Parameters (All Operations)

**Location:** [backend/services/openrouter.py:57-65](backend/services/openrouter.py:57-65)

```python
response = self.client.chat.send(
    model=model,                              # Model ID (e.g., "anthropic/claude-3.5-sonnet")
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    max_tokens=Config.OPENROUTER_MAX_TOKENS,  # Default: 8000
    temperature=0.3                            # Lower = more focused
)
```

**Parameter Details:**

| Parameter | Type | Default | Purpose |
|-----------|------|---------|---------|
| `model` | string | `anthropic/claude-3.5-sonnet` | Which LLM to use |
| `messages` | array | System + User | Conversation history |
| `max_tokens` | integer | 8000 | Maximum response length |
| `temperature` | float | 0.3 | Randomness (0.0-2.0) |

---

## Temperature Settings

**Location:** [backend/services/openrouter.py:64,109](backend/services/openrouter.py:64,109)

**Current Setting:** `0.3`

**Why 0.3?**
- Lower than default (0.7-1.0)
- More deterministic and focused
- Reduces creative "helpful" behaviors
- Less likely to add meta-commentary
- Perfect for translation/transformation tasks

**Temperature Scale:**

| Value | Behavior | Best For |
|-------|----------|----------|
| 0.0 | Deterministic | Math, code |
| 0.1-0.3 | Focused | **Translation, formatting** (current) |
| 0.5-0.7 | Balanced | General tasks |
| 0.8-1.0 | Creative | Writing, brainstorming |
| 1.0+ | Very creative | Creative writing |

---

## Prompt Engineering Principles Used

### 1. Explicit Negatives
Instead of just saying what to do, explicitly say what NOT to do:

❌ **Weak:** "Translate the markdown"
✅ **Strong:** "Translate ALL markdown. Do NOT ask if you should continue."

### 2. List Forbidden Phrases
Give specific examples of unwanted behavior:

```
NEVER add phrases like 'Would you like me to continue', 'Continue with...', '[Continue...]', etc.
```

### 3. Imperative Language
Use commands, not requests:

❌ **Weak:** "Please translate"
✅ **Strong:** "Translate ALL"

### 4. Bookending
Explicitly state format of response:

```
Your response should START with the transformed content and END with the transformed content. Nothing else.
```

### 5. Emphasis Words
Use CAPS for critical instructions:

```
Translate EVERY section, EVERY paragraph, EVERY line.
```

### 6. Redundancy
Repeat critical instructions in different ways:

```
Complete the ENTIRE transformation
Do not truncate or stop mid-way
Translate EVERY section
```

---

## Troubleshooting Prompts

### If Model Still Adds Meta-Commentary

**Option 1: Stronger Translation Prompt**
```python
return (
    f"CRITICAL INSTRUCTION: Translate EVERY SINGLE WORD of the markdown below to {target_lang}. "
    f"ABSOLUTE REQUIREMENT: Do NOT include ANY meta-commentary, questions, or continuation prompts. "
    f"FORBIDDEN PHRASES: 'Would you like', 'Continue with', 'Should I continue', '[Continue...]', etc. "
    f"OUTPUT REQUIREMENT: Start immediately with translated content. "
    f"End with translated content. "
    f"Do the COMPLETE translation NOW:\n\n"
    f"{content}"
)
```

**How this appears to the LLM:**
```
CRITICAL INSTRUCTION: Translate EVERY SINGLE WORD of the markdown below to Spanish.
ABSOLUTE REQUIREMENT: Do NOT include ANY meta-commentary, questions, or continuation prompts.
FORBIDDEN PHRASES: 'Would you like', 'Continue with', 'Should I continue', '[Continue...]', etc.
OUTPUT REQUIREMENT: Start immediately with translated content.
End with translated content.
Do the COMPLETE translation NOW:

{content}
```

**Option 2: Prefix Constraint**
```python
f"Translate to {target_lang}. "
f"Output only the translation. "
f"Start your response with the first translated character:\n\n"
f"{content}"
```

**How this appears to the LLM:**
```
Translate to Spanish.
Output only the translation.
Start your response with the first translated character:

{content}
```

**Option 3: Even Lower Temperature**
```python
temperature=0.1  # Very deterministic
```

---

## Adding New Operations

### Template for New Operation

1. **Add to `_build_prompt()` method:**

```python
elif operation == 'your_operation':
    your_param = params.get('your_param', 'default_value')
    return (
        f"Clear instruction about what to do with {your_param}. "
        f"Do NOT add meta-commentary. "
        f"Complete the ENTIRE transformation.\n\n"
        f"{content}"
    )
```

2. **Add route handler:**

```python
@llm_bp.route('/your-operation', methods=['POST'])
def your_operation():
    data = request.get_json()
    service = get_openrouter_service()
    result = service.transform_text(
        content=data['content'],
        operation='your_operation',
        params={'your_param': data.get('your_param')}
    )
    return jsonify({'success': True, 'content': result})
```

3. **Add frontend button:**

```javascript
document.getElementById('action-your-operation').addEventListener('click', async () => {
    const content = getContent();
    const result = await APIClient.post('/llm/transform', {
        operation: 'your_operation',
        content: content,
        params: { your_param: 'value' }
    });
    setContent(result.content);
});
```

---

## Examples of Good vs Bad Prompts

### Translation

❌ **Bad (Weak):**
```
Translate this to Spanish:

{content}
```

**Problems:**
- No instruction about completeness
- Doesn't forbid meta-commentary
- Too brief

✅ **Good (Current):**
```
Translate ALL of the following markdown content to Spanish.
Do NOT ask if you should continue.
Do NOT add any comments like 'Would you like me to continue' or 'Continue with remaining sections'.
Just provide the COMPLETE translation from start to finish.
Translate EVERY section, EVERY paragraph, EVERY line.

{content}
```

**Strengths:**
- Explicit about completeness
- Lists forbidden behaviors
- Clear and imperative

---

### Summarize

❌ **Bad:**
```
Make this shorter:

{content}
```

**Problems:**
- Vague instruction
- No guidance on length
- Doesn't preserve markdown

✅ **Good (Current):**
```
Create a medium summary of the following markdown:

{content}
```

**Plus system prompt:**
```
Preserve ALL markdown syntax...
```

**Strengths:**
- Clear instruction
- Length parameter
- System prompt ensures markdown preservation

---

## Testing Prompts

### Manual Testing

Test each operation with:

1. **Short document** (1-2 paragraphs)
2. **Medium document** (5-10 sections)
3. **Long document** (20+ sections)

### Expected Behaviors

✅ **Good Response:**
- Starts immediately with transformed content
- Completes full transformation
- No meta-commentary
- Preserves markdown syntax
- No truncation

❌ **Bad Response:**
- Asks "Would you like me to continue?"
- Adds explanations like "Here's the translation:"
- Includes "[Continue...]" or similar
- Truncates mid-document
- Breaks markdown syntax

---

## Configuration

### Environment Variables

**In `.env` file:**

```bash
# Model selection
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet

# Response length limit
OPENROUTER_MAX_TOKENS=8000

# Temperature (if you make it configurable)
OPENROUTER_TEMPERATURE=0.3
```

### Model Recommendations

| Model | Translation | Summarize | Tone Change | Expand |
|-------|-------------|-----------|-------------|--------|
| Claude 3.5 Sonnet | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Claude 3 Opus | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Claude 3 Haiku | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| GPT-4 Turbo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| GPT-3.5 Turbo | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

**Note:** Claude Haiku may add meta-commentary more often. Use stronger prompts or choose Sonnet.

---

## Related Files

- [backend/services/openrouter.py](backend/services/openrouter.py) - Main prompt implementations
- [backend/routes/llm.py](backend/routes/llm.py) - API endpoints
- [TRANSLATION_DEEP_ANALYSIS.md](TRANSLATION_DEEP_ANALYSIS.md) - Prompt engineering analysis
- [backend/config.py](backend/config.py) - Configuration settings

---

## Summary

All prompts in this application follow these principles:

1. ✅ **Explicit instructions** - Say exactly what to do
2. ✅ **Forbidden behaviors** - List what NOT to do
3. ✅ **Imperative language** - Use commands, not requests
4. ✅ **Emphasis on completeness** - "ALL", "EVERY", "ENTIRE"
5. ✅ **Bookended format** - Define start and end of response
6. ✅ **Low temperature** - 0.3 for focused, deterministic output
7. ✅ **Markdown preservation** - System prompt ensures structure maintained

**Result:** Reliable, complete transformations without meta-commentary.
