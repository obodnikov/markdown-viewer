// desktop/protocol.js — Custom app:// protocol handler
const { protocol, net, app } = require('electron');
const path = require('path');
const fs = require('fs');

// Register app:// as a privileged scheme (must be called before app.whenReady)
function registerScheme() {
  protocol.registerSchemesAsPrivileged([{
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }]);
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.md':   'text/markdown',
  '.txt':  'text/plain'
};

let flaskPort = null;

function getProjectRoot() {
  const { app } = require('electron');
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return path.resolve(__dirname, '..');
}

function registerProtocol(port) {
  flaskPort = port;

  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);

    // API requests → proxy to Flask
    if (pathname.startsWith('/api/') || pathname === '/api') {
      return proxyToFlask(request, pathname + url.search);
    }

    // Static file requests → serve from filesystem
    return serveStaticFile(pathname);
  });
}

async function proxyToFlask(originalRequest, apiPath) {
  if (!flaskPort) {
    return new Response(
      JSON.stringify({ error: 'Backend not available' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const flaskUrl = `http://127.0.0.1:${flaskPort}${apiPath}`;

  try {
    const fetchOptions = {
      method: originalRequest.method,
      headers: originalRequest.headers
    };

    // Forward body for non-GET/HEAD requests
    if (originalRequest.method !== 'GET' && originalRequest.method !== 'HEAD') {
      fetchOptions.body = await originalRequest.arrayBuffer();
    }

    return await net.fetch(flaskUrl, fetchOptions);
  } catch (error) {
    console.error(`[Protocol] Flask proxy error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: 'Backend unavailable', details: error.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function serveStaticFile(pathname) {
  const projectRoot = getProjectRoot();

  // Map URL paths to filesystem paths
  let filePath;

  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(projectRoot, 'public', 'index.html');
  } else if (pathname.startsWith('/styles/')) {
    filePath = path.join(projectRoot, pathname);
  } else if (pathname.startsWith('/scripts/')) {
    filePath = path.join(projectRoot, pathname);
  } else if (pathname.startsWith('/icons/')) {
    filePath = path.join(projectRoot, pathname);
  } else if (pathname === '/favicon.ico') {
    filePath = path.join(projectRoot, 'public', 'favicon.ico');
  } else {
    // Try public/ directory for anything else
    filePath = path.join(projectRoot, 'public', pathname);
  }

  // Security: prevent path traversal (use path.sep to avoid prefix false positives)
  const resolvedPath = path.resolve(filePath);
  const resolvedRoot = path.resolve(projectRoot) + path.sep;
  if (!resolvedPath.startsWith(resolvedRoot) && resolvedPath !== resolvedRoot.slice(0, -1)) {
    console.warn(`[Protocol] Path traversal blocked: ${pathname}`);
    return new Response('Forbidden', { status: 403 });
  }

  try {
    await fs.promises.access(resolvedPath, fs.constants.R_OK);
    const content = await fs.promises.readFile(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': mimeType }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`[Protocol] File not found: ${resolvedPath}`);
      return new Response('Not Found', { status: 404 });
    }
    console.error(`[Protocol] File serve error: ${error.message}`);
    return new Response('Internal Server Error', { status: 500 });
  }
}

module.exports = { registerScheme, registerProtocol };
