/**
 * Transform UI controller
 */

import { LLMClient } from './llm-client.js';
import { NewlineRemover } from './newline-remover.js';
import { FindReplace } from './find-replace.js';
import { AIRegex } from './ai-regex.js';

export class TransformUI {
    constructor(getContent, setContent) {
        this.getContent = getContent;
        this.setContent = setContent;
        this.llmClient = new LLMClient();
        this.newlineRemover = new NewlineRemover();
        this.findReplace = new FindReplace();
        this.aiRegex = new AIRegex();

        this.setupEventListeners();
        this.loadModels();
        this.loadLanguages();
        this.setupFindReplaceDialog();
    }

    setupEventListeners() {
        // Newline removal
        document.getElementById('action-remove-newlines').addEventListener('click', () => {
            this.handleRemoveNewlines();
        });

        // Find & Replace
        document.getElementById('action-find-replace').addEventListener('click', () => {
            this.openFindReplaceDialog();
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

    // Find & Replace Dialog Methods

    setupFindReplaceDialog() {
        const dialog = document.getElementById('find-replace-dialog');
        const closeBtn = document.getElementById('close-find-replace-dialog');
        const basicTab = document.getElementById('fr-tab-basic');
        const aiTab = document.getElementById('fr-tab-ai');
        const presetSelect = document.getElementById('fr-preset');
        const findInput = document.getElementById('fr-find');
        const replaceInput = document.getElementById('fr-replace');
        const caseSensitive = document.getElementById('fr-case-sensitive');
        const previewBtn = document.getElementById('fr-preview-btn');
        const replaceAllBtn = document.getElementById('fr-replace-all-btn');
        const aiDescInput = document.getElementById('fr-ai-description');
        const aiGenerateBtn = document.getElementById('fr-ai-generate-btn');
        const aiPreviewBtn = document.getElementById('fr-ai-preview-btn');
        const aiApplyBtn = document.getElementById('fr-ai-apply-btn');

        // Close dialog
        closeBtn.addEventListener('click', () => dialog.close());

        // Tab switching
        basicTab.addEventListener('click', () => this.switchFRTab('basic'));
        aiTab.addEventListener('click', () => this.switchFRTab('ai'));

        // Preset change
        presetSelect.addEventListener('change', (e) => this.handlePresetChange(e.target.value));

        // Preview
        previewBtn.addEventListener('click', () => this.handleFRPreview());

        // Replace All
        replaceAllBtn.addEventListener('click', () => this.handleFRReplaceAll());

        // AI Generate
        aiGenerateBtn.addEventListener('click', () => this.handleAIGenerate());

        // AI Preview
        aiPreviewBtn.addEventListener('click', () => this.handleAIPreview());

        // AI Apply
        aiApplyBtn.addEventListener('click', () => this.handleAIApply());

        // Populate presets
        this.populatePresets();
    }

    openFindReplaceDialog() {
        const dialog = document.getElementById('find-replace-dialog');
        dialog.showModal();
    }

    switchFRTab(tab) {
        const basicTab = document.getElementById('fr-tab-basic');
        const aiTab = document.getElementById('fr-tab-ai');
        const basicContent = document.getElementById('fr-basic-content');
        const aiContent = document.getElementById('fr-ai-content');

        if (tab === 'basic') {
            basicTab.classList.add('fr-tab--active');
            aiTab.classList.remove('fr-tab--active');
            basicContent.style.display = 'block';
            aiContent.style.display = 'none';
        } else {
            aiTab.classList.add('fr-tab--active');
            basicTab.classList.remove('fr-tab--active');
            aiContent.style.display = 'block';
            basicContent.style.display = 'none';
        }
    }

    populatePresets() {
        const select = document.getElementById('fr-preset');
        const presets = this.findReplace.getPresetList();

        select.innerHTML = '';
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            select.appendChild(option);
        });

        // Trigger initial preset update
        this.handlePresetChange(select.value);
    }

    handlePresetChange(presetId) {
        const preset = this.findReplace.getPreset(presetId);
        const findInput = document.getElementById('fr-find');
        const exampleEl = document.getElementById('fr-example');

        if (preset) {
            findInput.placeholder = preset.placeholder;
            exampleEl.textContent = `Example: ${preset.example}`;

            if (preset.noInput) {
                findInput.disabled = true;
                findInput.value = '';
            } else {
                findInput.disabled = false;
            }

            if (preset.isRemove) {
                document.getElementById('fr-replace').value = '';
            }
        }
    }

    handleFRPreview() {
        const content = this.getContent();
        if (!content.trim()) {
            alert('No content to search');
            return;
        }

        const presetId = document.getElementById('fr-preset').value;
        const findText = document.getElementById('fr-find').value;
        const caseSensitive = document.getElementById('fr-case-sensitive').checked;

        try {
            const { pattern, flags } = this.findReplace.generatePattern(presetId, findText);
            const finalFlags = this.findReplace.getCaseFlags(caseSensitive, flags);
            const matches = this.findReplace.findMatches(content, pattern, finalFlags);
            const stats = this.findReplace.getMatchStats(matches, content);

            const previewContainer = document.querySelector('.fr-preview');
            const previewEl = document.getElementById('fr-preview-stats');
            const samplesEl = document.getElementById('fr-preview-samples');

            previewContainer.style.display = 'block';
            previewEl.textContent = stats.message;

            if (matches.length > 0) {
                this.showFRPreviewSamples(matches.slice(0, 5), content);
            } else {
                samplesEl.innerHTML = '';
            }
        } catch (error) {
            alert(`Preview error: ${error.message}`);
        }
    }

    showFRPreviewSamples(matches, content) {
        const container = document.getElementById('fr-preview-samples');
        container.innerHTML = '';

        matches.forEach(match => {
            const sample = document.createElement('div');
            sample.className = 'fr-preview-sample';

            const context = this.getMatchContext(match, content);
            sample.innerHTML = `
                <div class="fr-preview-line">Line ${match.line || '?'}</div>
                <div class="fr-preview-text">
                    ${this.escapeHtml(context.before)}<mark>${this.escapeHtml(match.text)}</mark>${this.escapeHtml(context.after)}
                </div>
            `;

            container.appendChild(sample);
        });
    }

    getMatchContext(match, content, contextLength = 30) {
        const start = Math.max(0, match.index - contextLength);
        const end = Math.min(content.length, match.index + match.length + contextLength);

        return {
            before: content.substring(start, match.index),
            after: content.substring(match.index + match.length, end)
        };
    }

    handleFRReplaceAll() {
        const content = this.getContent();
        if (!content.trim()) {
            alert('No content to replace');
            return;
        }

        const presetId = document.getElementById('fr-preset').value;
        const findText = document.getElementById('fr-find').value;
        const replaceText = document.getElementById('fr-replace').value;
        const caseSensitive = document.getElementById('fr-case-sensitive').checked;

        try {
            const { pattern, flags } = this.findReplace.generatePattern(presetId, findText);
            const finalFlags = this.findReplace.getCaseFlags(caseSensitive, flags);
            const result = this.findReplace.replace(content, pattern, replaceText, finalFlags);

            this.setContent(result);
            document.getElementById('find-replace-dialog').close();
            this.showSuccess('Replace completed');
        } catch (error) {
            alert(`Replace error: ${error.message}`);
        }
    }

    async handleAIGenerate() {
        const description = document.getElementById('fr-ai-description').value.trim();
        if (!description) {
            alert('Please describe what you want to find');
            return;
        }

        this.showLoading('Generating regex pattern...');

        try {
            const result = await this.aiRegex.generatePattern(description, 'find');

            document.getElementById('fr-ai-pattern').value = result.pattern;
            document.getElementById('fr-ai-flags').value = result.flags;
            document.getElementById('fr-ai-explanation').textContent = result.explanation;

            // Show the fields
            document.getElementById('fr-ai-explanation').style.display = 'block';
            document.getElementById('fr-ai-pattern-group').style.display = 'block';
            document.getElementById('fr-ai-flags-group').style.display = 'block';
            document.getElementById('fr-ai-preview-btn').style.display = 'inline-block';

            if (result.examples && result.examples.length > 0) {
                const examplesEl = document.getElementById('fr-ai-examples');
                examplesEl.innerHTML = result.examples.map(ex =>
                    `<div class="fr-ai-example">• ${this.escapeHtml(ex)}</div>`
                ).join('');
                examplesEl.style.display = 'block';
            }

            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            alert(`Failed to generate pattern: ${error.message}`);
        }
    }

    handleAIPreview() {
        const content = this.getContent();
        if (!content.trim()) {
            alert('No content to search');
            return;
        }

        const pattern = document.getElementById('fr-ai-pattern').value;
        const flags = document.getElementById('fr-ai-flags').value;

        if (!pattern) {
            alert('Please generate a pattern first');
            return;
        }

        try {
            const matches = this.findReplace.findMatches(content, pattern, flags);
            const stats = this.findReplace.getMatchStats(matches, content);

            const previewContainer = document.getElementById('fr-ai-preview');
            const previewEl = document.getElementById('fr-ai-preview-stats');
            const samplesEl = document.getElementById('fr-ai-preview-samples');

            previewContainer.style.display = 'block';
            previewEl.textContent = stats.message;

            if (matches.length > 0) {
                samplesEl.innerHTML = '';
                matches.slice(0, 5).forEach(match => {
                    const sample = document.createElement('div');
                    sample.className = 'fr-preview-sample';

                    const context = this.getMatchContext(match, content);
                    sample.innerHTML = `
                        <div class="fr-preview-line">Line ${match.line || '?'}</div>
                        <div class="fr-preview-text">
                            ${this.escapeHtml(context.before)}<mark>${this.escapeHtml(match.text)}</mark>${this.escapeHtml(context.after)}
                        </div>
                    `;

                    samplesEl.appendChild(sample);
                });
            } else {
                samplesEl.innerHTML = '';
            }
        } catch (error) {
            alert(`Preview error: ${error.message}`);
        }
    }

    async handleAIApply() {
        const content = this.getContent();
        if (!content.trim()) {
            alert('No content to search');
            return;
        }

        const pattern = document.getElementById('fr-ai-pattern').value;
        const flags = document.getElementById('fr-ai-flags').value;
        const replacement = document.getElementById('fr-ai-replacement').value;

        if (!pattern) {
            alert('Please generate a pattern first');
            return;
        }

        try {
            const result = this.findReplace.replace(content, pattern, replacement, flags);
            this.setContent(result);
            document.getElementById('find-replace-dialog').close();
            this.showSuccess('Pattern applied successfully');
        } catch (error) {
            alert(`Apply error: ${error.message}`);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
