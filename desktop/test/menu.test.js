import { describe, it, expect, beforeEach } from 'vitest';

// electron mock is handled by test/setup.js
const { Menu, BrowserWindow } = require('electron');
const { setupMenu, openSettings, refreshMenu } = require('../menu');

function createMockSettings() {
  const data = { recentFiles: [] };
  return {
    get: (key, def) => (key in data ? data[key] : def),
    set: (key, val) => { data[key] = val; },
    getAll: () => ({ ...data }),
    _data: data
  };
}

function createMockCreateWindow() {
  const calls = [];
  const fn = (opts) => { calls.push(opts); return calls.length; };
  fn.calls = calls;
  return fn;
}

describe('menu', () => {
  beforeEach(() => {
    Menu._clearTemplates();
    BrowserWindow._resetAll();
  });

  describe('setupMenu', () => {
    it('calls Menu.buildFromTemplate with an array', () => {
      setupMenu(createMockSettings(), createMockCreateWindow());
      const template = Menu._getLastTemplate();
      expect(Array.isArray(template)).toBe(true);
    });

    it('returns a refreshMenu function', () => {
      const refresh = setupMenu(createMockSettings(), createMockCreateWindow());
      expect(typeof refresh).toBe('function');
    });

    it('includes File menu with New Window, New Document, Open, Open in New Window, Open Recent, Save, Export', () => {
      setupMenu(createMockSettings(), createMockCreateWindow());
      const template = Menu._getLastTemplate();
      const fileMenu = template.find(m => m.label === 'File');
      expect(fileMenu).toBeDefined();
      const labels = fileMenu.submenu.map(i => i.label).filter(Boolean);
      expect(labels).toContain('New Window');
      expect(labels).toContain('New Document');
      expect(labels).toContain('Open...');
      expect(labels).toContain('Open in New Window...');
      expect(labels).toContain('Open Recent');
      expect(labels).toContain('Save');
      expect(labels).toContain('Export...');
    });

    it('New Window calls createWindow with isNewEmptyDocument', () => {
      const mockCreate = createMockCreateWindow();
      setupMenu(createMockSettings(), mockCreate);
      const template = Menu._getLastTemplate();
      const fileMenu = template.find(m => m.label === 'File');
      const newWindowItem = fileMenu.submenu.find(i => i.label === 'New Window');
      newWindowItem.click();
      expect(mockCreate.calls).toHaveLength(1);
      expect(mockCreate.calls[0]).toEqual({ isNewEmptyDocument: true, focus: true });
    });

    it('Open Recent shows "No Recent Files" when empty', () => {
      setupMenu(createMockSettings(), createMockCreateWindow());
      const template = Menu._getLastTemplate();
      const fileMenu = template.find(m => m.label === 'File');
      const recentItem = fileMenu.submenu.find(i => i.label === 'Open Recent');
      expect(recentItem.submenu).toBeDefined();
      expect(recentItem.submenu[0].label).toBe('No Recent Files');
      expect(recentItem.submenu[0].enabled).toBe(false);
    });

    it('Open Recent shows file entries when recent files exist', () => {
      const settings = createMockSettings();
      // Use real files that exist on disk (fs.existsSync check in menu)
      settings._data.recentFiles = [__filename, require.resolve('../menu.js')];
      setupMenu(settings, createMockCreateWindow());
      const template = Menu._getLastTemplate();
      const fileMenu = template.find(m => m.label === 'File');
      const recentItem = fileMenu.submenu.find(i => i.label === 'Open Recent');
      const labels = recentItem.submenu.map(i => i.label);
      expect(labels).toContain(require('path').basename(__filename));
      expect(labels).toContain('menu.js');
      expect(labels).toContain('Clear Recent');
    });

    it('includes Edit menu with standard roles', () => {
      setupMenu(createMockSettings(), createMockCreateWindow());
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
      setupMenu(createMockSettings(), createMockCreateWindow());
      const roles = Menu._getLastTemplate()
        .find(m => m.label === 'View').submenu
        .map(i => i.role).filter(Boolean);
      expect(roles).toContain('toggleDevTools');
      expect(roles).toContain('reload');
    });

    it('includes Integrations menu with GitHub and BookStack', () => {
      setupMenu(createMockSettings(), createMockCreateWindow());
      const labels = Menu._getLastTemplate()
        .find(m => m.label === 'Integrations').submenu
        .map(i => i.label);
      expect(labels).toContain('GitHub...');
      expect(labels).toContain('BookStack...');
    });

    it('includes Help menu', () => {
      setupMenu(createMockSettings(), createMockCreateWindow());
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

  describe('refreshMenu', () => {
    it('is a function', () => {
      expect(typeof refreshMenu).toBe('function');
    });
  });
});
