// popup.js — main popup controller.
import {
  getSettings,
  fetchCitations,
  badgeText,
  ScholarError,
} from './lib/api.js';

const CACHE_TTL = 60 * 60 * 1000; // treat cache older than 1h as stale

const el = {};
const IDS = [
  'app', 'profileName', 'totalCitations', 'citationDelta', 'hIndex',
  'i10Index', 'sinceRow', 'sinceLabel', 'citationsSince', 'hIndexSince',
  'i10IndexSince', 'lastUpdate', 'refreshBtn', 'settingsBtn', 'loadingOverlay',
  'statusMsg', 'setupPrompt', 'setupTitle', 'setupBody', 'setupBtn', 'stats',
  'footer',
];

document.addEventListener('DOMContentLoaded', async () => {
  for (const id of IDS) el[id] = document.getElementById(id);
  el.footer = document.querySelector('.footer');

  el.refreshBtn.addEventListener('click', () => refresh(true, false));
  el.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  el.setupBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  await init();
});

async function init() {
  const settings = await getSettings();

  if (!settings.scholarId || !settings.apiBase) {
    showSetup(settings);
    return;
  }

  // Show cached data instantly, then refresh in the background if stale.
  const cache = await chrome.storage.local.get(['citationData', 'lastUpdate']);
  if (cache.citationData) {
    render(cache.citationData, { animate: false });
    setLastUpdate(cache.lastUpdate);
    if (isStale(cache.lastUpdate)) refresh(false, true);
  } else {
    refresh(false, false);
  }
}

async function refresh(force, silent) {
  const settings = await getSettings();
  if (!settings.scholarId || !settings.apiBase) {
    showSetup(settings);
    return;
  }

  if (!silent) {
    setLoading(true);
    hideStatus();
  }

  try {
    const data = await fetchCitations({
      scholarId: settings.scholarId,
      apiBase: settings.apiBase,
    });

    // Compute delta against the last successfully fetched total (not cache).
    const prev = (await chrome.storage.local.get('previousCitations'))
      .previousCitations;
    const delta = typeof prev === 'number' ? data.citations - prev : 0;

    await chrome.storage.local.set({
      citationData: data,
      lastUpdate: Date.now(),
      previousCitations: data.citations,
    });

    render(data, { animate: true, delta });
    setLastUpdate(Date.now());
    await setBadge(data.citations);

    if (!silent) {
      setLoading(false);
      if (force) showStatus('Updated', 'success');
    }
  } catch (err) {
    if (!silent) {
      setLoading(false);
      showStatus(errorMessage(err), 'error');
    }
    console.warn('refresh failed:', err);
  }
}

function render(data, { animate = true, delta = 0 } = {}) {
  el.setupPrompt.classList.add('hidden');
  el.stats.style.display = '';
  el.footer.style.display = '';

  el.profileName.textContent = data.name || '';

  animateNumber(el.totalCitations, data.citations, animate);
  animateNumber(el.hIndex, data.hIndex, animate);
  animateNumber(el.i10Index, data.i10Index, animate);

  // Since-YYYY secondary row.
  if (data.sinceYear) {
    el.sinceLabel.textContent = `Since ${data.sinceYear}`;
    el.citationsSince.textContent = fmt(data.citationsSince);
    el.hIndexSince.textContent = fmt(data.hIndexSince);
    el.i10IndexSince.textContent = fmt(data.i10IndexSince);
    el.sinceRow.hidden = false;
  } else {
    el.sinceRow.hidden = true;
  }

  el.citationDelta.textContent = delta > 0 ? `↑ +${delta} since last check` : '';
}

/* ---------- UI helpers ---------- */

function animateNumber(node, target, animate) {
  target = Number(target) || 0;
  if (!animate) {
    node.textContent = fmt(target);
    return;
  }
  const start = parseInt(String(node.textContent).replace(/\D/g, ''), 10) || 0;
  if (start === target) {
    node.textContent = fmt(target);
    return;
  }
  const steps = 18;
  const inc = (target - start) / steps;
  let cur = start;
  let i = 0;
  const timer = setInterval(() => {
    i += 1;
    cur += inc;
    if (i >= steps) {
      node.textContent = fmt(target);
      clearInterval(timer);
    } else {
      node.textContent = fmt(Math.round(cur));
    }
  }, 22);
}

function fmt(n) {
  return (Number(n) || 0).toLocaleString('en-US');
}

function isStale(ts) {
  return !ts || Date.now() - ts > CACHE_TTL;
}

function setLoading(on) {
  el.loadingOverlay.classList.toggle('hidden', !on);
  el.refreshBtn.classList.toggle('spinning', on);
}

function showStatus(text, type) {
  el.statusMsg.textContent = text;
  el.statusMsg.className = `toast ${type}`;
  if (type === 'success') {
    setTimeout(() => el.statusMsg.classList.add('hidden'), 2500);
  }
}
function hideStatus() {
  el.statusMsg.classList.add('hidden');
}

function setLastUpdate(ts) {
  if (!ts) {
    el.lastUpdate.textContent = 'Never updated';
    return;
  }
  const diff = Date.now() - ts;
  let label;
  if (diff < 60_000) label = 'Just now';
  else if (diff < 3_600_000) label = `${Math.floor(diff / 60_000)} min ago`;
  else if (diff < 86_400_000) label = `${Math.floor(diff / 3_600_000)} h ago`;
  else label = new Date(ts).toLocaleDateString();
  el.lastUpdate.textContent = `Updated ${label}`;
}

async function setBadge(citations) {
  try {
    await chrome.action.setBadgeText({ text: badgeText(citations) });
    await chrome.action.setBadgeBackgroundColor({ color: '#2f5de3' });
  } catch (e) {
    /* ignore */
  }
}

function showSetup(settings) {
  el.stats.style.display = 'none';
  if (el.footer) el.footer.style.display = 'none';
  el.setupPrompt.classList.remove('hidden');

  if (!settings.apiBase && !settings.scholarId) {
    el.setupTitle.textContent = "Let's get set up";
    el.setupBody.textContent =
      'Add your Google Scholar profile and a proxy endpoint to start tracking.';
  } else if (!settings.apiBase) {
    el.setupTitle.textContent = 'Proxy endpoint needed';
    el.setupBody.textContent =
      'Set your Cloudflare Worker URL in settings so citations can be fetched (works in China).';
  } else {
    el.setupTitle.textContent = 'Add your Scholar profile';
    el.setupBody.textContent =
      'Paste your Google Scholar profile URL or user id in settings.';
  }
}

function errorMessage(err) {
  if (err instanceof ScholarError) {
    switch (err.code) {
      case 'NO_ENDPOINT':
        return 'No proxy endpoint set. Open settings to add your Worker URL.';
      case 'NO_ID':
        return 'No Scholar id set. Add it in settings.';
      case 'TIMEOUT':
        return 'Request timed out. Check your proxy endpoint.';
      case 'NETWORK':
        return 'Cannot reach the proxy. Check the endpoint URL and your network.';
      case 'BLOCKED':
        return 'Google Scholar rate-limited the proxy. Try again shortly.';
      default:
        return err.message || 'Could not fetch citations.';
    }
  }
  return 'Could not fetch citations.';
}
