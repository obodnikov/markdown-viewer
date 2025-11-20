/**
 * Transform UI controller
 */

import { LLMClient } from './llm-client.js';
import { NewlineRemover } from './newline-remover.js';

export class TransformUI {
    constructor(getContent, setContent) {
        this.getContent = getContent;
        this.setContent = setContent;
        this.llmClient = new LLMClient();
        this.newlineRemover = new NewlineRemover();

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Newline removal
        document.getElementById('action-remove-newlines').addEventListener('click', () => {
            this.handleRemoveNewlines();
        });

        // Translation
        document.getElementById('action-translate').addEventListener('click', () => {
            this.handleTranslate();
        });

        // Tone transformations
        document.getElementById('action-tone-formal').addEventListener('click', () => {
            this.handleChangeTone('formal');
        });

        document.getElementById('action-tone-casual').addEventListener('click', () => {
            this.handleChangeTone('casual');
        });

        // Summarize/Expand
        document.getElementById('action-summarize').addEventListener('click', () => {
            this.handleSummarize();
        });

        document.getElementById('action-expand').addEventListener('click', () => {
            this.handleExpand();
        });

        // Custom prompt
        document.getElementById('action-custom-prompt').addEventListener('click', () => {
            this.handleCustomPrompt();
        });
    }

    async handleRemoveNewlines() {
        const content = this.getContent();
        if (!content.trim()) {
            this.showError('No content to transform');
            return;
        }

        const mode = document.querySelector('input[name="newline-mode"]:checked').value;

        this.showLoading('Removing newlines...');

        try {
            const result = this.newlineRemover.remove(content, mode);
            this.setContent(result);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to remove newlines: ${error.message}`);
        }
    }

    async handleTranslate() {
        const content = this.getContent();
        if (!content.trim()) {
            this.showError('No content to translate');
            return;
        }

        const targetLanguage = document.getElementById('translate-lang').value;

        this.showLoading(`Translating to ${targetLanguage}...`);

        try {
            const result = await this.llmClient.transform(content, 'translate', {
                target_language: targetLanguage
            });
            this.setContent(result);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Translation failed: ${error.message}`);
        }
    }

    async handleChangeTone(tone) {
        const content = this.getContent();
        if (!content.trim()) {
            this.showError('No content to transform');
            return;
        }

        this.showLoading(`Changing tone to ${tone}...`);

        try {
            const result = await this.llmClient.transform(content, 'change_tone', { tone });
            this.setContent(result);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Tone change failed: ${error.message}`);
        }
    }

    async handleSummarize() {
        const content = this.getContent();
        if (!content.trim()) {
            this.showError('No content to summarize');
            return;
        }

        this.showLoading('Summarizing...');

        try {
            const result = await this.llmClient.transform(content, 'summarize', {
                length: 'medium'
            });
            this.setContent(result);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Summarization failed: ${error.message}`);
        }
    }

    async handleExpand() {
        const content = this.getContent();
        if (!content.trim()) {
            this.showError('No content to expand');
            return;
        }

        this.showLoading('Expanding content...');

        try {
            const result = await this.llmClient.transform(content, 'expand', {});
            this.setContent(result);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Expansion failed: ${error.message}`);
        }
    }

    async handleCustomPrompt() {
        const content = this.getContent();
        const prompt = document.getElementById('custom-prompt').value.trim();
        const model = document.getElementById('llm-model').value;

        if (!content.trim()) {
            this.showError('No content to transform');
            return;
        }

        if (!prompt) {
            this.showError('Please enter a prompt');
            return;
        }

        this.showLoading('Applying custom transformation...');

        try {
            const result = await this.llmClient.customPrompt(content, prompt, model);
            this.setContent(result);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Transformation failed: ${error.message}`);
        }
    }

    showLoading(message) {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        text.textContent = message;
        overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'none';
    }

    showError(message) {
        // Use toast notification from main app
        const event = new CustomEvent('toast', {
            detail: { message, type: 'error' }
        });
        document.dispatchEvent(event);
    }
}
