// parser.js - 共享的Google Scholar HTML解析模块

// 解析Google Scholar HTML，提取引用数据
function parseScholarHTML(html) {
  try {
    console.log('开始解析HTML...');
    
    // 方法1：使用DOM解析器（更可靠）
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 查找统计表格中的所有数值单元格
    const statCells = doc.querySelectorAll('td.gsc_rsb_std');
    console.log(`找到 ${statCells.length} 个统计单元格`);
    
    let citations = 0, hIndex = 0, i10Index = 0;
    
    // Google Scholar表格通常有6个单元格（All和Since 20XX两列）
    if (statCells.length === 6) {
      // 索引0,1 = Citations (All, Since 20XX)
      // 索引2,3 = h-index (All, Since 20XX)
      // 索引4,5 = i10-index (All, Since 20XX)
      citations = parseInt(statCells[0]?.textContent?.replace(/\D/g, '') || '0');
      hIndex = parseInt(statCells[2]?.textContent?.replace(/\D/g, '') || '0');
      i10Index = parseInt(statCells[4]?.textContent?.replace(/\D/g, '') || '0');
      
      console.log(`DOM解析结果(6个单元格): 引用=${citations}, h-index=${hIndex}, i10=${i10Index}`);
    } else if (statCells.length === 3) {
      // 有些页面可能只有3个单元格（只有All列）
      citations = parseInt(statCells[0]?.textContent?.replace(/\D/g, '') || '0');
      hIndex = parseInt(statCells[1]?.textContent?.replace(/\D/g, '') || '0');
      i10Index = parseInt(statCells[2]?.textContent?.replace(/\D/g, '') || '0');
      
      console.log(`DOM解析结果(3个单元格): 引用=${citations}, h-index=${hIndex}, i10=${i10Index}`);
    }
    
    // 如果DOM解析失败或结果不合理，尝试方法2
    if (citations === 0 || citations <= 2) {
      console.log('DOM解析结果异常，尝试更精确的正则表达式...');
      
      // 方法2：使用更精确的正则表达式
      // 查找包含Citations的表格行，然后提取紧随其后的td标签中的数字
      const citationPattern = /<tr>\s*<td[^>]*>Citations<\/td>\s*<td[^>]*>(\d+)<\/td>/i;
      const hIndexPattern = /<tr>\s*<td[^>]*>h-index<\/td>\s*<td[^>]*>(\d+)<\/td>/i;
      const i10Pattern = /<tr>\s*<td[^>]*>i10-index<\/td>\s*<td[^>]*>(\d+)<\/td>/i;
      
      const citationMatch = html.match(citationPattern);
      const hIndexMatch = html.match(hIndexPattern);
      const i10Match = html.match(i10Pattern);
      
      if (citationMatch) {
        const regexCitations = parseInt(citationMatch[1]);
        const regexHIndex = parseInt(hIndexMatch?.[1] || '0');
        const regexI10 = parseInt(i10Match?.[1] || '0');
        
        console.log(`正则解析结果: 引用=${regexCitations}, h-index=${regexHIndex}, i10=${regexI10}`);
        
        // 如果正则结果更合理，使用正则结果
        if (regexCitations > citations && regexCitations > 2) {
          citations = regexCitations;
          hIndex = regexHIndex;
          i10Index = regexI10;
        }
      }
    }
    
    // 数据验证
    if (citations <= 2) {
      console.warn(`警告：解析出的引用数异常低 (${citations})，可能存在解析错误`);
      
      // 尝试方法3：查找包含数字的表格单元格，但要更严格
      const tableMatch = html.match(/<table[^>]*class="gsc_rsb_st"[\s\S]*?<\/table>/i);
      if (tableMatch) {
        console.log('找到统计表格，尝试更严格的解析...');
        const tableHtml = tableMatch[0];
        
        // 在表格内查找Citations行
        const citRowMatch = tableHtml.match(/<tr>[\s\S]*?Citations[\s\S]*?<td[^>]*class="gsc_rsb_std">(\d+)<\/td>/i);
        if (citRowMatch && parseInt(citRowMatch[1]) > 2) {
          citations = parseInt(citRowMatch[1]);
          console.log(`表格内解析得到引用数: ${citations}`);
        }
      }
    }
    
    // 最终数据验证
    const result = {
      citations: citations,
      hIndex: hIndex,
      i10Index: i10Index,
      timestamp: Date.now()
    };
    
    // 合理性检查
    if (citations <= 2 && hIndex > 0) {
      console.error('数据不一致：引用数过低但h-index不为0，可能存在解析错误');
    }
    
    console.log('最终解析结果:', result);
    return result;
    
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

// 验证解析结果是否合理
function validateParsedData(data, oldData = null) {
  // 检查数据是否存在
  if (!data || typeof data.citations !== 'number') {
    console.error('数据格式错误');
    return false;
  }
  
  // 检查引用数是否过低（可能是解析错误）
  if (data.citations <= 2 && data.citations > 0) {
    console.warn(`引用数异常低: ${data.citations}，可能是解析错误`);
    
    // 如果有旧数据，且旧数据明显更大，则认为新数据不可信
    if (oldData && oldData.citations > 10 && data.citations <= 2) {
      console.error('新数据明显异常，拒绝更新');
      return false;
    }
  }
  
  // 检查数据一致性
  if (data.citations === 0 && (data.hIndex > 0 || data.i10Index > 0)) {
    console.error('数据不一致：引用为0但其他指标不为0');
    return false;
  }
  
  // 检查数据合理性
  if (data.hIndex > data.citations) {
    console.error('数据不合理：h-index不能大于总引用数');
    return false;
  }
  
  return true;
}

// 导出函数（用于Chrome扩展）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseScholarHTML, validateParsedData };
}