/**
 * Find and Replace functionality with preset patterns and regex support
 */

export class FindReplace {
    constructor() {
        this.presets = this.initializePresets();
    }

    /**
     * Initialize preset patterns
     */
    initializePresets() {
        return {
            'starts-with': {
                name: 'Starts with',
                description: 'Match text at the beginning of lines',
                generatePattern: (input) => `^${this.escapeRegex(input)}`,
                flags: 'gm',
                placeholder: 'Enter starting text...',
                example: '# matches all markdown headers'
            },
            'ends-with': {
                name: 'Ends with',
                description: 'Match text at the end of lines',
                generatePattern: (input) => `${this.escapeRegex(input)}$`,
                flags: 'gm',
                placeholder: 'Enter ending text...',
                example: '. matches lines ending with period'
            },
            'contains': {
                name: 'Contains',
                description: 'Match text anywhere in the content',
                generatePattern: (input) => this.escapeRegex(input),
                flags: 'g',
                placeholder: 'Enter text to find...',
                example: 'TODO matches all TODO items'
            },
            'whole-word': {
                name: 'Whole word',
                description: 'Match complete words only',
                generatePattern: (input) => `\\b${this.escapeRegex(input)}\\b`,
                flags: 'g',
                placeholder: 'Enter word...',
                example: 'cat matches "cat" but not "catalog"'
            },
            'remove-lines-starting': {
                name: 'Remove lines starting with',
                description: 'Delete entire lines that start with pattern',
                generatePattern: (input) => `^${this.escapeRegex(input)}.*$\\n?`,
                flags: 'gm',
                placeholder: 'Enter starting text...',
                example: '# removes all markdown headers',
                isRemove: true
            },
            'remove-lines-ending': {
                name: 'Remove lines ending with',
                description: 'Delete entire lines that end with pattern',
                generatePattern: (input) => `^.*${this.escapeRegex(input)}$\\n?`,
                flags: 'gm',
                placeholder: 'Enter ending text...',
                example: '. removes all lines ending with period',
                isRemove: true
            },
            'remove-lines-containing': {
                name: 'Remove lines containing',
                description: 'Delete entire lines containing the pattern',
                generatePattern: (input) => `^.*${this.escapeRegex(input)}.*$\\n?`,
                flags: 'gm',
                placeholder: 'Enter text...',
                example: 'TODO removes all lines with TODO',
                isRemove: true
            },
            'between': {
                name: 'Between',
                description: 'Match text between two patterns',
                generatePattern: (input) => {
                    const [start, end] = input.split('|').map(s => s.trim());
                    if (!start || !end) return null;
                    return `${this.escapeRegex(start)}(.*?)${this.escapeRegex(end)}`;
                },
                flags: 'gs',
                placeholder: 'start|end (use | to separate)',
                example: '**|** matches bold text in markdown',
                requiresDelimiter: true
            },
            'empty-lines': {
                name: 'Empty lines',
                description: 'Match blank lines',
                generatePattern: () => '^\\s*$\\n',
                flags: 'gm',
                placeholder: 'No input needed',
                example: 'Removes all empty lines',
                noInput: true,
                isRemove: true
            },
            'multiple-spaces': {
                name: 'Multiple spaces',
                description: 'Match consecutive spaces',
                generatePattern: () => ' {2,}',
                flags: 'g',
                placeholder: 'No input needed',
                example: 'Replaces multiple spaces with single space',
                noInput: true
            },
            'custom': {
                name: 'Custom RegExp',
                description: 'Enter your own regular expression',
                generatePattern: (input) => input,
                flags: 'g',
                placeholder: 'Enter regex pattern...',
                example: '\\d{3}-\\d{4} matches phone numbers',
                isCustom: true
            }
        };
    }

    /**
     * Escape special regex characters
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Get preset configuration
     */
    getPreset(presetId) {
        return this.presets[presetId] || null;
    }

    /**
     * Get all preset IDs and names
     */
    getPresetList() {
        return Object.entries(this.presets).map(([id, config]) => ({
            id,
            name: config.name,
            description: config.description
        }));
    }

    /**
     * Generate regex pattern from preset and input
     */
    generatePattern(presetId, input, customFlags = null) {
        const preset = this.getPreset(presetId);
        if (!preset) {
            throw new Error(`Unknown preset: ${presetId}`);
        }

        // Check if input is required
        if (!preset.noInput && !input && !preset.isCustom) {
            throw new Error('Input is required for this pattern');
        }

        // Handle delimiter requirement
        if (preset.requiresDelimiter && input && !input.includes('|')) {
            throw new Error('This pattern requires two parts separated by |');
        }

        // Generate pattern
        const pattern = preset.generatePattern(input);
        if (!pattern) {
            throw new Error('Failed to generate pattern');
        }

        const flags = customFlags || preset.flags;

        return { pattern, flags };
    }

    /**
     * Find all matches in content
     */
    findMatches(content, pattern, flags = 'g') {
        try {
            const regex = new RegExp(pattern, flags);
            const matches = [];
            let match;

            // For single line matching
            if (!flags.includes('m')) {
                while ((match = regex.exec(content)) !== null) {
                    matches.push({
                        text: match[0],
                        index: match.index,
                        length: match[0].length,
                        groups: match.slice(1)
                    });
                }
            } else {
                // For multiline matching
                const lines = content.split('\n');
                let offset = 0;

                lines.forEach((line, lineNum) => {
                    const lineRegex = new RegExp(pattern, flags.replace('g', ''));
                    const lineMatch = line.match(lineRegex);

                    if (lineMatch) {
                        matches.push({
                            text: lineMatch[0],
                            index: offset + lineMatch.index,
                            length: lineMatch[0].length,
                            line: lineNum + 1,
                            lineText: line,
                            groups: lineMatch.slice(1)
                        });
                    }

                    offset += line.length + 1; // +1 for newline
                });
            }

            return matches;
        } catch (error) {
            throw new Error(`Invalid regex pattern: ${error.message}`);
        }
    }

    /**
     * Replace matches in content
     */
    replace(content, pattern, replacement, flags = 'g') {
        try {
            const regex = new RegExp(pattern, flags);
            return content.replace(regex, replacement);
        } catch (error) {
            throw new Error(`Replace failed: ${error.message}`);
        }
    }

    /**
     * Get match statistics
     */
    getMatchStats(matches, content) {
        if (!matches || matches.length === 0) {
            return {
                count: 0,
                lines: 0,
                message: 'No matches found'
            };
        }

        const uniqueLines = new Set(matches.map(m => m.line).filter(l => l !== undefined));

        return {
            count: matches.length,
            lines: uniqueLines.size,
            message: `${matches.length} match${matches.length !== 1 ? 'es' : ''} found` +
                     (uniqueLines.size > 0 ? ` in ${uniqueLines.size} line${uniqueLines.size !== 1 ? 's' : ''}` : '')
        };
    }

    /**
     * Preview replacement result
     */
    previewReplace(content, pattern, replacement, flags = 'g', limit = 10) {
        const matches = this.findMatches(content, pattern, flags);
        const stats = this.getMatchStats(matches, content);

        // Get sample of matches with context
        const samples = matches.slice(0, limit).map(match => {
            const start = Math.max(0, match.index - 20);
            const end = Math.min(content.length, match.index + match.length + 20);
            const before = content.substring(start, match.index);
            const matched = match.text;
            const after = content.substring(match.index + match.length, end);

            // Calculate what the replacement would be
            const regex = new RegExp(pattern, flags);
            const replaced = matched.replace(regex, replacement);

            return {
                before,
                matched,
                after,
                replaced,
                line: match.line
            };
        });

        return {
            stats,
            samples,
            hasMore: matches.length > limit
        };
    }

    /**
     * Validate regex pattern
     */
    validatePattern(pattern, flags = 'g') {
        try {
            new RegExp(pattern, flags);
            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Get case-sensitive flag
     */
    getCaseFlags(caseSensitive, baseFlags = 'g') {
        if (caseSensitive) {
            return baseFlags;
        }
        return baseFlags.includes('i') ? baseFlags : baseFlags + 'i';
    }

    /**
     * Quick preset operations (common use cases)
     */
    quickOps = {
        removeEmptyLines: (content) => {
            return this.replace(content, '^\\s*$\\n', '', 'gm');
        },

        removeMultipleSpaces: (content) => {
            return this.replace(content, ' {2,}', ' ', 'g');
        },

        removeTrailingSpaces: (content) => {
            return this.replace(content, '[ \\t]+$', '', 'gm');
        },

        normalizeLineEndings: (content) => {
            return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        }
    };
}
