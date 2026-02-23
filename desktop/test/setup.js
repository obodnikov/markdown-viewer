// Patch Node's module resolver to intercept CJS require() calls
// for electron and electron-store, redirecting to our mock files.
// This runs before any test file is loaded.
import Module from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockMap = {
  electron: path.resolve(__dirname, '__mocks__/electron.js'),
  'electron-store': path.resolve(__dirname, '__mocks__/electron-store.js'),
};

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  if (request in mockMap) {
    return mockMap[request];
  }
  return origResolve.call(this, request, parent, ...args);
};
