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
        this.loadModels();
        this.loadLanguages();
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
        console.log('🔄 Remove newlines clicked');

        const content = this.getContent();
        console.log('📄 Content length:', content.length);

        if (!content.trim()) {
            console.warn('⚠️ No content');
            alert('Please enter some markdown content first');
            return;
        }

        const modeElement = document.querySelector('input[name="newline-mode"]:checked');
        const mode = modeElement ? modeElement.value : 'smart';
        console.log('⚙️ Mode:', mode);

        this.showLoading('Removing newlines...');

        try {
            const result = this.newlineRemover.remove(content, mode);
            console.log('✅ Result length:', result.length);
            this.setContent(result);
            this.hideLoading();
            console.log('✅ Newlines removed successfully');
        } catch (error) {
            console.error('❌ Error:', error);
            this.hideLoading();
            alert(`Failed to remove newlines: ${error.message}`);
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
        console.error('Error:', message);
        alert(message);
    }

    showSuccess(message) {
        console.log('Success:', message);
        // Could add toast notification here
    }

    async loadModels() {
        try {
            const models = await this.llmClient.listModels();
            const modelSelect = document.getElementById('llm-model');

            if (models && models.length > 0) {
                // Clear existing options
                modelSelect.innerHTML = '';

                // Populate with models from backend
                models.forEach(modelId => {
                    const option = document.createElement('option');
                    option.value = modelId;
                    option.textContent = this.formatModelName(modelId);
                    modelSelect.appendChild(option);
                });

                console.log(`✅ Loaded ${models.length} models from backend`);
            } else {
                console.warn('⚠️ No models received from backend, keeping defaults');
            }
        } catch (error) {
            console.error('❌ Failed to load models:', error);
            console.warn('⚠️ Using hardcoded model list as fallback');
        }
    }

    async loadLanguages() {
        try {
            const languages = await this.llmClient.listLanguages();
            const languageSelect = document.getElementById('translate-lang');

            if (languages && languages.length > 0) {
                // Clear existing options
                languageSelect.innerHTML = '';

                // Populate with languages from backend
                languages.forEach(language => {
                    const option = document.createElement('option');
                    option.value = language;
                    option.textContent = language;
                    languageSelect.appendChild(option);
                });

                console.log(`✅ Loaded ${languages.length} languages from backend`);
            } else {
                console.warn('⚠️ No languages received from backend, keeping defaults');
            }
        } catch (error) {
            console.error('❌ Failed to load languages:', error);
            console.warn('⚠️ Using hardcoded language list as fallback');
        }
    }

    formatModelName(modelId) {
        // Convert model IDs to friendly names
        // e.g., "anthropic/claude-3.5-sonnet" -> "Claude 3.5 Sonnet"
        const parts = modelId.split('/');
        if (parts.length !== 2) return modelId;

        const [provider, model] = parts;

        // Handle common patterns
        if (model.includes('claude')) {
            return model
                .replace('claude-', 'Claude ')
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        if (model.includes('gpt')) {
            return model
                .replace('gpt-', 'GPT-')
                .replace(/-/g, ' ')
                .split(' ')
                .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        if (model.includes('gemini')) {
            return model
                .replace('gemini-', 'Gemini ')
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        if (model.includes('llama')) {
            return model
                .replace('llama-', 'Llama ')
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        // Default: capitalize each word
        return model
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
