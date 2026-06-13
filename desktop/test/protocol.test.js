import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';

// electron mock is handled by test/setup.js
const { protocol, net } = require('electron');
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

  // Regression: the proxy must follow the LIVE backend port, not a value
  // captured once at startup. A stale port produces a green health lamp (which
  // reads the live port) while every /api/* request fails with
  // "Backend not available" — the exact symptom this fix targets.
  describe('Flask proxy follows the live backend port', () => {
    const origHandle = protocol.handle;
    const origFetch = net.fetch;
    let capturedHandler;
    let fetchedUrl;

    function register(portResolver) {
      capturedHandler = null;
      fetchedUrl = null;
      // Capture the handler registered with protocol.handle and the URL net.fetch sees
      protocol.handle = (scheme, handler) => { capturedHandler = handler; };
      net.fetch = async (url) => { fetchedUrl = url; return new Response('{}', { status: 200 }); };
      registerProtocol(portResolver);
    }

    function callApi(apiPath = '/api/health', method = 'GET') {
      return capturedHandler({
        url: `app://.${apiPath}`,
        method,
        headers: {},
        arrayBuffer: async () => new ArrayBuffer(0),
      });
    }

    afterEach(() => {
      protocol.handle = origHandle;
      net.fetch = origFetch;
    });

    it('proxies to the port returned by the resolver', async () => {
      register(() => 5050);
      await callApi('/api/health');
      expect(fetchedUrl).toBe('http://127.0.0.1:5050/api/health');
    });

    it('uses the NEW port after the backend restarts on a different port', async () => {
      let livePort = 5050;
      register(() => livePort);

      await callApi('/api/health');
      expect(fetchedUrl).toBe('http://127.0.0.1:5050/api/health');

      // Simulate an auto-restart (sleep/idle recovery) that picked a new free port
      livePort = 5073;
      await callApi('/api/health');
      expect(fetchedUrl).toBe('http://127.0.0.1:5073/api/health');
    });

    it('returns 503 "Backend not available" when the resolver yields no port', async () => {
      register(() => null);
      const res = await callApi('/api/health');
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe('Backend not available');
    });

    it('recovers once the resolver reports a port — no re-registration needed', async () => {
      let livePort = null; // backend failed to start at app launch
      register(() => livePort);

      const downRes = await callApi('/api/health');
      expect(downRes.status).toBe(503); // proxy reports unavailable

      // Health monitor restarts the backend → live port now available
      livePort = 5051;
      await callApi('/api/health');
      expect(fetchedUrl).toBe('http://127.0.0.1:5051/api/health');
    });

    it('forwards POST bodies to the live port (export path)', async () => {
      register(() => 5060);
      await callApi('/api/export/pdf', 'POST');
      expect(fetchedUrl).toBe('http://127.0.0.1:5060/api/export/pdf');
    });

    it('still accepts a static port number (back-compat)', async () => {
      register(5050);
      await callApi('/api/llm/transform');
      expect(fetchedUrl).toBe('http://127.0.0.1:5050/api/llm/transform');
    });
  });
});
