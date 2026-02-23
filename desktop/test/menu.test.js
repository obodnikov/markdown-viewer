import { describe, it, expect, beforeEach } from 'vitest';

// electron mock is handled by test/setup.js
const { Menu, BrowserWindow } = require('electron');
const { setupMenu, openSettings } = require('../menu');

function createMockSettings() {
  return { get: (key, def) => def, set: () => {}, getAll: () => ({}) };
}

describe('menu', () => {
  beforeEach(() => {
    Menu._clearTemplates();
  });

  describe('setupMenu', () => {
    it('calls Menu.buildFromTemplate with an array', () => {
      setupMenu(new BrowserWindow(), createMockSettings());
      const template = Menu._getLastTemplate();
      expect(Array.isArray(template)).toBe(true);
    });

    it('includes File menu with New, Open, Save, Export', () => {
      setupMenu(new BrowserWindow(), createMockSettings());
      const template = Menu._getLastTemplate();
      const fileMenu = template.find(m => m.label === 'File');
      expect(fileMenu).toBeDefined();
      const labels = fileMenu.submenu.map(i => i.label).filter(Boolean);
      expect(labels).toContain('New Document');
      expect(labels).toContain('Open...');
      expect(labels).toContain('Save');
      expect(labels).toContain('Export...');
    });

    it('includes Edit menu with standard roles', () => {
      setupMenu(new BrowserWindow(), createMockSettings());
      const template = Menu._getLastTemplate();
      const editMenu = template.find(m => m.label === 'Edit');
      expect(editMenu).toBeDefined();
      const roles = editMenu.submenu.map(i => i.role).filter(Boolean);
      expect(roles).toContain('undo');
      expect(roles).toContain('redo');
      expect(roles).toContain('copy');
      expect(roles).toContain('paste');
    });

    it('includes View menu with devTools toggle', () => {
      setupMenu(new BrowserWindow(), createMockSettings());
      const roles = Menu._getLastTemplate()
        .find(m => m.label === 'View').submenu
        .map(i => i.role).filter(Boolean);
      expect(roles).toContain('toggleDevTools');
      expect(roles).toContain('reload');
    });

    it('includes Integrations menu with GitHub and BookStack', () => {
      setupMenu(new BrowserWindow(), createMockSettings());
      const labels = Menu._getLastTemplate()
        .find(m => m.label === 'Integrations').submenu
        .map(i => i.label);
      expect(labels).toContain('GitHub...');
      expect(labels).toContain('BookStack...');
    });

    it('includes Help menu', () => {
      setupMenu(new BrowserWindow(), createMockSettings());
      expect(Menu._getLastTemplate().find(m => m.label === 'Help')).toBeDefined();
    });
  });

  describe('openSettings', () => {
    it('is a function', () => {
      expect(typeof openSettings).toBe('function');
    });
    it('does not throw when called', () => {
      expect(() => openSettings()).not.toThrow();
    });
  });
});
