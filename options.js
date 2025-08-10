// options.js - 设置页面逻辑

// DOM元素
const elements = {
  scholarUrl: document.getElementById('scholarUrl'),
  scholarId: document.getElementById('scholarId'),
  enableNotifications: document.getElementById('enableNotifications'),
  autoUpdate: document.getElementById('autoUpdate'),
  saveBtn: document.getElementById('saveBtn'),
  testBtn: document.getElementById('testBtn'),
  clearCacheBtn: document.getElementById('clearCacheBtn'),
  message: document.getElementById('message')
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  bindEvents();
});

// 加载设置
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'scholarUrl',
      'scholarId',
      'enableNotifications',
      'autoUpdate'
    ]);
    
    // 填充表单
    if (settings.scholarUrl) {
      elements.scholarUrl.value = settings.scholarUrl;
    }
    if (settings.scholarId) {
      elements.scholarId.value = settings.scholarId;
    }
    
    elements.enableNotifications.checked = settings.enableNotifications !== false;
    elements.autoUpdate.checked = settings.autoUpdate !== false;
    
  } catch (error) {
    console.error('加载设置失败:', error);
    showMessage('加载设置失败', 'error');
  }
}

// 绑定事件
function bindEvents() {
  // 保存按钮
  elements.saveBtn.addEventListener('click', saveSettings);
  
  // 测试按钮
  elements.testBtn.addEventListener('click', testConnection);
  
  // 清理缓存按钮
  elements.clearCacheBtn.addEventListener('click', clearCache);
  
  // URL输入时自动提取ID
  elements.scholarUrl.addEventListener('input', extractScholarId);
}

// 保存设置
async function saveSettings() {
  try {
    // 获取表单值
    const scholarUrl = elements.scholarUrl.value.trim();
    const scholarId = elements.scholarId.value.trim();
    
    // 验证输入
    if (!scholarUrl && !scholarId) {
      showMessage('请输入 Google Scholar URL 或 User ID', 'error');
      return;
    }
    
    // 如果提供了URL但没有ID，尝试提取ID
    let finalScholarId = scholarId;
    if (scholarUrl && !scholarId) {
      finalScholarId = extractIdFromUrl(scholarUrl);
    }
    
    // 保存设置
    await chrome.storage.sync.set({
      scholarUrl: scholarUrl,
      scholarId: finalScholarId,
      enableNotifications: elements.enableNotifications.checked,
      autoUpdate: elements.autoUpdate.checked
    });
    
    // 清除缓存，强制下次更新
    await chrome.storage.local.remove(['citationData', 'lastUpdate']);
    
    showMessage('设置已保存！', 'success');
    
    // 通知后台脚本更新
    chrome.runtime.sendMessage({ action: 'settingsUpdated' });
    
  } catch (error) {
    console.error('保存设置失败:', error);
    showMessage('保存失败，请重试', 'error');
  }
}

// 测试连接
async function testConnection() {
  try {
    showMessage('正在测试连接...', 'info');
    
    const scholarUrl = elements.scholarUrl.value.trim();
    const scholarId = elements.scholarId.value.trim();
    
    if (!scholarUrl && !scholarId) {
      showMessage('请先输入 Scholar 信息', 'error');
      return;
    }
    
    // 构建目标URL
    const targetUrl = scholarUrl || `https://scholar.google.com/citations?user=${scholarId}&hl=en`;
    
    console.log('测试访问 Google Scholar...');
    
    // 创建超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // 解析HTML
      const html = await response.text();
      const result = parseHTMLForTest(html);
      if (result.citations > 0) {
        showMessage(`连接成功！引用数：${result.citations}，h-index：${result.hIndex}，i10-index：${result.i10Index}`, 'success');
      } else {
        showMessage('连接成功，但未能解析出引用数据，请检查Scholar URL是否正确', 'info');
      }
    } else {
      showMessage(`连接失败：HTTP ${response.status}`, 'error');
    }
    
  } catch (error) {
    console.error('测试连接失败:', error);
    if (error.name === 'AbortError') {
      showMessage('连接超时，请检查网络设置', 'error');
    } else {
      showMessage('无法访问 Google Scholar，请检查网络设置', 'error');
    }
  }
}

// 从URL提取Scholar ID
function extractScholarId() {
  const url = elements.scholarUrl.value;
  const id = extractIdFromUrl(url);
  
  if (id) {
    elements.scholarId.value = id;
  }
}

// 从URL提取ID的辅助函数
function extractIdFromUrl(url) {
  const match = url.match(/[?&]user=([^&]+)/);
  return match ? match[1] : '';
}

// 解析HTML获取引用数据（用于测试）
function parseHTMLForTest(html) {
  try {
    // 使用DOM解析器
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 查找统计表格
    const statCells = doc.querySelectorAll('td.gsc_rsb_std');
    
    if (statCells.length >= 3) {
      return {
        citations: parseInt(statCells[0]?.textContent?.replace(/\D/g, '') || '0'),
        hIndex: statCells.length > 2 ? parseInt(statCells[2]?.textContent?.replace(/\D/g, '') || '0') : 0,
        i10Index: statCells.length > 4 ? parseInt(statCells[4]?.textContent?.replace(/\D/g, '') || '0') : 0
      };
    }
    
    // 备用：正则表达式
    const citationMatch = html.match(/Citations[\s\S]*?<td[^>]*>[\s]*(\d+)/i);
    const hIndexMatch = html.match(/h-index[\s\S]*?<td[^>]*>[\s]*(\d+)/i);
    const i10Match = html.match(/i10-index[\s\S]*?<td[^>]*>[\s]*(\d+)/i);
    
    return {
      citations: parseInt(citationMatch?.[1] || '0'),
      hIndex: parseInt(hIndexMatch?.[1] || '0'),
      i10Index: parseInt(i10Match?.[1] || '0')
    };
  } catch (error) {
    console.error('解析失败:', error);
    return { citations: 0, hIndex: 0, i10Index: 0 };
  }
}

// 清理缓存
async function clearCache() {
  try {
    // 清除本地存储的引用数据
    await chrome.storage.local.remove(['citationData', 'lastUpdate', 'previousCitations']);
    
    // 显示成功消息
    showMessage('缓存已清理！下次打开扩展时将重新获取数据', 'success');
    
    console.log('缓存已清理');
  } catch (error) {
    console.error('清理缓存失败:', error);
    showMessage('清理缓存失败', 'error');
  }
}

// 显示消息
function showMessage(text, type) {
  elements.message.textContent = text;
  elements.message.className = `message ${type}`;
  elements.message.classList.remove('hidden');
  
  // 只有成功消息才自动隐藏，错误消息保持显示
  if (type === 'success') {
    setTimeout(() => {
      elements.message.classList.add('hidden');
    }, 5000);
  }
  // 错误和信息提示不自动隐藏，让用户有足够时间阅读
}