/**
 * Token counting utility using js-tiktoken
 * Uses cl100k_base encoding (GPT-3.5-turbo, GPT-4 standard)
 */

export class Tokenizer {
    constructor() {
        this.encoding = null;
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Initialize the tokenizer (lazy loading)
     */
    async init() {
        // If already initialized, return immediately
        if (this.isInitialized) {
            return;
        }

        // If initialization is in progress, wait for it
        if (this.initPromise) {
            return this.initPromise;
        }

        // Start initialization
        this.initPromise = this._doInit();
        await this.initPromise;
    }

    async _doInit() {
        try {
            // Check if tiktoken is available globally
            if (typeof tiktoken === 'undefined') {
                console.warn('tiktoken library not loaded');
                this.isInitialized = false;
                return;
            }

            // Get cl100k_base encoding (GPT-3.5/GPT-4)
            this.encoding = tiktoken.get_encoding('cl100k_base');
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize tokenizer:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Count tokens in text
     * @param {string} text - Text to count tokens for
     * @returns {number} Token count
     */
    async countTokens(text) {
        if (!text || typeof text !== 'string') {
            return 0;
        }

        // Initialize if needed
        if (!this.isInitialized) {
            await this.init();
        }

        // Fallback to word count estimation if tokenizer failed to load
        if (!this.isInitialized || !this.encoding) {
            return this.estimateTokens(text);
        }

        try {
            const tokens = this.encoding.encode(text);
            return tokens.length;
        } catch (error) {
            console.error('Token counting error:', error);
            return this.estimateTokens(text);
        }
    }

    /**
     * Estimate tokens using simple heuristic (fallback)
     * Rough approximation: 1 token ≈ 4 characters for English text
     * @param {string} text - Text to estimate
     * @returns {number} Estimated token count
     */
    estimateTokens(text) {
        // Simple estimation: ~4 chars per token on average
        return Math.ceil(text.length / 4);
    }

    /**
     * Format token count for display
     * @param {number} count - Token count
     * @returns {string} Formatted string (e.g., "2.3k tokens")
     */
    formatTokenCount(count) {
        if (count === 0) {
            return '0 tokens';
        } else if (count < 1000) {
            return `${count} tokens`;
        } else if (count < 10000) {
            // Show one decimal place (e.g., 2.3k)
            return `${(count / 1000).toFixed(1)}k tokens`;
        } else {
            // Show whole number (e.g., 15k)
            return `${Math.round(count / 1000)}k tokens`;
        }
    }

    /**
     * Free resources
     */
    dispose() {
        if (this.encoding) {
            try {
                this.encoding.free();
            } catch (error) {
                // Ignore disposal errors
            }
            this.encoding = null;
        }
        this.isInitialized = false;
    }
}

// Create singleton instance
export const tokenizer = new Tokenizer();
