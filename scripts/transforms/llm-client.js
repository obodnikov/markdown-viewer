/**
 * LLM API client for transformations
 */

import { APIClient } from '../utils/api.js';

export class LLMClient {
    async transform(content, operation, params = {}) {
        try {
            const response = await APIClient.post('/llm/transform', {
                content,
                operation,
                params
            });

            if (response.success) {
                return response.content;
            } else {
                throw new Error(response.error || 'Transformation failed');
            }
        } catch (error) {
            console.error('LLM transformation error:', error);
            throw error;
        }
    }

    async customPrompt(content, prompt, model = null) {
        try {
            const payload = {
                content,
                prompt,
                preserve_markdown: true
            };

            if (model) {
                payload.model = model;
            }

            const response = await APIClient.post('/llm/custom-prompt', payload);

            if (response.success) {
                return response.content;
            } else {
                throw new Error(response.error || 'Custom prompt failed');
            }
        } catch (error) {
            console.error('Custom prompt error:', error);
            throw error;
        }
    }

    async listModels() {
        try {
            const response = await APIClient.get('/llm/models');

            if (response.success) {
                return response.models;
            } else {
                throw new Error(response.error || 'Failed to fetch models');
            }
        } catch (error) {
            console.error('List models error:', error);
            return [];
        }
    }

    async listLanguages() {
        try {
            const response = await APIClient.get('/llm/languages');

            if (response.success) {
                return response.languages;
            } else {
                throw new Error(response.error || 'Failed to fetch languages');
            }
        } catch (error) {
            console.error('List languages error:', error);
            return [];
        }
    }
}
