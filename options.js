// options.js — settings page controller.
import { fetchCitations, extractScholarId, ScholarError } from './lib/api.js';

const el = {};
const IDS = [
  'scholarUrl', 'scholarId', 'apiBase', 'enableNotifications',
  'autoUpdate', 'saveBtn', 'testBtn', 'clearCacheBtn', 'message',
];

document.addEventListener('DOMContentLoaded', async () => {
  for (const id of IDS) el[id] = document.getElementById(id);
  await load();
  el.saveBtn.addEventListener('click', save);
  el.testBtn.addEventListener('click', test);
  el.clearCacheBtn.addEventListener('click', clearCache);
  el.scholarUrl.addEventListener('input', () => {
    const id = extractScholarId(el.scholarUrl.value);
    if (id) el.scholarId.value = id;
  });
});

async function load() {
  const s = await chrome.storage.sync.get([
    'scholarUrl', 'scholarId', 'apiBase', 'enableNotifications', 'autoUpdate',
  ]);
  el.scholarUrl.value = s.scholarUrl || '';
  el.scholarId.value = s.scholarId || '';
  el.apiBase.value = s.apiBase || '';
  el.enableNotifications.checked = s.enableNotifications !== false;
  el.autoUpdate.checked = s.autoUpdate !== false;
}

function readForm() {
  const scholarUrl = el.scholarUrl.value.trim();
  const scholarId = el.scholarId.value.trim() || extractScholarId(scholarUrl);
  const apiBase = el.apiBase.value.trim().replace(/\/+$/, '');
  return { scholarUrl, scholarId, apiBase };
}

async function save() {
  const { scholarUrl, scholarId, apiBase } = readForm();
  if (!scholarId) {
    return message('Enter a Google Scholar URL or user id.', 'error');
  }
  if (!apiBase) {
    return message('Set a proxy endpoint (your Cloudflare Worker URL).', 'error');
  }

  await chrome.storage.sync.set({
    scholarUrl,
    scholarId,
    apiBase,
    enableNotifications: el.enableNotifications.checked,
    autoUpdate: el.autoUpdate.checked,
  });
  // Force a fresh fetch next time.
  await chrome.storage.local.remove(['citationData', 'lastUpdate']);
  chrome.runtime.sendMessage({ action: 'settingsUpdated' });
  message('Settings saved.', 'success');
}

async function test() {
  const { scholarId, apiBase } = readForm();
  if (!scholarId) return message('Enter a Scholar id first.', 'error');
  if (!apiBase) return message('Enter a proxy endpoint first.', 'error');

  message('Testing…', 'info');
  try {
    const d = await fetchCitations({ scholarId, apiBase, timeoutMs: 15000 });
    const who = d.name ? `${d.name} — ` : '';
    message(
      `✓ Connected. ${who}${d.citations.toLocaleString('en-US')} citations, ` +
      `h-index ${d.hIndex}, i10 ${d.i10Index}.`,
      'success',
    );
  } catch (err) {
    message(testError(err), 'error');
  }
}

async function clearCache() {
  await chrome.storage.local.remove([
    'citationData', 'lastUpdate', 'previousCitations',
  ]);
  message('Cache cleared. Data will refetch next time.', 'success');
}

function message(text, type) {
  el.message.textContent = text;
  el.message.className = `message ${type}`;
  if (type === 'success') {
    setTimeout(() => el.message.classList.add('hidden'), 5000);
  }
}

function testError(err) {
  if (err instanceof ScholarError) {
    switch (err.code) {
      case 'TIMEOUT':
        return 'Timed out reaching the proxy. Check the endpoint URL.';
      case 'NETWORK':
        return 'Cannot reach the proxy. Is the Worker deployed at that URL?';
      case 'BLOCKED':
        return 'Scholar rate-limited the proxy — try again shortly.';
      default:
        return `Failed: ${err.message}`;
    }
  }
  return 'Test failed. Check the endpoint and Scholar id.';
}
