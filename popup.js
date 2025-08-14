// popup.js - 弹窗主逻辑

// 配置
const CONFIG = {
  // 缓存时间（毫秒）
  cacheTime: 3600000, // 1小时
  // Google Scholar基础URL
  scholarBaseUrl: 'https://scholar.google.com/citations'
};

// DOM元素 - 将在DOMContentLoaded后初始化
let elements = {};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 获取DOM元素
  elements = {
    totalCitations: document.getElementById('totalCitations'),
    hIndex: document.getElementById('hIndex'),
    i10Index: document.getElementById('i10Index'),
    lastUpdate: document.getElementById('lastUpdate'),
    refreshBtn: document.getElementById('refreshBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    setupBtn: document.getElementById('setupBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    errorMsg: document.getElementById('errorMsg'),
    setupPrompt: document.getElementById('setupPrompt'),
    citationChange: document.getElementById('citationChange')
  };
  
  // 调整窗口高度
  adjustWindowHeight();
  
  await loadData();
  
  // 绑定事件
  elements.refreshBtn.addEventListener('click', () => fetchCitations(true, false)); // 强制刷新，非静默
  elements.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  elements.setupBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());
  
  // 数据加载后再次调整高度
  setTimeout(adjustWindowHeight, 100);
});

// 动态调整窗口高度
function adjustWindowHeight() {
  // Chrome扩展popup有固定高度限制，设置为合理的固定值
  // 不需要动态调整，已在HTML中设置
}

// 加载数据
async function loadData() {
  try {
    // 获取用户设置
    const settings = await chrome.storage.sync.get(['scholarId', 'scholarUrl']);
    
    if (!settings.scholarId && !settings.scholarUrl) {
      // 显示设置提示
      showSetupPrompt();
      return;
    }
    
    // 获取缓存数据
    const cached = await chrome.storage.local.get(['citationData', 'lastUpdate']);
    
    if (cached.citationData && cached.citationData.citations) {
      // 优先显示缓存数据
      console.log('使用缓存数据:', cached.citationData);
      await displayData(cached.citationData);
      updateLastUpdateTime(cached.lastUpdate);
      
      // 只有在需要更新时才后台更新（不影响界面）
      if (shouldUpdate(cached.lastUpdate)) {
        console.log('缓存已过期，后台更新数据...');
        // 后台静默更新，不显示loading
        fetchCitations(false, true); // 不强制，静默更新
      }
    } else {
      // 没有缓存数据，必须获取
      console.log('没有缓存数据，首次获取...');
      fetchCitations();
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    
    // 即使出错，也尝试显示缓存数据
    const cached = await chrome.storage.local.get(['citationData']);
    if (cached.citationData) {
      await displayData(cached.citationData);
    } else {
      showError('加载数据失败');
    }
  }
}

// 获取引用数据
async function fetchCitations(force = false, silent = false) {
  try {
    // 如果不是静默更新，显示loading
    if (!silent) {
      showLoading(true);
      hideError();
    }
    
    // 获取用户设置
    const settings = await chrome.storage.sync.get(['scholarId', 'scholarUrl']);
    
    if (!settings.scholarId && !settings.scholarUrl) {
      showSetupPrompt();
      showLoading(false);  // 停止loading
      return;
    }
    
    // 构建URL
    let scholarUrl;
    if (settings.scholarUrl) {
      scholarUrl = settings.scholarUrl;
    } else {
      scholarUrl = `${CONFIG.scholarBaseUrl}?user=${settings.scholarId}&hl=en`;
    }
    
    // 直接访问Google Scholar
    console.log('正在访问 Google Scholar...');
    const data = await fetchDirectly(scholarUrl);
    
    if (data) {
      // 保存数据
      await saveData(data);
      await displayData(data);
      hideError(); // 成功时隐藏错误
      
      // 成功后也要停止loading
      if (!silent) {
        showLoading(false);
        // 如果是手动刷新，显示成功提示
        if (force) {
          showSuccess('数据更新成功！');
        }
      }
    } else {
      throw new Error('无法获取数据');
    }
    
  } catch (error) {
    console.error('获取引用数据失败:', error);
    if (!silent) {
      // 停止loading动画
      showLoading(false);
      
      // 提供错误信息
      if (error.name === 'AbortError') {
        showError('连接超时，请检查网络设置');
      } else {
        showError('无法访问 Google Scholar，请检查网络设置');
      }
      
      // 隐藏loading界面，显示错误
      elements.loadingOverlay.classList.add('hidden');
    }
  }
}

// 直接访问Google Scholar（适用于已有代理的用户）
async function fetchDirectly(scholarUrl) {
  try {
    console.log('尝试直接访问 Google Scholar...');
    
    // 创建超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    const response = await fetch(scholarUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const html = await response.text();
      const data = parseScholarHTML(html);
      
      if (data && data.citations) {
        console.log('直接访问成功！获取到数据:', data);
        return data;
      }
    } else {
      console.log(`直接访问失败: HTTP ${response.status}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('访问超时（5秒）');
    } else {
      console.log('访问出错:', error.message);
    }
  }
  
  return null;
}


// 解析Google Scholar HTML
function parseScholarHTML(html) {
  try {
    console.log('开始解析HTML...');
    
    // 方法1：使用DOM解析器
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 查找统计表格中的所有数值单元格
    const statCells = doc.querySelectorAll('td.gsc_rsb_std');
    console.log(`找到 ${statCells.length} 个统计单元格`);
    
    if (statCells.length >= 3) {
      // 通常第1个是总引用，第3个是h-index，第5个是i10-index
      // 或者第0个是总引用，第2个是h-index，第4个是i10-index
      const citations = parseInt(statCells[0]?.textContent?.replace(/\D/g, '') || '0');
      const hIndex = statCells.length > 2 ? parseInt(statCells[2]?.textContent?.replace(/\D/g, '') || '0') : 0;
      const i10Index = statCells.length > 4 ? parseInt(statCells[4]?.textContent?.replace(/\D/g, '') || '0') : 0;
      
      console.log(`DOM解析结果: 引用=${citations}, h-index=${hIndex}, i10=${i10Index}`);
      
      if (citations > 0) {
        return {
          citations: citations,
          hIndex: hIndex,
          i10Index: i10Index,
          timestamp: Date.now()
        };
      }
    }
    
    // 方法2：使用更宽松的正则表达式
    console.log('尝试正则表达式解析...');
    
    // 查找 "Citations" 后面的数字
    let citationMatch = html.match(/Citations[\s\S]*?<td[^>]*>[\s]*(\d+)/i);
    if (!citationMatch) {
      citationMatch = html.match(/被引用次数[\s\S]*?<td[^>]*>[\s]*(\d+)/i);
    }
    
    // 查找 "h-index" 后面的数字
    let hIndexMatch = html.match(/h-index[\s\S]*?<td[^>]*>[\s]*(\d+)/i);
    
    // 查找 "i10-index" 后面的数字  
    let i10Match = html.match(/i10-index[\s\S]*?<td[^>]*>[\s]*(\d+)/i);
    
    const citations = parseInt(citationMatch?.[1] || '0');
    const hIndex = parseInt(hIndexMatch?.[1] || '0');
    const i10Index = parseInt(i10Match?.[1] || '0');
    
    console.log(`正则解析结果: 引用=${citations}, h-index=${hIndex}, i10=${i10Index}`);
    
    return {
      citations: citations,
      hIndex: hIndex,
      i10Index: i10Index,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('解析HTML失败:', error);
    return {
      citations: 0,
      hIndex: 0,
      i10Index: 0,
      timestamp: Date.now()
    };
  }
}

// 显示数据
async function displayData(data) {
  if (!data) return;
  
  // 确保主界面显示
  const setupPrompt = document.getElementById('setupPrompt');
  const mainCard = document.querySelector('.citation-card.main-card');
  const metricsRow = document.querySelector('.metrics-row');
  const updateInfo = document.querySelector('.update-info');
  
  if (setupPrompt) setupPrompt.classList.add('hidden');
  if (mainCard) mainCard.style.display = '';
  if (metricsRow) metricsRow.style.display = '';
  if (updateInfo) updateInfo.style.display = '';
  
  // 添加动画效果
  animateNumber(elements.totalCitations, data.citations);
  animateNumber(elements.hIndex, data.hIndex);
  animateNumber(elements.i10Index, data.i10Index);
  
  // 显示变化
  showChange(data.citations);
  
  // 更新badge
  await updateBadge(data.citations);
  
  // 调整窗口高度
  setTimeout(adjustWindowHeight, 50);
}

// 数字动画
function animateNumber(element, target) {
  const current = parseInt(element.textContent) || 0;
  const increment = (target - current) / 20;
  let count = current;
  
  const timer = setInterval(() => {
    count += increment;
    if ((increment > 0 && count >= target) || (increment < 0 && count <= target)) {
      element.textContent = target.toLocaleString();
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(count).toLocaleString();
    }
  }, 30);
}

// 显示变化
async function showChange(newCitations) {
  const oldData = await chrome.storage.local.get(['previousCitations']);
  
  if (oldData.previousCitations && oldData.previousCitations !== newCitations) {
    const change = newCitations - oldData.previousCitations;
    
    if (change > 0) {
      elements.citationChange.textContent = `+${change} 今日新增`;
      elements.citationChange.classList.add('positive');
    }
  }
  
  // 保存当前值
  await chrome.storage.local.set({ previousCitations: newCitations });
}

// 保存数据
async function saveData(data) {
  await chrome.storage.local.set({
    citationData: data,
    lastUpdate: Date.now()
  });
}

// 更新最后更新时间
function updateLastUpdateTime(timestamp) {
  if (!timestamp) {
    elements.lastUpdate.textContent = '从未更新';
    return;
  }
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) {
    elements.lastUpdate.textContent = '刚刚更新';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    elements.lastUpdate.textContent = `${minutes}分钟前更新`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    elements.lastUpdate.textContent = `${hours}小时前更新`;
  } else {
    elements.lastUpdate.textContent = date.toLocaleDateString();
  }
}

// 检查是否需要更新
function shouldUpdate(lastUpdate) {
  if (!lastUpdate) return true;
  return Date.now() - lastUpdate > CONFIG.cacheTime;
}

// 更新badge
async function updateBadge(citations) {
  if (citations === undefined || citations === null) return;
  
  try {
    // 格式化数字
    let badgeText = citations.toString();
    if (citations > 9999) {
      badgeText = Math.floor(citations / 1000) + 'k';
    } else if (citations > 999999) {
      badgeText = Math.floor(citations / 1000000) + 'M';
    }
    
    // 设置badge文字
    await chrome.action.setBadgeText({ text: badgeText });
    // 设置badge背景色（绿色）
    await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    
    console.log(`Badge已更新: ${badgeText}`);
  } catch (error) {
    console.error('更新badge失败:', error);
  }
}

// UI辅助函数
function showLoading(show) {
  elements.loadingOverlay.classList.toggle('hidden', !show);
  
  if (show) {
    elements.refreshBtn.classList.add('spinning');
  } else {
    elements.refreshBtn.classList.remove('spinning');
  }
}

function showError(message) {
  // 支持多行错误信息
  if (message.includes('\n')) {
    elements.errorMsg.innerHTML = message.split('\n').join('<br>');
  } else {
    elements.errorMsg.textContent = message;
  }
  elements.errorMsg.classList.remove('hidden');
  elements.errorMsg.classList.remove('success');
  elements.errorMsg.classList.add('error');
  
  // 确保loading停止
  showLoading(false);
}

function showSuccess(message) {
  elements.errorMsg.textContent = message;
  elements.errorMsg.classList.remove('hidden');
  elements.errorMsg.classList.remove('error');
  elements.errorMsg.classList.add('success');
  
  // 3秒后自动隐藏成功消息
  setTimeout(() => {
    if (elements.errorMsg.classList.contains('success')) {
      elements.errorMsg.classList.add('hidden');
    }
  }, 3000);
}

function hideError() {
  elements.errorMsg.classList.add('hidden');
}

function showSetupPrompt() {
  // 显示设置提示
  elements.setupPrompt.classList.remove('hidden');
  // 隐藏其他元素 - 使用更安全的方式
  const mainCard = document.querySelector('.citation-card.main-card');
  const metricsRow = document.querySelector('.metrics-row');
  const updateInfo = document.querySelector('.update-info');
  
  if (mainCard) mainCard.style.display = 'none';
  if (metricsRow) metricsRow.style.display = 'none';
  if (updateInfo) updateInfo.style.display = 'none';
}