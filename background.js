// background.js - Service Worker后台脚本

// 配置
const CONFIG = {
  // 自动更新间隔（毫秒）
  updateIntervalMs: 6 * 60 * 60 * 1000, // 6小时
  // 自动更新允许的缓存最大时间
  maxCacheAgeMs: 60 * 60 * 1000, // 1小时
  // 首次执行延迟（分钟，Chrome最小值为1）
  initialDelayMinutes: 1,
  // 报警名称
  alarmName: 'updateCitations'
};

const UPDATE_INTERVAL_MINUTES = Math.max(CONFIG.updateIntervalMs / 60000, 1);

// 扩展安装或更新时
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('扩展已安装/更新:', details.reason);

  await initializeBackground('installed');

  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

// 扩展启动时
chrome.runtime.onStartup.addListener(async () => {
  console.log('扩展已启动');
  await initializeBackground('startup');
});

// 设置定时器
async function setupAlarm() {
  const settings = await chrome.storage.sync.get(['autoUpdate', 'scholarId', 'scholarUrl']);

  await chrome.alarms.clear(CONFIG.alarmName);

  if (settings.autoUpdate === false) {
    console.log('自动更新已关闭，跳过定时任务');
    return false;
  }

  if (!settings.scholarId && !settings.scholarUrl) {
    console.log('未配置Scholar信息，暂不启动自动更新');
    return false;
  }

  chrome.alarms.create(CONFIG.alarmName, {
    periodInMinutes: UPDATE_INTERVAL_MINUTES,
    delayInMinutes: CONFIG.initialDelayMinutes
  });

  console.log(`定时更新已设置：每${UPDATE_INTERVAL_MINUTES}分钟执行，首次延迟${CONFIG.initialDelayMinutes}分钟`);
  return true;
}

// 监听定时器
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CONFIG.alarmName) {
    console.log('执行定时更新...');
    await updateCitations({ source: 'alarm' });
  }
});

async function initializeBackground(source) {
  await restoreBadgeFromCache();

  const alarmActive = await setupAlarm();

  if (alarmActive) {
    await maybeRunInitialUpdate(source);
  }
}

async function maybeRunInitialUpdate(source) {
  try {
    const { lastUpdate } = await chrome.storage.local.get(['lastUpdate']);

    if (!lastUpdate || Date.now() - lastUpdate > CONFIG.maxCacheAgeMs) {
      console.log('缓存已过期或不存在，执行初始更新');
      await updateCitations({ source });
    } else {
      console.log('缓存仍然有效，跳过初始更新');
    }
  } catch (error) {
    console.error('初始更新检查失败:', error);
  }
}

async function restoreBadgeFromCache() {
  try {
    const { citationData } = await chrome.storage.local.get(['citationData']);

    if (citationData && typeof citationData.citations === 'number') {
      await updateBadge(citationData.citations);
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('恢复Badge失败:', error);
  }
}

// 更新引用数据
async function updateCitations({ source = 'manual' } = {}) {
  try {
    // 获取设置
    const settings = await chrome.storage.sync.get(['scholarId', 'scholarUrl', 'enableNotifications', 'autoUpdate']);

    if (source === 'alarm' && settings.autoUpdate === false) {
      console.log('自动更新已关闭，跳过本次定时更新');
      return;
    }
    
    if (!settings.scholarId && !settings.scholarUrl) {
      console.log('未设置Scholar ID，跳过更新');
      return;
    }
    
    // 获取旧数据
    const oldData = await chrome.storage.local.get(['citationData']);
    
    // 获取新数据
    const newData = await fetchCitationData(settings);
    
    if (newData) {
      // 保存新数据
      await chrome.storage.local.set({
        citationData: newData,
        lastUpdate: Date.now()
      });
      
      // 更新badge
      await updateBadge(newData.citations);

      // 检查是否有变化并发送通知
      if (settings.enableNotifications && oldData.citationData) {
        checkAndNotify(oldData.citationData, newData);
      }
      
      console.log('引用数据已更新:', newData);
    }
  } catch (error) {
    console.error('更新引用数据失败:', error);
  }
}

// 获取引用数据（简化版）
async function fetchCitationData(settings) {
  try {
    // 构建URL
    let scholarUrl;
    if (settings.scholarUrl) {
      scholarUrl = settings.scholarUrl;
    } else {
      scholarUrl = `https://scholar.google.com/citations?user=${settings.scholarId}&hl=en`;
    }
    
    // 首先尝试直接访问
    try {
      console.log('后台尝试直接访问 Google Scholar...');
      const response = await fetch(scholarUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // 使用正则表达式提取数据
        const citationMatch = html.match(/Citations.*?(\d+)/s);
        const hIndexMatch = html.match(/h-index.*?(\d+)/s);
        const i10Match = html.match(/i10-index.*?(\d+)/s);
        
        if (citationMatch) {
          console.log('直接访问成功！');
          return {
            citations: parseInt(citationMatch[1]),
            hIndex: parseInt(hIndexMatch?.[1] || '0'),
            i10Index: parseInt(i10Match?.[1] || '0'),
            timestamp: Date.now()
          };
        }
      }
    } catch (directError) {
      console.log('直接访问失败，尝试使用代理...');
    }
    
    // 如果直接访问失败，使用CORS代理
    const proxies = [
      'https://cors-anywhere.herokuapp.com/',
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?'
    ];
    
    for (const proxy of proxies) {
      try {
        const response = await fetch(proxy + encodeURIComponent(scholarUrl));
        
        if (response.ok) {
          const html = await response.text();
          
          // 使用正则表达式提取数据（更简单可靠）
          const citationMatch = html.match(/Citations.*?(\d+)/s);
          const hIndexMatch = html.match(/h-index.*?(\d+)/s);
          const i10Match = html.match(/i10-index.*?(\d+)/s);
          
          if (citationMatch) {
            return {
              citations: parseInt(citationMatch[1]),
              hIndex: parseInt(hIndexMatch?.[1] || '0'),
              i10Index: parseInt(i10Match?.[1] || '0'),
              timestamp: Date.now()
            };
          }
        }
      } catch (error) {
        console.error(`代理失败 ${proxy}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error('获取数据失败:', error);
  }
  
  return null;
}

// 更新扩展图标badge
async function updateBadge(citations) {
  if (citations === undefined || citations === null || citations === 0) return;
  
  try {
    // 格式化数字
    let badgeText = citations.toString();
    if (citations > 9999) {
      badgeText = Math.floor(citations / 1000) + 'k';
    } else if (citations > 999999) {
      badgeText = Math.floor(citations / 1000000) + 'M';
    }
    
    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    
    console.log(`后台更新Badge: ${badgeText}`);
  } catch (error) {
    console.error('后台更新badge失败:', error);
  }
}

// 检查变化并通知
function checkAndNotify(oldData, newData) {
  const citationChange = newData.citations - oldData.citations;
  const hIndexChange = newData.hIndex - oldData.hIndex;
  
  if (citationChange > 0) {
    // 创建通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '引用数增加！',
      message: `您的引用数增加了 ${citationChange} 次，当前总引用数：${newData.citations}`,
      priority: 2
    });
  }
  
  if (hIndexChange > 0) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'h-index 提升！',
      message: `您的 h-index 从 ${oldData.hIndex} 提升到 ${newData.hIndex}`,
      priority: 2
    });
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'forceUpdate') {
    updateCitations({ source: 'popup' }).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开放
  }

  if (request.action === 'settingsUpdated') {
    initializeBackground('settingsUpdated').then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});
