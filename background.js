// background.js — service worker: scheduled refresh, badge, notifications.
import { getSettings, fetchCitations, badgeText } from './lib/api.js';

const ALARM = 'updateCitations';
const UPDATE_INTERVAL_MIN = 6 * 60; // 6h
const MAX_CACHE_AGE_MS = 60 * 60 * 1000; // 1h

chrome.runtime.onInstalled.addListener(async (details) => {
  await initialize('installed');
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(() => initialize('startup'));

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) update('alarm');
});

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (req.action === 'settingsUpdated') {
    initialize('settingsUpdated').then(() => sendResponse({ ok: true }));
    return true;
  }
  if (req.action === 'forceUpdate') {
    update('message').then((ok) => sendResponse({ ok }));
    return true;
  }
});

async function initialize(source) {
  await restoreBadge();
  const active = await setupAlarm();
  if (active) await maybeInitialUpdate(source);
}

async function setupAlarm() {
  const { scholarId, apiBase, autoUpdate } = await getSettings();
  await chrome.alarms.clear(ALARM);
  if (!autoUpdate || !scholarId || !apiBase) return false;
  chrome.alarms.create(ALARM, {
    periodInMinutes: UPDATE_INTERVAL_MIN,
    delayInMinutes: 1,
  });
  return true;
}

async function maybeInitialUpdate(source) {
  const { lastUpdate } = await chrome.storage.local.get('lastUpdate');
  if (!lastUpdate || Date.now() - lastUpdate > MAX_CACHE_AGE_MS) {
    await update(source);
  }
}

async function restoreBadge() {
  try {
    const { citationData } = await chrome.storage.local.get('citationData');
    if (citationData && typeof citationData.citations === 'number') {
      await setBadge(citationData.citations);
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (e) {
    /* ignore */
  }
}

async function update(source) {
  const settings = await getSettings();
  if (source === 'alarm' && !settings.autoUpdate) return false;
  if (!settings.scholarId || !settings.apiBase) return false;

  try {
    const { citationData: old } = await chrome.storage.local.get('citationData');
    const data = await fetchCitations({
      scholarId: settings.scholarId,
      apiBase: settings.apiBase,
    });

    await chrome.storage.local.set({
      citationData: data,
      lastUpdate: Date.now(),
      previousCitations: data.citations,
    });
    await setBadge(data.citations);

    if (settings.enableNotifications && old) notifyChanges(old, data);
    return true;
  } catch (err) {
    console.warn('background update failed:', err.code || err.message);
    return false;
  }
}

async function setBadge(citations) {
  const text = badgeText(citations);
  await chrome.action.setBadgeText({ text });
  if (text) await chrome.action.setBadgeBackgroundColor({ color: '#2f5de3' });
}

function notifyChanges(oldData, data) {
  const dCit = data.citations - oldData.citations;
  const dH = data.hIndex - oldData.hIndex;

  if (dCit > 0) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `+${dCit} citation${dCit > 1 ? 's' : ''}`,
      message: `You now have ${data.citations.toLocaleString('en-US')} total citations.`,
      priority: 1,
    });
  }
  if (dH > 0) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'h-index up!',
      message: `Your h-index rose from ${oldData.hIndex} to ${data.hIndex}.`,
      priority: 1,
    });
  }
}
