/**
 * LocalStorage management utilities
 */

const AUTO_SAVE_KEY = 'markdown-viewer-autosave';
const SETTINGS_KEY = 'markdown-viewer-settings';

export class StorageManager {
    saveAutoSave(content) {
        try {
            const data = {
                content,
                timestamp: Date.now()
            };
            localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to auto-save:', error);
        }
    }

    loadAutoSave() {
        try {
            const data = localStorage.getItem(AUTO_SAVE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load auto-save:', error);
        }
        return null;
    }

    clearAutoSave() {
        localStorage.removeItem(AUTO_SAVE_KEY);
    }

    saveSettings(settings) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    loadSettings() {
        try {
            const data = localStorage.getItem(SETTINGS_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
        return {};
    }
}
