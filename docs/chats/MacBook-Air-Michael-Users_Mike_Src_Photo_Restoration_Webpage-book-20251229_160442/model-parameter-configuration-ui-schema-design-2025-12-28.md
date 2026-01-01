# Claude Chat Export
**Generated: 2025-12-29 16:05:15**

---

👤 **USER:**
> I would like to add possibility to tune in models before to do something with photo. Parameters should be visible on model card on Home page- see attached screenshot. configuration of what should be done by custom object. It should directly related with model schema under "Replicate Schema"."parameters". custom object should limit what should be configured thru UI. For example in custom I would like to configure something like:
"custom" : [
 {
     "name": "upscale_factor",
     "ui" : "drop-menu", -  I think about list of html ui types like text box, drop down menu, number scroll ?
     "range" : here specify array or min/max values. Suggest what will be the bext
 }
]
So based on above configuration should be created UI in model card that will be able to specify real model parapeter and pass it to model provider thru API
Do not code yet. Before brainstorm and find the best solution

---

👤 **USER:**
> [Image: original 2934x1284, displayed at 2000x875. Multiply coordinates by 1.47 to map to original image.]

I'll analyze your request and brainstorm the best solution. Let me first understand the current architecture and model configuration structure.

Now let me read more about the restoration types and understand how parameters are currently used:

Perfect! Now let me check the chat history about admin model configuration to understand the context better:

Now I have a comprehensive understanding of the system. Let me create a detailed brainstorming document with the best solution proposal.

## Brainstorming: Custom Model Parameter UI on Home Page

Based on my analysis of the codebase, I've identified the current architecture and can now propose the best solution for adding tunable model parameters to the Home page (Restoration page).

### Current Architecture Understanding

**Existing System:**
1. **Backend Configuration** ([default.json](backend/config/default.json)):
   - Models defined with `replicate_schema` containing parameter definitions
   - Parameters have type, constraints (min/max), UI hints (ui_hidden, ui_group)
   - Already supports: string, integer, float, boolean, enum types
   - Schema structure includes: name, type, required, default, min, max, values, description, ui_hidden, ui_group

2. **Frontend Model Display** ([ModelSelector.tsx](frontend/src/features/restoration/components/ModelSelector.tsx:78-104)):
   - Currently shows model cards with: name, category, description, tags
   - No parameter input UI currently exists
   - Model selection is simple button click

3. **Schema System** ([replicate_schema.py](backend/app/core/replicate_schema.py)):
   - Pydantic models for validation
   - ParameterSchema supports all necessary field types
   - Already has `ui_hidden` and `ui_group` hints

### Problems with Your Initial Proposal

Your initial suggestion has some issues:

```json
"custom" : [
 {
     "name": "upscale_factor",
     "ui" : "drop-menu",
     "range" : [...]
 }
]
```

**Issues:**
1. **Duplication**: This duplicates information already in `replicate_schema.input.parameters`
2. **Naming Confusion**: "custom" already exists for other purposes (file size limits, formats, etc.)
3. **Limited Type System**: "drop-menu" doesn't cover all parameter types (boolean, text input, number slider)
4. **No Type Safety**: Doesn't specify what values are valid

### Proposed Solution: Enhanced Schema with UI Configuration

Instead of creating a new `custom` array, I recommend **extending the existing `replicate_schema.input.parameters`** structure with additional UI control hints.

#### Option 1: Extend Existing Schema (Recommended ⭐)

**Schema Structure:**
```json
{
  "replicate_schema": {
    "input": {
      "parameters": [
        {
          "name": "upscale_factor",
          "type": "enum",
          "values": ["2x", "4x"],
          "default": "2x",
          "required": false,
          "description": "Image upscaling factor",
          "ui_hidden": false,        // Show in UI
          "ui_control": "dropdown",  // NEW: UI control type
          "ui_group": "output",      // Group related params
          "ui_order": 1              // NEW: Display order
        },
        {
          "name": "quality",
          "type": "integer",
          "min": 0,
          "max": 100,
          "default": 80,
          "required": false,
          "description": "Output quality (0-100)",
          "ui_hidden": false,
          "ui_control": "slider",    // NEW: UI control type
          "ui_group": "output",
          "ui_order": 2
        },
        {
          "name": "enable_enhancement",
          "type": "boolean",
          "default": true,
          "required": false,
          "description": "Apply AI enhancement",
          "ui_hidden": false,
          "ui_control": "toggle",    // NEW: UI control type
          "ui_group": "processing",
          "ui_order": 1
        }
      ]
    }
  }
}
```

**UI Control Types Mapping:**
- `type: "enum"` + `ui_control: "dropdown"` → Dropdown menu
- `type: "enum"` + `ui_control: "radio"` → Radio buttons
- `type: "integer/float"` + `ui_control: "slider"` → Range slider
- `type: "integer/float"` + `ui_control: "number"` → Number input
- `type: "string"` + `ui_control: "text"` → Text input
- `type: "string"` + `ui_control: "textarea"` → Multiline text
- `type: "boolean"` + `ui_control: "toggle"` → Toggle switch
- `type: "boolean"` + `ui_control: "checkbox"` → Checkbox

**Benefits:**
✅ Reuses existing schema validation system  
✅ No duplication of parameter definitions  
✅ Backward compatible (ui_control is optional)  
✅ Type-safe (uses existing Pydantic models)  
✅ Already has ui_hidden to filter parameters  
✅ Supports grouping with ui_group  
✅ Natural extension of current architecture  

#### Option 2: Separate UI Configuration (Not Recommended)

Add a parallel `ui_config` section - **NOT RECOMMENDED** because:
❌ Creates duplication  
❌ Can get out of sync with parameters  
❌ More complex to maintain  

### Implementation Plan

**1. Backend Schema Updates:**

Update [replicate_schema.py](backend/app/core/replicate_schema.py:37-93):
```python
class ParameterSchema(BaseModel):
    # ... existing fields ...
    
    # UI Configuration (NEW)
    ui_control: Literal[
        "dropdown", "radio", "slider", "number", 
        "text", "textarea", "toggle", "checkbox"
    ] | None = Field(
        None,
        description="UI control type for parameter input"
    )
    ui_order: int | None = Field(
        None,
        description="Display order in UI (lower = first)"
    )
```

**2. Frontend Type Updates:**

Update [frontend/src/features/restoration/types.ts](frontend/src/features/restoration/types.ts:8-17):
```typescript
export interface ParameterSchema {
  name: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'enum';
  required: boolean;
  description: string;
  default?: any;
  min?: number;
  max?: number;
  values?: string[];
  ui_hidden?: boolean;
  ui_group?: string;
  ui_control?: 'dropdown' | 'radio' | 'slider' | 'number' | 
               'text' | 'textarea' | 'toggle' | 'checkbox';
  ui_order?: number;
}

export interface ModelSchema {
  parameters: ParameterSchema[];
  custom?: {
    max_file_size_mb: number;
    supported_formats: string[];
    estimated_time_seconds?: number;
  };
}

export interface ModelInfo {
  // ... existing fields ...
  schema?: ModelSchema;  // Add schema to model info
}
```

**3. New Frontend Component: `ModelParameterControls.tsx`**

Create reusable parameter input component:
```
frontend/src/features/restoration/components/
  ├── ModelParameterControls.tsx  (NEW - main component)
  ├── ParameterInput.tsx          (NEW - renders individual controls)
  └── ModelSelector.tsx           (MODIFY - integrate parameters)
```

**4. Enhanced Model Card UI:**

The model card on the Home page would show:
```
┌─────────────────────────────────────────┐
│ ✓ FLUX Kontext Photo Restore   RESTORE │
├─────────────────────────────────────────┤
│ Advanced photo restoration using AI     │
│                                         │
│ [restore] [replicate] [advanced]       │
│                                         │
│ ▼ Parameters                           │  ← Collapsible section
│   Output Format: [PNG ▼]               │
│   Quality:  [━━━━●━━━] 80              │
│   Enhancement: [● ON ]                  │
└─────────────────────────────────────────┘
```

**5. User Flow:**

```
1. User selects model → Model card expands
2. Parameter controls appear (if schema exists)
3. User adjusts parameters (optional)
4. User uploads image
5. Click "Restore Image"
6. Parameters sent with API request
```

### API Flow

**Request to `/api/v1/restore`:**
```json
{
  "file": <image_file>,
  "model_id": "replicate-restore",
  "parameters": {                    // User-configured values
    "output_format": "png",
    "quality": 85,
    "enable_enhancement": true
  }
}
```

### Configuration Example

For the screenshot you showed (FLUX Kontext Photo Restore), the config would be:

```json
{
  "id": "replicate-restore",
  "name": "FLUX Kontext Photo Restore",
  "replicate_schema": {
    "input": {
      "parameters": [
        {
          "name": "output_format",
          "type": "enum",
          "values": ["jpg", "png"],
          "default": "png",
          "description": "Output image format",
          "ui_control": "dropdown",
          "ui_group": "output",
          "ui_order": 1
        },
        {
          "name": "quality",
          "type": "integer",
          "min": 0,
          "max": 100,
          "default": 80,
          "description": "Output quality",
          "ui_control": "slider",
          "ui_group": "output",
          "ui_order": 2
        },
        {
          "name": "seed",
          "type": "integer",
          "description": "Random seed",
          "ui_hidden": true    // Hidden from UI
        }
      ]
    }
  }
}
```

### Questions for Clarification

Before implementing, I need your input on:

1. **UI Placement**: Should parameters appear:
   - **A)** Inside the model card when selected (cleaner, less space)
   - **B)** Below model selector as separate section (more prominent)
   - **C)** In a modal/dialog when clicking "Configure" button

2. **Default Behavior**: 
   - Should parameters be collapsed by default or always visible?
   - Should we show "Advanced" section for ui_group params?

3. **Scope**:
   - Apply to **all models** (including HuggingFace) or **only Replicate models**?
   - Should HuggingFace models also get custom parameters?

4. **Validation**:
   - Show validation errors immediately or only on submit?
   - Allow invalid values temporarily while editing?

5. **Persistence**:
   - Should parameter values persist across sessions (localStorage)?
   - Or reset to defaults each time?

### Recommended Approach

I recommend:
- ✅ **Option 1**: Extend existing schema (no new "custom" field)
- ✅ **Placement A**: Inside model card when selected
- ✅ **Collapsible by default** with expand icon
- ✅ **Group by ui_group** (Basic → Advanced sections)
- ✅ **All providers** (future-proof)
- ✅ **Immediate validation** with clear error messages
- ✅ **Reset to defaults** each session (simpler UX)

Would you like me to proceed with this approach, or do you have preferences on the questions above?

---

👤 **USER:**
> find below real local.json file. rethink 
{
  "id": "replicate-google-upscaler",
  "name": "Google Photo Upscaler",
  "model": "google/upscaler",
  "provider": "replicate",
  "category": "upscale",
  "description": "Upscale images 2x or 4x times",
  "enabled": true,
  "tags": [
    "replicate",
    "advanced",
    "upscale"
  ],
  "version": "1.0",
  "replicate_schema": {
    "input": {
      "image": {
        "param_name": "image",
        "type": "uri",
        "format": "image",
        "required": true,
        "description": "Image to upscale"
      },
      "parameters": [
        {
          "name": "upscale_factor",
          "type": "string",
          "required": false,
          "description": "Factor by which to upscale the image",
          "default": "x2",
          "ui_hidden": false,
          "ui_group": null
        },
        {
          "name": "compression_quality",
          "type": "integer",
          "required": false,
          "description": "Compression quality for output (1-100)",
          "default": 80,
          "min": 1,
          "max": 100,
          "ui_hidden": false,
          "ui_group": null
        }
      ]
    },
    "output": {
      "type": "uri",
      "format": "image"
    },
    "custom": {
      "max_file_size_mb": 10,
      "supported_formats": [
        "jpg",
        "jpeg",
        "png"
      ],
      "estimated_time_seconds": null
    }
  },
  "custom": {},
  "parameters": {
    "output_format": "png",
    "safety_tolerance": 2
  }
}

Excellent! Now I see the **real structure**. This changes my understanding significantly. Let me rethink the solution.

## Revised Understanding

Looking at your real `local.json`, I now see:

### Current Structure Analysis

```json
{
  "replicate_schema": {
    "input": {
      "parameters": [
        {
          "name": "upscale_factor",
          "type": "string",
          "default": "x2",
          "ui_hidden": false        // ← Already exists!
        },
        {
          "name": "compression_quality",
          "type": "integer",
          "min": 1,
          "max": 100,
          "default": 80,
          "ui_hidden": false        // ← Already exists!
        }
      ]
    }
  },
  "parameters": {                    // ← Default values section
    "output_format": "png",
    "safety_tolerance": 2
  }
}
```

### Key Realizations

1. **Schema defines AVAILABLE parameters** (`replicate_schema.input.parameters`)
2. **`parameters` object defines DEFAULT values** (model-level defaults)
3. **`ui_hidden: false`** means "show in UI"
4. **User should be able to override defaults at runtime**

### Revised Problem Statement

You want users to:
1. **See available parameters** from `replicate_schema.input.parameters` where `ui_hidden: false`
2. **Adjust values** before processing the image
3. **Pass custom values** to the Replicate API (overriding `parameters` defaults)

### The Real Question

**Where should UI control type be specified?**

Looking at your parameters:
- `upscale_factor` (type: "string") - **Should this be a dropdown or text input?**
- `compression_quality` (type: "integer", min: 1, max: 100) - **Should this be a slider or number input?**

The **type alone is not enough** to determine the best UI control!

## Revised Solution: Add `ui_control` to Schema

### Option 1: Extend ParameterSchema (Still Recommended ⭐)

Add `ui_control` to the existing schema:

```json
{
  "replicate_schema": {
    "input": {
      "parameters": [
        {
          "name": "upscale_factor",
          "type": "string",
          "default": "x2",
          "ui_hidden": false,
          "ui_control": "dropdown",           // ← NEW: How to render
          "ui_options": ["x2", "x4"],         // ← NEW: Dropdown options
          "description": "Factor by which to upscale"
        },
        {
          "name": "compression_quality",
          "type": "integer",
          "min": 1,
          "max": 100,
          "default": 80,
          "ui_hidden": false,
          "ui_control": "slider",             // ← NEW: Render as slider
          "description": "Compression quality (1-100)"
        }
      ]
    }
  }
}
```

**Why `ui_options` instead of reusing existing fields?**
- For `type: "enum"`, we already have `values: ["jpg", "png"]`
- For `type: "string"` without enum, we need a way to specify dropdown options
- `ui_options` works for any type

### Option 2: Smart Defaults (Simpler, but less control)

**Don't add `ui_control`** - instead, infer from type:

```
type: "string" → Text input (default)
type: "string" + ui_options → Dropdown
type: "enum" + values → Dropdown
type: "integer/float" + min/max → Slider
type: "integer/float" (no range) → Number input
type: "boolean" → Toggle switch
```

This is **simpler** but **less flexible** (what if you want number input instead of slider?).

### Option 3: Your Original Idea - Separate `custom_ui` (Reconsidered)

Now I understand your original thinking better. You wanted:

```json
{
  "replicate_schema": { /* schema as-is */ },
  "custom_ui": [                              // ← NEW separate section
    {
      "parameter": "upscale_factor",
      "control": "dropdown",
      "options": ["x2", "x4"]
    },
    {
      "parameter": "compression_quality",
      "control": "slider"
    }
  ]
}
```

**Pros:**
- ✅ Doesn't pollute replicate_schema
- ✅ Clear separation: schema = validation, custom_ui = presentation
- ✅ Can override UI without touching schema

**Cons:**
- ❌ Duplication (parameter name appears twice)
- ❌ Can get out of sync
- ❌ Need to map custom_ui → schema parameters

## My Recommendation: Hybrid Approach ⭐

**Use existing schema + smart defaults + optional overrides**

### Backend Schema (Pydantic)

Update [replicate_schema.py](backend/app/core/replicate_schema.py:37-93):

```python
class ParameterSchema(BaseModel):
    name: str
    type: Literal["string", "integer", "float", "boolean", "enum"]
    required: bool = False
    description: str = ""
    default: Any | None = None
    min: int | float | None = None
    max: int | float | None = None
    values: list[str] | None = None  # For enum type
    
    # UI Configuration
    ui_hidden: bool = False
    ui_group: str | None = None
    ui_control: Literal[
        "text", "textarea", "number", "slider", 
        "dropdown", "radio", "toggle", "checkbox"
    ] | None = Field(None, description="UI control type (auto-detected if null)")
    ui_options: list[str] | None = Field(None, description="Options for dropdown (for non-enum types)")
    ui_order: int | None = Field(None, description="Display order")
```

### Smart Default Logic (Frontend)

```typescript
function getControlType(param: ParameterSchema): UIControlType {
  // Explicit control specified
  if (param.ui_control) return param.ui_control;
  
  // Auto-detect from type
  if (param.type === 'boolean') return 'toggle';
  if (param.type === 'enum' && param.values) return 'dropdown';
  if (param.ui_options) return 'dropdown';
  if (param.type === 'integer' || param.type === 'float') {
    if (param.min != null && param.max != null) return 'slider';
    return 'number';
  }
  if (param.type === 'string') return 'text';
  
  return 'text'; // fallback
}
```

### Example Configuration

**Minimal (auto-detect UI):**
```json
{
  "parameters": [
    {
      "name": "upscale_factor",
      "type": "string",
      "default": "x2",
      "ui_options": ["x2", "x4"],  // Auto: dropdown
      "ui_hidden": false
    },
    {
      "name": "compression_quality",
      "type": "integer",
      "min": 1,
      "max": 100,               // Auto: slider
      "default": 80,
      "ui_hidden": false
    }
  ]
}
```

**Explicit (full control):**
```json
{
  "parameters": [
    {
      "name": "upscale_factor",
      "type": "string",
      "default": "x2",
      "ui_control": "radio",         // Override: use radio instead
      "ui_options": ["x2", "x4"],
      "ui_hidden": false
    },
    {
      "name": "compression_quality",
      "type": "integer",
      "min": 1,
      "max": 100,
      "default": 80,
      "ui_control": "number",        // Override: number input instead of slider
      "ui_hidden": false
    }
  ]
}
```

## Updated Implementation Plan

### 1. Backend Changes

**A. Update Schema** ([replicate_schema.py](backend/app/core/replicate_schema.py)):
- Add `ui_control: Literal[...] | None`
- Add `ui_options: list[str] | None`
- Add `ui_order: int | None`

**B. Update API Response** ([model.py](backend/app/api/v1/schemas/model.py:19-33)):
- Already has `ParameterSchemaResponse` - just add new fields
- Backend already returns schema in `/api/v1/models` endpoint

### 2. Frontend Changes

**A. Update Types** ([types.ts](frontend/src/features/restoration/types.ts)):
```typescript
export interface ParameterSchema {
  name: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'enum';
  required: boolean;
  description: string;
  default?: any;
  min?: number;
  max?: number;
  values?: string[];      // For enum type
  ui_hidden?: boolean;
  ui_group?: string;
  ui_control?: 'text' | 'textarea' | 'number' | 'slider' | 
               'dropdown' | 'radio' | 'toggle' | 'checkbox';
  ui_options?: string[];  // For string dropdowns
  ui_order?: number;
}
```

**B. New Component Structure:**
```
frontend/src/features/restoration/components/
  ├── ModelSelector.tsx              (MODIFY - integrate params)
  ├── ModelCard.tsx                  (NEW - extract card logic)
  ├── ModelParameterControls.tsx     (NEW - parameter form)
  └── parameter-inputs/              (NEW - folder)
      ├── TextInput.tsx
      ├── NumberInput.tsx
      ├── SliderInput.tsx
      ├── DropdownInput.tsx
      ├── ToggleInput.tsx
      └── ParameterInput.tsx         (Wrapper/factory)
```

**C. Model Card UI:**
```
┌──────────────────────────────────────────┐
│ ✓ Google Photo Upscaler        UPSCALE  │
├──────────────────────────────────────────┤
│ Upscale images 2x or 4x times            │
│                                          │
│ [replicate] [advanced] [upscale]        │
│                                          │
│ ▾ Parameters (2)                         │ ← Click to expand/collapse
│   ┌────────────────────────────────┐    │
│   │ Upscale Factor                 │    │
│   │ ◉ x2    ○ x4                   │    │ ← Radio (if ui_control: "radio")
│   │                                │    │
│   │ Compression Quality            │    │
│   │ [━━━━━━●━━━] 80               │    │ ← Slider (auto-detected)
│   │ 1                         100  │    │
│   └────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**D. State Management:**
```typescript
const [parameterValues, setParameterValues] = useState<Record<string, any>>({});

// Initialize with defaults from schema
useEffect(() => {
  if (selectedModel?.schema?.parameters) {
    const defaults = {};
    selectedModel.schema.parameters
      .filter(p => !p.ui_hidden)
      .forEach(p => {
        defaults[p.name] = p.default;
      });
    setParameterValues(defaults);
  }
}, [selectedModel]);

// Pass to API
const uploadAndRestore = async () => {
  await restoreImage(selectedFile, selectedModel.id, parameterValues);
};
```

### 3. API Request Flow

```typescript
// frontend/src/features/restoration/services/restorationService.ts
export async function restoreImage(
  file: File,
  modelId: string,
  parameters?: Record<string, any>  // ← User values
): Promise<RestoreResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model_id', modelId);
  if (parameters) {
    formData.append('parameters', JSON.stringify(parameters));
  }
  // ...
}
```

## Final Questions

1. **UI Control Preferences** - For your upscaler model:
   - `upscale_factor`: Dropdown or Radio buttons? (Radio looks cleaner for 2 options)
   - `compression_quality`: Slider or Number input? (Slider is more visual)

2. **Parameter Section**:
   - Collapsed by default or always expanded?
   - Show parameter count badge "(2)" or just "Parameters"?

3. **Validation**:
   - Show validation errors in real-time or on submit?
   - Disable "Restore Image" button if validation fails?

4. **Layout**:
   - Parameters inside model card (as shown above)?
   - Or separate "Model Parameters" section below model selector?

Should I proceed with this hybrid approach (smart defaults + optional overrides)?

---

👤 **USER:**
> Check provided local.json once again and more deeper. You can find there  "custom": {}, object at the root of provided model object. I think that I can use that object for UI configuration

Brilliant insight! Let me analyze this more carefully:

Perfect! Now I see it clearly. Let me trace through the actual structure:

**In your local.json:**
```json
{
  "replicate_schema": {
    "custom": {  // ← Inside replicate_schema
      "max_file_size_mb": 10,
      "supported_formats": ["jpg", "jpeg", "png"]
    }
  },
  "custom": {},  // ← ROOT LEVEL - currently empty!
}
```

You're absolutely right! There are **TWO** `custom` fields:

1. **`replicate_schema.custom`** - Already used for file constraints (part of Replicate schema)
2. **`custom: {}`** - Root-level, currently **empty** and available for **any purpose**!

## Revised Solution: Use Root-Level `custom` for UI Configuration ⭐

This is **brilliant** because:
- ✅ Doesn't pollute `replicate_schema` 
- ✅ Clean separation: `replicate_schema` = API contract, `custom` = UI presentation
- ✅ Already exists in the schema structure
- ✅ Can be used for any custom app-specific configuration

### Proposed Structure

```json
{
  "id": "replicate-google-upscaler",
  "name": "Google Photo Upscaler",
  "replicate_schema": {
    "input": {
      "parameters": [
        {
          "name": "upscale_factor",
          "type": "string",
          "default": "x2",
          "ui_hidden": false
        },
        {
          "name": "compression_quality",
          "type": "integer",
          "min": 1,
          "max": 100,
          "default": 80,
          "ui_hidden": false
        }
      ]
    }
  },
  "custom": {
    "ui_controls": [
      {
        "parameter": "upscale_factor",
        "control": "dropdown",
        "options": ["x2", "x4"],
        "label": "Upscale Factor",
        "order": 1
      },
      {
        "parameter": "compression_quality",
        "control": "slider",
        "label": "Compression Quality",
        "order": 2
      }
    ]
  }
}
```

### Alternative: Simpler Map Structure

Even simpler - just map parameter name to control type:

```json
{
  "custom": {
    "ui_controls": {
      "upscale_factor": {
        "type": "dropdown",
        "options": ["x2", "x4"],
        "label": "Upscale Factor",
        "order": 1
      },
      "compression_quality": {
        "type": "slider",
        "label": "Quality",
        "order": 2,
        "step": 5  // Optional: slider step size
      }
    }
  }
}
```

### Full Example with All Options

```json
{
  "id": "replicate-google-upscaler",
  "name": "Google Photo Upscaler",
  "model": "google/upscaler",
  "provider": "replicate",
  "category": "upscale",
  "description": "Upscale images 2x or 4x times",
  "enabled": true,
  "tags": ["replicate", "advanced", "upscale"],
  "version": "1.0",
  
  "replicate_schema": {
    "input": {
      "image": {
        "param_name": "image",
        "type": "uri",
        "format": "image",
        "required": true,
        "description": "Image to upscale"
      },
      "parameters": [
        {
          "name": "upscale_factor",
          "type": "string",
          "required": false,
          "description": "Factor by which to upscale the image",
          "default": "x2",
          "ui_hidden": false
        },
        {
          "name": "compression_quality",
          "type": "integer",
          "required": false,
          "description": "Compression quality for output (1-100)",
          "default": 80,
          "min": 1,
          "max": 100,
          "ui_hidden": false
        },
        {
          "name": "enable_ai_enhancement",
          "type": "boolean",
          "required": false,
          "description": "Apply AI-based enhancement",
          "default": true,
          "ui_hidden": false
        }
      ]
    },
    "output": {
      "type": "uri",
      "format": "image"
    },
    "custom": {
      "max_file_size_mb": 10,
      "supported_formats": ["jpg", "jpeg", "png"],
      "estimated_time_seconds": null
    }
  },
  
  "custom": {
    "ui_controls": {
      "upscale_factor": {
        "type": "radio",           // radio | dropdown | slider | number | toggle | text
        "options": ["x2", "x4"],
        "label": "Upscale Factor",
        "help": "Choose upscaling multiplier",
        "order": 1
      },
      "compression_quality": {
        "type": "slider",
        "label": "Output Quality",
        "help": "Higher quality = larger file size",
        "order": 2,
        "step": 5,                  // Slider increment
        "marks": {                  // Optional: show marks on slider
          "1": "Low",
          "50": "Medium",
          "100": "High"
        }
      },
      "enable_ai_enhancement": {
        "type": "toggle",
        "label": "AI Enhancement",
        "help": "Apply additional AI-based improvements",
        "order": 3
      }
    }
  },
  
  "parameters": {
    "output_format": "png",
    "safety_tolerance": 2
  }
}
```

## Implementation Plan

### 1. Backend Schema Update

Update [config_schema.py](backend/app/core/config_schema.py:86-102):

```python
class UIControlConfig(BaseModel):
    """UI control configuration for a parameter."""
    
    type: Literal[
        "text", "textarea", "number", "slider",
        "dropdown", "radio", "toggle", "checkbox"
    ] = Field(description="UI control type")
    
    label: str | None = Field(None, description="Display label (overrides parameter name)")
    help: str | None = Field(None, description="Help text tooltip")
    options: list[str] | None = Field(None, description="Options for dropdown/radio")
    order: int | None = Field(None, description="Display order")
    step: int | float | None = Field(None, description="Step size for slider/number")
    marks: dict[str, str] | None = Field(None, description="Slider marks {value: label}")


class ModelCustomConfig(BaseModel):
    """Custom application-specific model configuration."""
    
    ui_controls: dict[str, UIControlConfig] | None = Field(
        None,
        description="UI control configurations keyed by parameter name"
    )
    # Can add more custom fields here in future
    # e.g., cost_estimate, performance_notes, etc.


class ModelConfig(BaseModel):
    """Individual model configuration."""
    
    id: str = Field(description="Unique model identifier")
    name: str = Field(description="Human-readable model name")
    model: str = Field(description="Model path")
    provider: Literal["huggingface", "replicate"]
    category: str
    description: str
    enabled: bool = Field(default=True)
    parameters: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    version: str = Field(default="1.0")
    
    # Replicate-specific schema
    replicate_schema: dict[str, Any] | None = Field(
        None,
        description="Replicate model schema (flexible dict)"
    )
    
    # Custom app-specific config (NEW - properly typed)
    custom: ModelCustomConfig = Field(
        default_factory=ModelCustomConfig,
        description="Custom application-specific configuration"
    )
```

### 2. Frontend Types

Update [types.ts](frontend/src/features/restoration/types.ts):

```typescript
export type UIControlType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'slider' 
  | 'dropdown' 
  | 'radio' 
  | 'toggle' 
  | 'checkbox';

export interface UIControlConfig {
  type: UIControlType;
  label?: string;
  help?: string;
  options?: string[];
  order?: number;
  step?: number;
  marks?: Record<string, string>;
}

export interface ModelCustomConfig {
  ui_controls?: Record<string, UIControlConfig>;
}

export interface ModelInfo {
  id: string;
  name: string;
  model: string;
  category: string;
  description: string;
  parameters?: Record<string, unknown>;
  tags?: string[];
  version?: string;
  schema?: ModelSchema;          // From replicate_schema
  custom?: ModelCustomConfig;    // NEW - from root-level custom
}
```

### 3. Component Implementation

The frontend logic becomes simpler:

```typescript
// Get UI config for a parameter
function getUIControl(
  paramName: string, 
  param: ParameterSchema,
  model: ModelInfo
): UIControlConfig {
  
  // 1. Check custom UI config first (highest priority)
  if (model.custom?.ui_controls?.[paramName]) {
    return model.custom.ui_controls[paramName];
  }
  
  // 2. Auto-detect from parameter schema (fallback)
  return autoDetectControl(param);
}

function autoDetectControl(param: ParameterSchema): UIControlConfig {
  if (param.type === 'boolean') {
    return { type: 'toggle' };
  }
  if (param.type === 'enum' && param.values) {
    return { type: 'dropdown', options: param.values };
  }
  if (param.type === 'integer' || param.type === 'float') {
    if (param.min != null && param.max != null) {
      return { type: 'slider' };
    }
    return { type: 'number' };
  }
  return { type: 'text' };
}
```

## Advantages of This Approach

### ✅ Clean Separation
- **`replicate_schema`**: Pure API contract (what Replicate expects)
- **`custom.ui_controls`**: UI presentation layer (how to display)

### ✅ No Duplication
- Parameter definition stays in `replicate_schema.input.parameters`
- UI hints stay in `custom.ui_controls`
- Maps by parameter name

### ✅ Optional Override
- If `custom.ui_controls` not specified → auto-detect from schema
- If specified → use explicit configuration
- Progressive enhancement

### ✅ Flexible Schema
- Can use `dict[str, Any]` in Pydantic for `replicate_schema` (already does)
- Can properly type `custom` field now
- Future-proof for other custom configs

### ✅ Admin UI Friendly
- Admin can edit `custom` object as JSON
- Clear separation from Replicate schema
- Validation can be separate

## Questions

1. **UI Control Type Preference:**
   - `upscale_factor`: Radio buttons or Dropdown? (I recommend radio for 2-3 options)
   - `compression_quality`: Slider or Number input? (I recommend slider with marks)

2. **Label Override:**
   - Should `label` in `ui_controls` override the parameter name?
   - Example: `"compression_quality"` → display as `"Output Quality"`

3. **Grouping:**
   - Do we need to support parameter groups? (e.g., "Basic" vs "Advanced")
   - Could add: `"group": "advanced"` to UIControlConfig

4. **Validation:**
   - Should frontend validate against `replicate_schema` constraints?
   - Example: Ensure slider value respects min/max from schema

5. **Default Behavior:**
   - If `custom.ui_controls` is missing/empty, should we:
     - A) Auto-generate controls from schema (recommended)
     - B) Don't show any parameter controls
     - C) Show raw JSON editor

Should I proceed with this `custom.ui_controls` approach?

---

👤 **USER:**
> UI Control Type Preference:
upscale_factor: Radio buttons or Dropdown? (I recommend radio for 2-3 options) - I can accept this
compression_quality: Slider or Number input? (I recommend slider with marks) - slider is better
Label Override:
Should label in ui_controls override the parameter name? - Yes it is fine
Example: "compression_quality" → display as "Output Quality"
Grouping:
Do we need to support parameter groups? (e.g., "Basic" vs "Advanced") - Not need . Skip this
Could add: "group": "advanced" to UIControlConfig
Validation:
Should frontend validate against replicate_schema constraints? - Yes - Option A is fine
Example: Ensure slider value respects min/max from schema
Default Behavior:
If custom.ui_controls is missing/empty, should we:
A) Auto-generate controls from schema (recommended)
B) Don't show any parameter controls
C) Show raw JSON editor

Check below configuration for another model in case if our solution is still valid
{
  "id": "replicate-restore",
  "name": "FLUX Kontext Photo Restore",
  "model": "flux-kontext-apps/restore-image",
  "provider": "replicate",
  "category": "restore",
  "description": "Advanced photo restoration using Replicate AI",
  "enabled": true,
  "tags": [
    "restore",
    "replicate",
    "advanced"
  ],
  "version": "1.0",
  "replicate_schema": {
    "input": {
      "image": {
        "param_name": "input_image",
        "type": "uri",
        "format": "image",
        "required": true,
        "description": "Image to restore (jpeg, png, gif, webp)"
      },
      "parameters": [
        {
          "name": "seed",
          "type": "integer",
          "required": false,
          "description": "Random seed for reproducible generation",
          "ui_hidden": true
        },
        {
          "name": "output_format",
          "type": "enum",
          "values": [
            "jpg",
            "png"
          ],
          "default": "png",
          "required": false,
          "description": "Output image format",
          "ui_group": "output"
        },
        {
          "name": "safety_tolerance",
          "type": "integer",
          "min": 0,
          "max": 2,
          "default": 2,
          "required": false,
          "description": "Safety level (0=strict, 2=permissive)",
          "ui_hidden": true
        }
      ]
    },
    "output": {
      "type": "uri",
      "format": "image"
    },
    "custom": {
      "max_file_size_mb": 10,
      "supported_formats": [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif"
      ],
      "estimated_time_seconds": 30
    }
  },
  "custom": {},
  "parameters": {
    "output_format": "png",
    "safety_tolerance": 2
  }
}

Perfect! Your answers are clear. Let me validate the solution against the FLUX Kontext model configuration.

## Validation Against FLUX Kontext Model

Looking at the FLUX model config:

```json
{
  "replicate_schema": {
    "input": {
      "parameters": [
        {
          "name": "seed",
          "ui_hidden": true          // ← Hidden from UI ✅
        },
        {
          "name": "output_format",
          "type": "enum",
          "values": ["jpg", "png"],   // ← Auto-detect: dropdown ✅
          "default": "png",
          "ui_hidden": false          // ← Show in UI
        },
        {
          "name": "safety_tolerance",
          "ui_hidden": true           // ← Hidden from UI ✅
        }
      ]
    }
  },
  "custom": {}  // ← Empty, will use auto-detection
}
```

### Auto-Detection Result for FLUX Model

**Without custom UI config** (when `custom: {}`):

1. **`seed`** → `ui_hidden: true` → **Not shown** ✅
2. **`output_format`** → `type: "enum"` + `values: ["jpg", "png"]` → **Dropdown** ✅
3. **`safety_tolerance`** → `ui_hidden: true` → **Not shown** ✅

**UI Preview (auto-generated):**
```
┌─────────────────────────────────────────┐
│ ✓ FLUX Kontext Photo Restore   RESTORE │
├─────────────────────────────────────────┤
│ Advanced photo restoration using AI     │
│                                         │
│ [restore] [replicate] [advanced]       │
│                                         │
│ ▾ Parameters (1)                        │
│   ┌───────────────────────────────┐    │
│   │ Output Format                 │    │
│   │ [ PNG ▼ ]                     │    │
│   │   ├─ jpg                      │    │
│   │   └─ png                      │    │
│   └───────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### With Custom UI Config (Optional Enhancement)

If you want to customize later:

```json
{
  "custom": {
    "ui_controls": {
      "output_format": {
        "type": "radio",              // Override: radio instead of dropdown
        "label": "Output Format",
        "help": "Choose output image format",
        "order": 1
      }
    }
  }
}
```

**Result:**
```
┌─────────────────────────────────────────┐
│ ▾ Parameters (1)                        │
│   ┌───────────────────────────────┐    │
│   │ Output Format ⓘ               │    │ ← Tooltip on hover
│   │ ◉ PNG    ○ JPG                │    │ ← Radio buttons
│   └───────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Solution Validation ✅

### The solution works for both models:

**Google Upscaler:**
- 2 visible parameters (`upscale_factor`, `compression_quality`)
- Can add `custom.ui_controls` to specify radio + slider

**FLUX Kontext:**
- 1 visible parameter (`output_format`)
- `custom: {}` → auto-generates dropdown
- `seed` and `safety_tolerance` hidden automatically

### Auto-Detection Logic

```typescript
function getParameterUIConfig(
  paramName: string,
  param: ParameterSchema,
  model: ModelInfo
): UIControlConfig | null {
  
  // 1. Hidden parameters → return null (don't render)
  if (param.ui_hidden) {
    return null;
  }
  
  // 2. Check custom UI config (explicit override)
  if (model.custom?.ui_controls?.[paramName]) {
    return model.custom.ui_controls[paramName];
  }
  
  // 3. Auto-detect from schema
  if (param.type === 'boolean') {
    return { type: 'toggle', label: formatLabel(paramName) };
  }
  
  if (param.type === 'enum' && param.values) {
    // Radio for 2-3 options, dropdown for 4+
    const type = param.values.length <= 3 ? 'radio' : 'dropdown';
    return { 
      type, 
      options: param.values,
      label: formatLabel(paramName) 
    };
  }
  
  if (param.type === 'integer' || param.type === 'float') {
    if (param.min != null && param.max != null) {
      return { 
        type: 'slider',
        label: formatLabel(paramName)
      };
    }
    return { type: 'number', label: formatLabel(paramName) };
  }
  
  if (param.type === 'string') {
    return { type: 'text', label: formatLabel(paramName) };
  }
  
  return { type: 'text', label: formatLabel(paramName) };
}

function formatLabel(paramName: string): string {
  // "output_format" → "Output Format"
  return paramName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

## Final Proposed Schema Structure

### Backend: [config_schema.py](backend/app/core/config_schema.py)

```python
class UIControlConfig(BaseModel):
    """UI control configuration for a parameter."""
    
    type: Literal[
        "text", "textarea", "number", "slider",
        "dropdown", "radio", "toggle", "checkbox"
    ] = Field(description="UI control type")
    
    label: str | None = Field(None, description="Display label (overrides auto-generated)")
    help: str | None = Field(None, description="Help text tooltip")
    options: list[str] | None = Field(None, description="Options for dropdown/radio")
    order: int | None = Field(None, description="Display order")
    step: int | float | None = Field(None, description="Step size for slider/number")
    marks: dict[str, str] | None = Field(None, description="Slider marks {value: label}")


class ModelCustomConfig(BaseModel):
    """Custom application-specific model configuration."""
    
    ui_controls: dict[str, UIControlConfig] | None = Field(
        None,
        description="UI control configurations keyed by parameter name"
    )
    
    # Allow extra fields for future extensions
    model_config = {"extra": "allow"}


class ModelConfig(BaseModel):
    """Individual model configuration."""
    
    id: str
    name: str
    model: str
    provider: Literal["huggingface", "replicate"]
    category: str
    description: str
    enabled: bool = True
    parameters: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    version: str = "1.0"
    
    replicate_schema: dict[str, Any] | None = None
    
    custom: dict[str, Any] = Field(
        default_factory=dict,
        description="Custom application-specific configuration (flexible dict)"
    )
```

### Frontend: [types.ts](frontend/src/features/restoration/types.ts)

```typescript
export type UIControlType = 
  | 'text' | 'textarea' | 'number' | 'slider'
  | 'dropdown' | 'radio' | 'toggle' | 'checkbox';

export interface UIControlConfig {
  type: UIControlType;
  label?: string;
  help?: string;
  options?: string[];
  order?: number;
  step?: number;
  marks?: Record<string, string>;
}

export interface ParameterSchema {
  name: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'enum';
  required: boolean;
  description: string;
  default?: any;
  min?: number;
  max?: number;
  values?: string[];
  ui_hidden?: boolean;
  ui_group?: string;
}

export interface ModelSchema {
  parameters: ParameterSchema[];
  custom?: {
    max_file_size_mb: number;
    supported_formats: string[];
    estimated_time_seconds?: number;
  };
}

export interface ModelCustomConfig {
  ui_controls?: Record<string, UIControlConfig>;
  [key: string]: any;  // Allow other custom fields
}

export interface ModelInfo {
  id: string;
  name: string;
  model: string;
  category: string;
  description: string;
  parameters?: Record<string, unknown>;
  tags?: string[];
  version?: string;
  schema?: ModelSchema;
  custom?: ModelCustomConfig;
}
```

## Complete Example Configurations

### Example 1: Google Upscaler (with custom UI)

```json
{
  "id": "replicate-google-upscaler",
  "name": "Google Photo Upscaler",
  "replicate_schema": {
    "input": {
      "parameters": [
        {
          "name": "upscale_factor",
          "type": "string",
          "default": "x2",
          "description": "Factor by which to upscale the image",
          "ui_hidden": false
        },
        {
          "name": "compression_quality",
          "type": "integer",
          "min": 1,
          "max": 100,
          "default": 80,
          "description": "Compression quality for output (1-100)",
          "ui_hidden": false
        }
      ]
    }
  },
  "custom": {
    "ui_controls": {
      "upscale_factor": {
        "type": "radio",
        "options": ["x2", "x4"],
        "label": "Upscale Factor",
        "help": "Choose 2x or 4x upscaling",
        "order": 1
      },
      "compression_quality": {
        "type": "slider",
        "label": "Output Quality",
        "help": "Higher quality = larger file size",
        "order": 2,
        "step": 5,
        "marks": {
          "1": "Low",
          "50": "Medium",
          "100": "High"
        }
      }
    }
  }
}
```

### Example 2: FLUX Kontext (auto-detect)

```json
{
  "id": "replicate-restore",
  "name": "FLUX Kontext Photo Restore",
  "replicate_schema": {
    "input": {
      "parameters": [
        {
          "name": "seed",
          "type": "integer",
          "ui_hidden": true
        },
        {
          "name": "output_format",
          "type": "enum",
          "values": ["jpg", "png"],
          "default": "png",
          "ui_hidden": false
        },
        {
          "name": "safety_tolerance",
          "type": "integer",
          "ui_hidden": true
        }
      ]
    }
  },
  "custom": {}  // Auto-detection: output_format → radio (2 options)
}
```

## Summary

✅ **Solution validated** for both model types  
✅ **Auto-detection** works when `custom: {}`  
✅ **Custom override** available via `custom.ui_controls`  
✅ **No duplication** - parameter schema stays in `replicate_schema`  
✅ **Clean separation** - UI config in `custom`  
✅ **Respects `ui_hidden`** flag  
✅ **Validates against** `replicate_schema` constraints  
✅ **Label override** supported  

**Ready to implement?** Should I proceed with creating:
1. Backend schema updates (Pydantic models)
2. Frontend types and components
3. Model card with parameter controls
4. API integration for passing parameters

---

👤 **USER:**
> yes you can start implementation. 
At first step create feature implementation file that can be use later on to continue implementation

Now let me read the existing documentation structure to understand the format used in this project:

Perfect! I can see the documentation format. Now let me create a comprehensive implementation plan document:

Perfect! I've created a comprehensive implementation plan document at:

**[docs/chats/custom-model-parameters-ui-implementation-2025-12-28.md](docs/chats/custom-model-parameters-ui-implementation-2025-12-28.md)**

## Summary of the Implementation Plan

### Key Decisions

✅ **Use root-level `custom` field** for UI configuration (not inside `replicate_schema`)  
✅ **Auto-detection fallback** when `custom.ui_controls` is empty  
✅ **Label override** supported via `ui_controls.label`  
✅ **No grouping** (as per your request)  
✅ **Frontend validation** against `replicate_schema` constraints  
✅ **8 UI control types**: text, textarea, number, slider, dropdown, radio, toggle, checkbox

### Configuration Format

```json
{
  "custom": {
    "ui_controls": {
      "upscale_factor": {
        "type": "radio",
        "options": ["x2", "x4"],
        "label": "Upscale Factor",
        "help": "Choose upscaling multiplier",
        "order": 1
      },
      "compression_quality": {
        "type": "slider",
        "label": "Output Quality",
        "step": 5,
        "marks": {"1": "Low", "50": "Medium", "100": "High"},
        "order": 2
      }
    }
  }
}
```

### Implementation Breakdown

**Total Time Estimate:** ~3.5 hours

1. **Backend** (~25 min) - Schema updates, verify API endpoints
2. **Frontend** (~2.5 hours) - Types, components, state management, styling
3. **Testing** (~45 min) - Unit + integration tests

### What's Included

📋 Complete technical specification  
📋 Two full example configurations (Google Upscaler + FLUX Kontext)  
📋 Detailed file-by-file implementation guide  
📋 Auto-detection logic documented  
📋 UI mockups showing expected result  
📋 CSS styling specifications  
📋 Testing checklist  
📋 Migration path for existing models  

### Next Steps

You can now use this document to:
1. **Continue implementation yourself** - follow the step-by-step guide
2. **Have me implement it** - I can start with Phase 1 (Backend) whenever you're ready
3. **Review and adjust** - if you want to change anything about the approach

The document is saved in `docs/chats/` alongside your other implementation conversations, so it's easily accessible for future reference.

**Would you like me to start implementing Phase 1 (Backend changes), or do you want to review the plan first?**

