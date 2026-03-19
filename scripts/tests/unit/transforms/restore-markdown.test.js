/**
 * Unit tests for Restore Markdown, Undo Transformation, and error handling
 * Tests the real TransformUI class with mocked DOM and LLM client
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all TransformUI dependencies before import
vi.mock('../../../transforms/llm-client.js', () => ({
    LLMClient: vi.fn().mockImplementation(() => ({
        customPrompt: vi.fn().mockResolvedValue('mocked result'),
        transform: vi.fn().mockResolvedValue('mocked result'),
        listModels: vi.fn().mockResolvedValue([]),
        listLanguages: vi.fn().mockResolvedValue([]),
    })),
}));

vi.mock('../../../transforms/newline-remover.js', () => ({
    NewlineRemover: vi.fn().mockImplementation(() => ({
        remove: vi.fn((content) => content.replace(/\n/g, ' ')),
    })),
}));

vi.mock('../../../transforms/find-replace.js', () => ({
    FindReplace: vi.fn().mockImplementation(() => ({
        getPresetList: vi.fn().mockReturnValue([]),
        getPreset: vi.fn(),
        generatePattern: vi.fn(),
        findMatches: vi.fn(),
        getMatchStats: vi.fn(),
        replace: vi.fn(),
        getCaseFlags: vi.fn(),
    })),
}));

vi.mock('../../../transforms/ai-regex.js', () => ({
    AIRegex: vi.fn().mockImplementation(() => ({
        generatePattern: vi.fn(),
    })),
}));

/**
 * Create all DOM elements required by TransformUI constructor
 */
function setupDOM() {
    document.body.innerHTML = '';

    const buttonIds = [
        'action-undo-transform', 'action-restore-markdown', 'action-remove-newlines',
        'action-find-replace', 'action-translate', 'action-tone-formal',
        'action-tone-casual', 'action-summarize', 'action-expand', 'action-custom-prompt',
    ];

    buttonIds.forEach(id => {
        const btn = document.createElement('button');
        btn.id = id;
        document.body.appendChild(btn);
    });

    // Undo button starts disabled
    document.getElementById('action-undo-transform').disabled = true;

    // Select elements
    const selects = {
        'translate-lang': ['Spanish'],
        'llm-model': ['anthropic/claude-3.5-sonnet'],
        'fr-preset': [],
    };
    Object.entries(selects).forEach(([id, options]) => {
        const select = document.createElement('select');
        select.id = id;
        options.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            select.appendChild(opt);
        });
        document.body.appendChild(select);
    });

    // Textarea / input elements
    const textarea = document.createElement('textarea');
    textarea.id = 'custom-prompt';
    document.body.appendChild(textarea);

    // Loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.display = 'none';
    const loadingText = document.createElement('span');
    loadingText.id = 'loading-text';
    overlay.appendChild(loadingText);
    document.body.appendChild(overlay);

    // Find & Replace dialog elements
    const dialogIds = [
        'find-replace-dialog', 'close-find-replace-dialog',
        'fr-tab-basic', 'fr-tab-ai', 'fr-find', 'fr-replace',
        'fr-case-sensitive', 'fr-preview-btn', 'fr-replace-all-btn',
        'fr-ai-description', 'fr-ai-generate-btn', 'fr-ai-preview-btn',
        'fr-ai-apply-btn', 'fr-example', 'fr-basic-content', 'fr-ai-content',
        'fr-preview-stats', 'fr-preview-samples', 'fr-ai-pattern',
        'fr-ai-flags', 'fr-ai-explanation', 'fr-ai-pattern-group',
        'fr-ai-flags-group', 'fr-ai-examples', 'fr-ai-preview',
        'fr-ai-preview-stats', 'fr-ai-preview-samples', 'fr-ai-replacement',
    ];
    dialogIds.forEach(id => {
        let el;
        if (id === 'find-replace-dialog') {
            el = document.createElement('dialog');
            el.showModal = vi.fn();
            el.close = vi.fn();
        } else if (id === 'fr-case-sensitive') {
            el = document.createElement('input');
            el.type = 'checkbox';
        } else if (id.includes('content') || id.includes('samples') || id.includes('stats') ||
                   id.includes('explanation') || id.includes('examples') || id.includes('preview')) {
            el = document.createElement('div');
        } else {
            el = document.createElement('input');
        }
        el.id = id;
        document.body.appendChild(el);
    });

    // Newline mode radio
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'newline-mode';
    radio.value = 'smart';
    radio.checked = true;
    document.body.appendChild(radio);
}

let ui;
let content;

beforeEach(async () => {
    setupDOM();
    content = '# Hello\n\nSome markdown content';

    const { TransformUI } = await import('../../../transforms/transform-ui.js');

    ui = new TransformUI(
        () => content,
        (val) => { content = val; }
    );

    // Reset mocks on the llmClient instance
    ui.llmClient.customPrompt.mockReset().mockResolvedValue('restored markdown');
    ui.llmClient.transform.mockReset().mockResolvedValue('transformed result');
});

describe('TransformUI.handleRestoreMarkdown', () => {
    it('should call LLM with correct prompt and update content', async () => {
        await ui.handleRestoreMarkdown();

        expect(ui.llmClient.customPrompt).toHaveBeenCalledOnce();
        const prompt = ui.llmClient.customPrompt.mock.calls[0][1];
        expect(prompt).toContain('Markdown');
        expect(prompt).toContain('Do not change, add, or remove any content');
        expect(content).toBe('restored markdown');
    });

    it('should show error for empty content without calling LLM', async () => {
        content = '   ';
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        await ui.handleRestoreMarkdown();

        expect(ui.llmClient.customPrompt).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('No content to restore');
        alertSpy.mockRestore();
    });

    it('should save snapshot only on success (not on failure)', async () => {
        ui.llmClient.customPrompt.mockRejectedValue(new Error('LLM down'));
        vi.spyOn(window, 'alert').mockImplementation(() => {});

        await ui.handleRestoreMarkdown();

        expect(ui.undoStack.length).toBe(0);
        window.alert.mockRestore();
    });

    it('should save snapshot before setting new content on success', async () => {
        const originalContent = content;
        await ui.handleRestoreMarkdown();

        expect(ui.undoStack.length).toBe(1);
        expect(ui.undoStack[0].content).toBe(originalContent);
        expect(ui.undoStack[0].label).toBe('Restore Markdown');
    });
});

describe('TransformUI.handleLLMError', () => {
    let alertSpy;

    beforeEach(() => {
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        alertSpy.mockRestore();
    });

    it('should detect network errors (case-insensitive)', () => {
        ui.handleLLMError(new Error('FetchError: connection refused'), 'Test');
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });

    it('should detect ECONNREFUSED', () => {
        ui.handleLLMError(new Error('ECONNREFUSED'), 'Test');
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });

    it('should detect timeout errors (case-insensitive)', () => {
        ui.handleLLMError(new Error('TimeoutError: request aborted'), 'Test');
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    });

    it('should detect "timed out" variant', () => {
        ui.handleLLMError(new Error('Request timed out after 30s'), 'Test');
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    });

    it('should detect "aborted" variant', () => {
        ui.handleLLMError(new Error('The operation was aborted'), 'Test');
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    });

    it('should detect rate limit errors (429)', () => {
        ui.handleLLMError(new Error('429 Too Many Requests'), 'Test');
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Rate limited'));
    });

    it('should detect "too many" variant', () => {
        ui.handleLLMError(new Error('Too many requests, slow down'), 'Test');
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Rate limited'));
    });

    it('should show generic error with action name for unknown errors', () => {
        ui.handleLLMError(new Error('Something weird'), 'Markdown restore');
        expect(alertSpy).toHaveBeenCalledWith('Markdown restore failed: Something weird');
    });

    it('should handle error with no message', () => {
        ui.handleLLMError({}, 'Test');
        expect(alertSpy).toHaveBeenCalledWith('Test failed: Unknown error');
    });
});

describe('TransformUI undo integration', () => {
    it('should enable undo button after successful transform', async () => {
        const btn = document.getElementById('action-undo-transform');
        expect(btn.disabled).toBe(true);

        await ui.handleRestoreMarkdown();

        expect(btn.disabled).toBe(false);
        expect(btn.title).toBe('Undo: Restore Markdown');
    });

    it('should restore content and disable button after undo', async () => {
        const original = content;
        await ui.handleRestoreMarkdown();
        expect(content).toBe('restored markdown');

        ui.handleUndo();

        expect(content).toBe(original);
        const btn = document.getElementById('action-undo-transform');
        expect(btn.disabled).toBe(true);
        expect(btn.title).toBe('Nothing to undo');
    });

    it('should support multi-level undo across different transforms', async () => {
        const original = content;

        // First transform
        await ui.handleRestoreMarkdown();
        const afterRestore = content;

        // Second transform
        ui.llmClient.transform.mockResolvedValue('summarized');
        await ui.handleSummarize();
        expect(content).toBe('summarized');

        // Undo second
        ui.handleUndo();
        expect(content).toBe(afterRestore);

        // Undo first
        ui.handleUndo();
        expect(content).toBe(original);
    });

    it('should cap undo stack at maxUndoHistory', async () => {
        ui.maxUndoHistory = 3;

        for (let i = 0; i < 5; i++) {
            ui.llmClient.customPrompt.mockResolvedValue(`result-${i}`);
            await ui.handleRestoreMarkdown();
        }

        expect(ui.undoStack.length).toBe(3);
    });

    it('should not add undo entry on failed transform', async () => {
        ui.llmClient.customPrompt.mockRejectedValue(new Error('fail'));
        vi.spyOn(window, 'alert').mockImplementation(() => {});

        await ui.handleRestoreMarkdown();

        expect(ui.undoStack.length).toBe(0);
        const btn = document.getElementById('action-undo-transform');
        expect(btn.disabled).toBe(true);

        window.alert.mockRestore();
    });

    it('handleUndo does nothing when stack is empty', () => {
        const original = content;
        ui.handleUndo();
        expect(content).toBe(original);
    });
});

describe('Event listener smoke tests', () => {
    it('clicking restore-markdown button triggers handleRestoreMarkdown', async () => {
        const spy = vi.spyOn(ui, 'handleRestoreMarkdown').mockResolvedValue();
        document.getElementById('action-restore-markdown').click();
        expect(spy).toHaveBeenCalledOnce();
        spy.mockRestore();
    });

    it('clicking undo button triggers handleUndo', async () => {
        // First do a transform so undo button becomes enabled
        await ui.handleRestoreMarkdown();
        const btn = document.getElementById('action-undo-transform');
        expect(btn.disabled).toBe(false);

        const spy = vi.spyOn(ui, 'handleUndo').mockImplementation(() => {});
        btn.click();
        expect(spy).toHaveBeenCalledOnce();
        spy.mockRestore();
    });
});
