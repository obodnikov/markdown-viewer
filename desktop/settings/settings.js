// desktop/settings/settings.js — Settings window logic

const FIELDS = [
  'openrouterApiKey', 'openrouterDefaultModel', 'openrouterModels', 'openrouterMaxTokens',
  'translationLanguages',
  'githubClientId', 'githubClientSecret',
  'bookstackUrl', 'bookstackApiTimeout',
  'pythonPath', 'flaskPort',
  'logLevel'
];

const NUMBER_FIELDS = ['openrouterMaxTokens', 'bookstackApiTimeout', 'flaskPort'];

const statusEl = document.getElementById('status');

function showStatus(message, type = 'success') {
  statusEl.textContent = message;
  statusEl.className = `status status--${type}`;
  if (type === 'success') {
    setTimeout(() => { statusEl.textContent = ''; }, 3000);
  }
}

async function loadSettings() {
  try {
    const settings = await window.electronAPI.getSettings();
    for (const field of FIELDS) {
      const el = document.getElementById(field);
      if (el && settings[field] !== undefined) {
        el.value = settings[field];
      }
    }
  } catch (error) {
    showStatus('Failed to load settings', 'error');
  }
}

async function saveSettings(event) {
  event.preventDefault();

  const settings = {};
  for (const field of FIELDS) {
    const el = document.getElementById(field);
    if (!el) continue;
    settings[field] = NUMBER_FIELDS.includes(field)
      ? parseInt(el.value, 10) || 0
      : el.value.trim();
  }

  // Validate
  const errors = [];
  if (settings.flaskPort < 0 || settings.flaskPort > 65535) {
    errors.push('API Port must be 0–65535');
  }
  if (settings.flaskPort > 0 && settings.flaskPort < 1024) {
    errors.push('API Port below 1024 requires elevated privileges');
  }
  if (settings.openrouterMaxTokens < 100 || settings.openrouterMaxTokens > 128000) {
    errors.push('Max Tokens must be 100–128000');
  }
  if (settings.bookstackApiTimeout < 5 || settings.bookstackApiTimeout > 120) {
    errors.push('BookStack timeout must be 5–120');
  }

  if (errors.length > 0) {
    showStatus(errors.join('. '), 'error');
    return;
  }

  try {
    const result = await window.electronAPI.setSettings(settings);
    if (result && result.success) {
      showStatus('Settings saved. Backend restarted.');
    } else if (result && result.error) {
      showStatus(`Saved, but backend restart failed: ${result.error}`, 'error');
    } else {
      showStatus('Settings saved.');
    }
  } catch (error) {
    showStatus('Failed to save settings', 'error');
  }
}

document.getElementById('settings-form').addEventListener('submit', saveSettings);

document.getElementById('btn-cancel').addEventListener('click', () => {
  window.close();
});

// Load settings on page ready
loadSettings();
