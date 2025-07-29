// options.js - 设置页面逻辑

// DOM元素
const elements = {
  scholarUrl: document.getElementById('scholarUrl'),
  scholarId: document.getElementById('scholarId'),
  useProxy: document.getElementById('useProxy'),
  proxyUrl: document.getElementById('proxyUrl'),
  proxyUrlGroup: document.getElementById('proxyUrlGroup'),
  enableNotifications: document.getElementById('enableNotifications'),
  autoUpdate: document.getElementById('autoUpdate'),
  saveBtn: document.getElementById('saveBtn'),
  testBtn: document.getElementById('testBtn'),
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
      'useProxy',
      'proxyUrl',
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
    
    elements.useProxy.checked = settings.useProxy || false;
    elements.proxyUrl.value = settings.proxyUrl || '';
    elements.enableNotifications.checked = settings.enableNotifications !== false;
    elements.autoUpdate.checked = settings.autoUpdate !== false;
    
    // 显示/隐藏代理URL输入框
    toggleProxyUrlInput();
    
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
  
  // 代理复选框
  elements.useProxy.addEventListener('change', toggleProxyUrlInput);
  
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
    
    // 验证代理设置
    const useProxy = elements.useProxy.checked;
    const proxyUrl = elements.proxyUrl.value.trim();
    
    if (useProxy && !proxyUrl) {
      showMessage('请输入代理服务器 URL', 'error');
      return;
    }
    
    // 保存设置
    await chrome.storage.sync.set({
      scholarUrl: scholarUrl,
      scholarId: finalScholarId,
      useProxy: useProxy,
      proxyUrl: proxyUrl,
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
    const useProxy = elements.useProxy.checked;
    const proxyUrl = elements.proxyUrl.value.trim();
    
    if (!scholarUrl && !scholarId) {
      showMessage('请先输入 Scholar 信息', 'error');
      return;
    }
    
    // 构建目标URL
    const targetUrl = scholarUrl || `https://scholar.google.com/citations?user=${scholarId}&hl=en`;
    
    let response;
    
    if (useProxy && proxyUrl) {
      // 使用自定义代理
      const testUrl = `${proxyUrl}?user=${scholarId || extractIdFromUrl(scholarUrl)}`;
      response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
    } else {
      // 首先尝试直接访问
      try {
        console.log('尝试直接访问...');
        response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (directError) {
        console.log('直接访问失败，尝试CORS代理...');
        // 如果直接访问失败，尝试CORS代理
        const corsProxy = 'https://cors-anywhere.herokuapp.com/';
        const testUrl = corsProxy + encodeURIComponent(targetUrl);
        response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html'
          }
        });
      }
    }
    
    if (response.ok) {
      if (useProxy && proxyUrl) {
        // 使用自定义代理返回的JSON
        const data = await response.json();
        showMessage(`连接成功！引用数：${data.citations || 0}`, 'success');
      } else {
        // 解析HTML
        const html = await response.text();
        const result = parseHTMLForTest(html);
        if (result.citations > 0) {
          showMessage(`连接成功！引用数：${result.citations}，h-index：${result.hIndex}，i10-index：${result.i10Index}`, 'success');
        } else {
          showMessage('连接成功，但未能解析出引用数据，请检查Scholar URL是否正确', 'info');
        }
      }
    } else {
      showMessage(`连接失败：HTTP ${response.status}`, 'error');
    }
    
  } catch (error) {
    console.error('测试连接失败:', error);
    showMessage(`连接失败：${error.message}`, 'error');
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

// 切换代理URL输入框显示
function toggleProxyUrlInput() {
  elements.proxyUrlGroup.style.display = elements.useProxy.checked ? 'block' : 'none';
}

// 显示消息
function showMessage(text, type) {
  elements.message.textContent = text;
  elements.message.className = `message ${type}`;
  elements.message.classList.remove('hidden');
  
  // 3秒后自动隐藏
  setTimeout(() => {
    elements.message.classList.add('hidden');
  }, 3000);
}