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

    /**
     * Transform large content using chunked processing with progress callbacks.
     *
     * Splits content at markdown boundaries, processes each chunk via LLM,
     * and reassembles the result. Streams progress events.
     *
     * @param {string} content - Markdown content to transform
     * @param {string} operation - Operation type (translate, summarize, etc.)
     * @param {object} params - Operation parameters
     * @param {function} onProgress - Callback: (chunkIndex, totalChunks) => void
     * @returns {Promise<string>} Transformed content
     */
    async transformChunked(content, operation, params = {}, onProgress = null) {
        const url = `${APIClient.getBackendURL()}/llm/transform-chunked`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ content, operation, params }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalContent = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (!line.trim()) continue;

                let event;
                try {
                    event = JSON.parse(line);
                } catch (parseErr) {
                    console.warn('Failed to parse stream event:', line);
                    continue;
                }

                if (event.type === 'progress' && onProgress) {
                    onProgress(event.chunk_index, event.total_chunks);
                } else if (event.type === 'complete') {
                    finalContent = event.content;
                } else if (event.type === 'error') {
                    throw new Error(
                        event.error || `Chunk ${event.chunk_index} failed`
                    );
                }
            }
        }

        // Process any remaining data in the buffer after stream ends
        if (buffer.trim()) {
            let event;
            try {
                event = JSON.parse(buffer.trim());
            } catch (parseErr) {
                console.warn('Failed to parse final stream buffer:', buffer);
                event = null;
            }

            if (event) {
                if (event.type === 'complete') {
                    finalContent = event.content;
                } else if (event.type === 'error') {
                    throw new Error(
                        event.error || `Chunk ${event.chunk_index} failed`
                    );
                }
            }
        }

        if (finalContent === null) {
            throw new Error('Stream ended without completion event');
        }

        return finalContent;
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
