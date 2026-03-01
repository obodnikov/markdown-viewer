// Mock for electron-store — each new Store() gets fresh in-memory data
'use strict';

class Store {
  constructor(opts = {}) {
    this._data = {};
    this._schema = opts.schema || {};
    for (const [key, def] of Object.entries(this._schema)) {
      if ('default' in def) {
        this._data[key] = def.default;
      }
    }
  }

  get(key, defaultValue) {
    if (key in this._data) return this._data[key];
    return defaultValue;
  }

  set(key, value) {
    this._data[key] = value;
  }

  get store() {
    return { ...this._data };
  }

  clear() {
    this._data = {};
  }
}

module.exports = Store;
