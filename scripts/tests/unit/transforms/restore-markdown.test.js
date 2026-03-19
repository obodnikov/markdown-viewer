/**
 * Unit tests for Restore Markdown feature
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mock TransformUI dependencies to test handleRestoreMarkdown in isolation
 */
function createMockTransformUI(content = '', llmResult = null, llmError = null) {
    const ui = {
        getContent: vi.fn(() => content),
        setContent: vi.fn(),
        showLoading: vi.fn(),
        hideLoading: vi.fn(),
        showError: vi.fn(),
        llmClient: {
            customPrompt: llmError
                ? vi.fn().mockRejectedValue(llmError)
                : vi.fn().mockResolvedValue(llmResult),
        },
    };
    return ui;
}

/**
 * Extracted handler logic matching transform-ui.js handleRestoreMarkdown
 */
async function handleRestoreMarkdown(ui) {
    const content = ui.getContent();

    if (!content.trim()) {
        ui.showError('No content to restore');
        return;
    }

    const prompt = 'The following text was originally in Markdown format but lost its formatting during copy/paste. ' +
        'Analyze the content structure and context to restore proper Markdown formatting: ' +
        'headings, lists, code blocks, bold/italic, links, tables, blockquotes, etc. ' +
        'Do not change, add, or remove any content — only restore the formatting.';

    ui.showLoading('Restoring Markdown formatting...');

    try {
        const result = await ui.llmClient.customPrompt(content, prompt);
        ui.setContent(result);
        ui.hideLoading();
    } catch (error) {
        ui.hideLoading();

        if (error.message && error.message.includes('fetch')) {
            ui.showError('Network error: could not reach the LLM service. Check your connection.');
        } else if (error.message && error.message.includes('timeout')) {
            ui.showError('Request timed out. The content may be too long — try a shorter selection.');
        } else if (error.message && (error.message.includes('rate') || error.message.includes('429'))) {
            ui.showError('Rate limited by the LLM provider. Please wait a moment and try again.');
        } else {
            ui.showError(`Markdown restore failed: ${error.message}`);
        }
    }
}

describe('Restore Markdown', () => {
    describe('empty content guard', () => {
        it('should show error when content is empty', async () => {
            const ui = createMockTransformUI('');
            await handleRestoreMarkdown(ui);

            expect(ui.showError).toHaveBeenCalledWith('No content to restore');
            expect(ui.llmClient.customPrompt).not.toHaveBeenCalled();
            expect(ui.showLoading).not.toHaveBeenCalled();
        });

        it('should show error when content is only whitespace', async () => {
            const ui = createMockTransformUI('   \n\t  ');
            await handleRestoreMarkdown(ui);

            expect(ui.showError).toHaveBeenCalledWith('No content to restore');
            expect(ui.llmClient.customPrompt).not.toHaveBeenCalled();
        });
    });

    describe('successful restore', () => {
        it('should call LLM with correct prompt and set result', async () => {
            const input = 'Introduction This is a heading Some body text';
            const restored = '# Introduction\n\nThis is a heading\n\nSome body text';
            const ui = createMockTransformUI(input, restored);

            await handleRestoreMarkdown(ui);

            expect(ui.showLoading).toHaveBeenCalledWith('Restoring Markdown formatting...');
            expect(ui.llmClient.customPrompt).toHaveBeenCalledWith(input, expect.stringContaining('Markdown'));
            expect(ui.setContent).toHaveBeenCalledWith(restored);
            expect(ui.hideLoading).toHaveBeenCalled();
            expect(ui.showError).not.toHaveBeenCalled();
        });

        it('should pass prompt that instructs no content changes', async () => {
            const ui = createMockTransformUI('some text', 'some text');
            await handleRestoreMarkdown(ui);

            const prompt = ui.llmClient.customPrompt.mock.calls[0][1];
            expect(prompt).toContain('Do not change, add, or remove any content');
        });
    });

    describe('error handling', () => {
        it('should show network error for fetch failures', async () => {
            const ui = createMockTransformUI('content', null, new Error('fetch failed'));
            await handleRestoreMarkdown(ui);

            expect(ui.hideLoading).toHaveBeenCalled();
            expect(ui.showError).toHaveBeenCalledWith(
                expect.stringContaining('Network error')
            );
        });

        it('should show timeout error for timeout failures', async () => {
            const ui = createMockTransformUI('content', null, new Error('Request timeout'));
            await handleRestoreMarkdown(ui);

            expect(ui.showError).toHaveBeenCalledWith(
                expect.stringContaining('timed out')
            );
        });

        it('should show rate limit error for 429 responses', async () => {
            const ui = createMockTransformUI('content', null, new Error('429 Too Many Requests'));
            await handleRestoreMarkdown(ui);

            expect(ui.showError).toHaveBeenCalledWith(
                expect.stringContaining('Rate limited')
            );
        });

        it('should show generic error for unknown failures', async () => {
            const ui = createMockTransformUI('content', null, new Error('Something unexpected'));
            await handleRestoreMarkdown(ui);

            expect(ui.showError).toHaveBeenCalledWith(
                'Markdown restore failed: Something unexpected'
            );
        });

        it('should always hide loading on error', async () => {
            const ui = createMockTransformUI('content', null, new Error('any error'));
            await handleRestoreMarkdown(ui);

            expect(ui.hideLoading).toHaveBeenCalled();
        });
    });
});


describe('Undo Transformation', () => {
    function createUndoStack() {
        const stack = {
            undoStack: [],
            maxUndoHistory: 10,
            content: 'current content',
            getContent() { return this.content; },
            setContent(val) { this.content = val; },
        };

        stack.saveSnapshot = function(label) {
            const content = this.getContent();
            if (!content) return;
            this.undoStack.push({ content, label });
            if (this.undoStack.length > this.maxUndoHistory) {
                this.undoStack.shift();
            }
        };

        stack.handleUndo = function() {
            if (this.undoStack.length === 0) return;
            const snapshot = this.undoStack.pop();
            this.setContent(snapshot.content);
        };

        return stack;
    }

    it('should save a snapshot with label', () => {
        const s = createUndoStack();
        s.saveSnapshot('Summarize');

        expect(s.undoStack.length).toBe(1);
        expect(s.undoStack[0].content).toBe('current content');
        expect(s.undoStack[0].label).toBe('Summarize');
    });

    it('should restore content on undo', () => {
        const s = createUndoStack();
        s.saveSnapshot('Translate');
        s.content = 'translated content';

        s.handleUndo();

        expect(s.content).toBe('current content');
        expect(s.undoStack.length).toBe(0);
    });

    it('should support multiple undo levels', () => {
        const s = createUndoStack();
        s.saveSnapshot('Step 1');
        s.content = 'after step 1';

        s.saveSnapshot('Step 2');
        s.content = 'after step 2';

        s.handleUndo();
        expect(s.content).toBe('after step 1');

        s.handleUndo();
        expect(s.content).toBe('current content');
    });

    it('should do nothing when undo stack is empty', () => {
        const s = createUndoStack();
        s.handleUndo();

        expect(s.content).toBe('current content');
    });

    it('should cap stack at maxUndoHistory', () => {
        const s = createUndoStack();
        s.maxUndoHistory = 3;

        for (let i = 0; i < 5; i++) {
            s.content = `version ${i}`;
            s.saveSnapshot(`Step ${i}`);
        }

        expect(s.undoStack.length).toBe(3);
        expect(s.undoStack[0].label).toBe('Step 2');
    });

    it('should not save snapshot when content is empty', () => {
        const s = createUndoStack();
        s.content = '';
        s.saveSnapshot('Empty');

        expect(s.undoStack.length).toBe(0);
    });
});
