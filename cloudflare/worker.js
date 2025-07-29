// Cloudflare Worker - Google Scholar代理服务
// 部署步骤：
// 1. 登录 https://workers.cloudflare.com
// 2. 创建新的Worker
// 3. 粘贴此代码
// 4. 部署并获取Worker URL

export default {
  async fetch(request, env, ctx) {
    // 允许的来源（可选，增加安全性）
    const allowedOrigins = [
      'chrome-extension://*',
      'http://localhost:*',
      'https://localhost:*'
    ];
    
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    
    try {
      // 获取请求参数
      const url = new URL(request.url);
      const scholarId = url.searchParams.get('user');
      const profileUrl = url.searchParams.get('url');
      
      if (!scholarId && !profileUrl) {
        return new Response(JSON.stringify({
          error: '缺少参数：需要提供 user 或 url 参数'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 构建Google Scholar URL
      let targetUrl;
      if (profileUrl) {
        targetUrl = profileUrl;
      } else {
        targetUrl = `https://scholar.google.com/citations?user=${scholarId}&hl=en`;
      }
      
      // 请求Google Scholar
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Google Scholar returned ${response.status}`);
      }
      
      const html = await response.text();
      
      // 解析HTML提取数据
      const data = parseScholarData(html);
      
      // 返回JSON响应
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600', // 缓存1小时
        }
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({
        error: error.message,
        timestamp: Date.now()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

// 解析Google Scholar数据
function parseScholarData(html) {
  try {
    // 提取引用统计表格数据
    // 使用多个正则表达式模式以提高兼容性
    
    // 模式1：标准表格格式
    let citations = extractValue(html, /Citations<\/a><\/td><td[^>]*>(\d+)/);
    let hIndex = extractValue(html, /h-index<\/a><\/td><td[^>]*>(\d+)/);
    let i10Index = extractValue(html, /i10-index<\/a><\/td><td[^>]*>(\d+)/);
    
    // 模式2：备用格式（处理可能的HTML变化）
    if (!citations) {
      citations = extractValue(html, /Citations.*?<td[^>]*>(\d+)/s);
    }
    if (!hIndex) {
      hIndex = extractValue(html, /h-index.*?<td[^>]*>(\d+)/s);
    }
    if (!i10Index) {
      i10Index = extractValue(html, /i10-index.*?<td[^>]*>(\d+)/s);
    }
    
    // 提取作者信息
    const authorName = extractValue(html, /<div id="gsc_prf_in">([^<]+)</);
    const affiliation = extractValue(html, /<div class="gsc_prf_il">([^<]+)</);
    
    // 提取最近的引用数（用于趋势分析）
    const recentCitations = extractRecentCitations(html);
    
    return {
      citations: parseInt(citations) || 0,
      hIndex: parseInt(hIndex) || 0,
      i10Index: parseInt(i10Index) || 0,
      authorName: authorName || '',
      affiliation: affiliation || '',
      recentCitations: recentCitations,
      timestamp: Date.now(),
      source: 'Google Scholar'
    };
    
  } catch (error) {
    console.error('Parse error:', error);
    
    // 返回基本错误数据
    return {
      citations: 0,
      hIndex: 0,
      i10Index: 0,
      error: '解析数据失败',
      timestamp: Date.now()
    };
  }
}

// 提取值的辅助函数
function extractValue(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : null;
}

// 提取最近几年的引用数
function extractRecentCitations(html) {
  try {
    // 查找引用趋势图表数据
    const yearMatches = [...html.matchAll(/<span class="gsc_g_t[^"]*">(\d{4})<\/span>/g)];
    const citationMatches = [...html.matchAll(/<span class="gsc_g_al">(\d+)<\/span>/g)];
    
    const recentData = {};
    for (let i = 0; i < Math.min(yearMatches.length, citationMatches.length); i++) {
      const year = yearMatches[i][1];
      const citations = citationMatches[i][1];
      recentData[year] = parseInt(citations);
    }
    
    return recentData;
  } catch (error) {
    return {};
  }
}