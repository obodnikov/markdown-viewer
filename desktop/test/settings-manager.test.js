import { describe, it, expect, beforeEach } from 'vitest';

// electron-store mock is handled by test/setup.js
const SettingsManager = require('../settings-manager');

describe('SettingsManager', () => {
  let sm;
  beforeEach(() => { sm = new SettingsManager(); });

  describe('defaults', () => {
    it('returns default openrouterMaxTokens', () => {
      expect(sm.get('openrouterMaxTokens')).toBe(8000);
    });
    it('returns default logLevel', () => {
      expect(sm.get('logLevel')).toBe('INFO');
    });
    it('returns default devFlaskPort', () => {
      expect(sm.get('devFlaskPort')).toBe(5050);
    });
    it('returns default flaskPort as 0 (auto-detect)', () => {
      expect(sm.get('flaskPort')).toBe(0);
    });
    it('returns default window dimensions', () => {
      expect(sm.get('windowWidth')).toBe(1400);
      expect(sm.get('windowHeight')).toBe(900);
    });
    it('returns empty string for unset API keys', () => {
      expect(sm.get('openrouterApiKey')).toBe('');
      expect(sm.get('githubClientId')).toBe('');
    });
  });

  describe('get/set', () => {
    it('roundtrips a string value', () => {
      sm.set('openrouterApiKey', 'sk-test-123');
      expect(sm.get('openrouterApiKey')).toBe('sk-test-123');
    });
    it('roundtrips a number value', () => {
      sm.set('openrouterMaxTokens', 4096);
      expect(sm.get('openrouterMaxTokens')).toBe(4096);
    });
    it('returns fallback for unknown key', () => {
      expect(sm.get('nonExistentKey', 'fallback')).toBe('fallback');
    });
  });

  describe('getAll', () => {
    it('returns an object with all settings', () => {
      const all = sm.getAll();
      expect(all).toHaveProperty('openrouterApiKey');
      expect(all).toHaveProperty('logLevel');
      expect(all).toHaveProperty('windowWidth');
    });
  });

  describe('setAll', () => {
    it('sets multiple known keys at once', () => {
      sm.setAll({ openrouterApiKey: 'key-abc', logLevel: 'DEBUG', openrouterMaxTokens: 2048 });
      expect(sm.get('openrouterApiKey')).toBe('key-abc');
      expect(sm.get('logLevel')).toBe('DEBUG');
      expect(sm.get('openrouterMaxTokens')).toBe(2048);
    });
    it('ignores unknown keys', () => {
      sm.setAll({ unknownKey: 'ignored', logLevel: 'WARNING' });
      expect(sm.get('logLevel')).toBe('WARNING');
      expect(sm.get('unknownKey', 'not-found')).toBe('not-found');
    });
  });

  describe('isConfigured', () => {
    it('returns false when no API key is set', () => {
      expect(sm.isConfigured()).toBe(false);
    });
    it('returns true when API key is set', () => {
      sm.set('openrouterApiKey', 'sk-real-key');
      expect(sm.isConfigured()).toBe(true);
    });
  });

  describe('secretKey auto-generation', () => {
    it('generates a secretKey on construction if empty', () => {
      expect(sm.get('secretKey')).toBeTruthy();
      expect(sm.get('secretKey').length).toBeGreaterThan(0);
    });
    it('preserves existing secretKey', () => {
      sm.set('secretKey', 'my-custom-key');
      expect(sm.get('secretKey')).toBe('my-custom-key');
    });
  });
});
