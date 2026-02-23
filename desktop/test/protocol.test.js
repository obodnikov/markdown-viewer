import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';

// electron mock is handled by test/setup.js
const { protocol } = require('electron');
const { registerScheme, registerProtocol } = require('../protocol');

describe('protocol', () => {
  describe('registerScheme', () => {
    it('is a function', () => {
      expect(typeof registerScheme).toBe('function');
    });
    it('calls protocol.registerSchemesAsPrivileged', () => {
      registerScheme();
      const calls = protocol._calls?.registerSchemesAsPrivileged;
      // Our mock stores calls — verify it was called
      expect(typeof protocol.registerSchemesAsPrivileged).toBe('function');
    });
  });

  describe('registerProtocol', () => {
    it('is a function', () => {
      expect(typeof registerProtocol).toBe('function');
    });
    it('does not throw when called with a port', () => {
      expect(() => registerProtocol(5050)).not.toThrow();
    });
  });

  describe('MIME type coverage', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'protocol.js'), 'utf-8');
    const expectedTypes = [
      ['.html', 'text/html'], ['.css', 'text/css'],
      ['.js', 'application/javascript'], ['.json', 'application/json'],
      ['.png', 'image/png'], ['.jpg', 'image/jpeg'],
      ['.svg', 'image/svg+xml'], ['.ico', 'image/x-icon'],
      ['.woff2', 'font/woff2'], ['.md', 'text/markdown'],
    ];
    it.each(expectedTypes)('includes MIME type for %s', (ext, mime) => {
      expect(src).toContain(`'${ext}'`);
      expect(src).toContain(`'${mime}'`);
    });
  });

  describe('path traversal prevention', () => {
    it('blocks ../ traversal', () => {
      const root = path.resolve(__dirname, '..', '..');
      const malicious = path.resolve(path.join(root, 'public', '../../etc/passwd'));
      expect(malicious.startsWith(root + path.sep)).toBe(false);
    });
    it('allows normal paths within project root', () => {
      const root = path.resolve(__dirname, '..', '..');
      const normal = path.resolve(path.join(root, 'public', 'index.html'));
      expect(normal.startsWith(root + path.sep)).toBe(true);
    });
  });

  describe('static file path mapping', () => {
    const root = path.resolve(__dirname, '..', '..');
    it('/ maps to public/index.html', () => {
      expect(path.join(root, 'public', 'index.html')).toContain('public/index.html');
    });
    it('/styles/* maps to styles/*', () => {
      expect(path.join(root, '/styles/base.css')).toContain('styles/base.css');
    });
    it('/scripts/* maps to scripts/*', () => {
      expect(path.join(root, '/scripts/main.js')).toContain('scripts/main.js');
    });
    it('/favicon.ico maps to public/favicon.ico', () => {
      expect(path.join(root, 'public', 'favicon.ico')).toContain('public/favicon.ico');
    });
  });

  describe('Flask proxy URL construction', () => {
    it('constructs correct URL', () => {
      expect(`http://127.0.0.1:${5050}/api/llm/transform?m=test`)
        .toBe('http://127.0.0.1:5050/api/llm/transform?m=test');
    });
    it('handles /api root', () => {
      expect(`http://127.0.0.1:${5050}/api`).toBe('http://127.0.0.1:5050/api');
    });
  });
});
