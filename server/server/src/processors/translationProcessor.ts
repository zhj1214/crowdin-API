import { EnhancedTranslation } from "../types";
import logger from "../utils/logger";
import { parse as csvParse } from "csv-parse/sync";
import fs from 'fs';
import path from 'path';
import config from '../config/config';

/**
 * 处理翻译数据，添加额外信息和格式化
 */
export function processTranslationData(
  originalData: any,
  languageCode: string,
  projectId: number,
  fileId?: number
): EnhancedTranslation {
  logger.debug(`处理语言 ${languageCode} 的翻译数据`, { fileId });

  try {
    // 检查originalData的类型并适当处理
    let parsedData: any;

    if (Buffer.isBuffer(originalData)) {
      logger.debug("原始数据是Buffer类型，进行转换处理");

      try {
        // 先将Buffer转换为字符串
        const stringData = originalData.toString("utf-8");
        
        // 1. 首先尝试解析为JSON
        try {
          parsedData = JSON.parse(stringData);
          logger.debug("数据已成功解析为JSON");
          // 解析成功，继续后面的处理
        } catch (jsonError) {
          // 2. JSON解析失败，尝试解析为CSV
          logger.debug("不是有效的JSON，尝试解析为CSV");
          
          try {
            parsedData = csvParse(stringData, {
              columns: true,
              skip_empty_lines: true,
            });
            logger.debug("数据已成功解析为CSV", { rowCount: parsedData.length });
            // CSV解析成功，继续后面的处理
          } catch (csvError) {
            // 3. CSV解析也失败，尝试识别其他格式
            logger.debug("无法解析为CSV，尝试分析内容格式");
            
            // 判断是否为TypeScript文件
            const tsPatterns = [
              /export\s+(const|let|var|function|class|interface|type|enum)/i,
              /export\s+default/i,
              /import\s+.*\s+from\s+['"].*['"]/i,
              /interface\s+\w+(\s*\{|\s+extends)/i,
              /type\s+\w+\s*=/i,
              /namespace\s+\w+/i
            ];
            
            // 先检查是否以export default开头，这是国际化资源文件的常见模式
            const isI18nTsFile = /^\s*export\s+default\s*\{/.test(stringData.trim());
            
            // 如果是国际化资源文件或匹配其他TS模式
            const isTypeScript = isI18nTsFile || tsPatterns.some(pattern => pattern.test(stringData));
            
            if (isTypeScript) {
              logger.debug(`检测到TypeScript文件格式 ${isI18nTsFile ? '(国际化资源文件)' : ''}`);
              
              // 尝试从TypeScript中提取国际化内容
              let extractedJson = null;
              
              if (isI18nTsFile) {
                // 针对国际化文件优化处理
                try {
                  // 移除注释和不规则格式
                  let cleanedContent = stringData
                    .replace(/\/\/.*$/gm, '')           // 移除单行注释
                    .replace(/\/\*[\s\S]*?\*\//g, '')   // 移除多行注释
                    .replace(/^\s*export\s+default\s*/, '') // 移除export default前缀
                    .trim();
                  
                  // 确保最后一个括号前没有逗号，这在JS中是允许的但JSON解析会失败
                  cleanedContent = cleanedContent.replace(/,\s*\}/g, '}');
                  
                  // 如果最后有分号结尾，去掉它
                  if (cleanedContent.endsWith(';')) {
                    cleanedContent = cleanedContent.slice(0, -1);
                  }
                  
                  // 尝试执行代码块获取对象
                  try {
                    extractedJson = new Function(`return ${cleanedContent}`)();
                    logger.debug("成功提取国际化资源对象");
                  } catch (evalError: any) {
                    logger.debug("无法执行提取的国际化对象", { error: evalError.message, content: cleanedContent.substring(0, 100) + '...' });
                  }
                } catch (cleanError: any) {
                  logger.debug("清理国际化内容时出错", { error: cleanError.message });
                }
              }
              
              // 如果是国际化文件还未成功提取，或是其他TS文件类型
              if (!extractedJson) {
                // 尝试匹配 export default {...} 模式
                const exportDefaultMatch = stringData.match(/export\s+default\s+(\{[\s\S]*\})/m);
                if (exportDefaultMatch && exportDefaultMatch[1]) {
                  const jsonContent = exportDefaultMatch[1]
                    .replace(/\/\/.*$/gm, '')           // 移除单行注释
                    .replace(/\/\*[\s\S]*?\*\//g, '')   // 移除多行注释
                    .replace(/,(\s*\})/g, '$1');        // 移除尾随逗号
                  
                  try {
                    extractedJson = new Function(`return ${jsonContent}`)();
                    logger.debug("成功从TypeScript提取JSON对象");
                  } catch (evalError: any) {
                    logger.debug("无法执行提取的TypeScript对象", { error: evalError.message });
                  }
                }
              }
              
              // 如果仍未提取到内容，尝试匹配 export const/let/var 模式
              if (!extractedJson) {
                const exportMatch = stringData.match(/export\s+(?:const|let|var)\s+(\w+)\s*=\s*(\{[\s\S]*\})/m);
                if (exportMatch && exportMatch[2]) {
                  const jsonContent = exportMatch[2]
                    .replace(/\/\/.*$/gm, '')           // 移除单行注释
                    .replace(/\/\*[\s\S]*?\*\//g, '')   // 移除多行注释
                    .replace(/,(\s*\})/g, '$1');        // 移除尾随逗号
                  
                  try {
                    extractedJson = new Function(`return ${jsonContent}`)();
                    logger.debug("成功从TypeScript变量提取JSON对象");
                  } catch (evalError: any) {
                    logger.debug("无法执行提取的TypeScript变量", { error: evalError.message });
                  }
                }
              }
              
              if (extractedJson) {
                parsedData = extractedJson;
              } else {
                // 无法提取，保留为带类型标记的字符串
                parsedData = { 
                  content: stringData,
                  type: 'typescript'
                };
              }
            } else {
              // 5. 再次尝试解析为可能格式不标准的JSON
              try {
                // 尝试清理JSON字符串（移除注释、尾随逗号等）
                const cleanedJsonStr = stringData
                  .replace(/\/\/.*$/gm, '') // 移除单行注释
                  .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
                  .replace(/,(\s*[\]}])/g, '$1'); // 移除尾随逗号
                
                parsedData = JSON.parse(cleanedJsonStr);
                logger.debug("清理后成功解析为JSON");
              } catch (jsonCleanError) {
                // 6. 如果所有尝试都失败，保留为普通字符串
                logger.debug("无法识别为JSON或TypeScript，保留为字符串");
                parsedData = { content: stringData };
              }
            }
          }
        }
      } catch (parseError) {
        // 字符串转换或解析过程中的任何其他错误
        logger.warn("无法解析Buffer数据，使用原始Buffer的base64表示", {
          error: parseError,
        });
        parsedData = { rawBuffer: originalData.toString("base64") };
      }
    } else if (typeof originalData === "string") {
      // 尝试解析字符串为JSON
      try {
        parsedData = JSON.parse(originalData);
        logger.debug("字符串数据已成功解析为JSON");
      } catch (error) {
        parsedData = { content: originalData };
        logger.debug("无法将字符串解析为JSON，保留为原始字符串");
      }
    } else {
      // 如果已经是对象，直接使用
      parsedData = originalData;
    }

    // 创建增强翻译对象
    const enhancedTranslation: EnhancedTranslation = {
      original: parsedData, // 现在使用解析后的数据
      metadata: {
        downloadedAt: new Date().toISOString(),
        languageCode,
        projectId,
        version: "1.0",
        dataFormat: detectDataFormat(parsedData), // 添加数据格式信息
      },
      content: {},
    };

    // 添加可选的文件ID
    if (fileId !== undefined) {
      enhancedTranslation.metadata.fileId = fileId;
    }

    // 如果是 JSON 或 TypeScript 格式的对象，将原始数据转换为数组格式
    const dataFormat = enhancedTranslation.metadata.dataFormat;
    if ((dataFormat === "json" || dataFormat === "text") && typeof parsedData === "object" && !Array.isArray(parsedData)) {
      // 检查是否包含 type: 'typescript' 标记，或者是纯对象
      const isTs = parsedData.type === 'typescript';
      const sourceObj = isTs && parsedData.content ? parsedData.content : parsedData;
      
      // 如果是普通对象，转换为数组格式
      if (typeof sourceObj === "object" && !Array.isArray(sourceObj)) {
        const originalArray = [];
        
        // 遍历对象的键值对，转换为 {key, value} 格式
        for (const key in sourceObj) {
          if (Object.prototype.hasOwnProperty.call(sourceObj, key)) {
            originalArray.push({
              key,
              value: sourceObj[key]
            });
          }
        }
        
        // 更新 original 字段为数组格式
        enhancedTranslation.original = originalArray;
        logger.debug(`将 ${isTs ? 'TypeScript' : 'JSON'} 对象转换为数组格式，共 ${originalArray.length} 项`);
      }
    }

    // 处理翻译内容 - 这里可以根据实际需求自定义处理逻辑
    enhancedTranslation.content = processContent(parsedData, languageCode, projectId, fileId);

    return enhancedTranslation;
  } catch (error) {
    logger.error(`处理翻译数据失败: ${languageCode}`, { error, fileId });
    throw new Error(`处理翻译数据失败: ${(error as Error).message}`);
  }
}

/**
 * 检测数据格式
 */
function detectDataFormat(data: any): string {
  if (Array.isArray(data)) {
    return "csv";
  } else if (data && typeof data === "object" && data.rawBuffer) {
    return "buffer";
  } else if (
    data &&
    typeof data === "object" &&
    data.content &&
    typeof data.content === "string"
  ) {
    return "text";
  } else if (data && typeof data === "object") {
    return "json";
  }
  return "unknown";
}

/**
 * 内容处理函数 - 可根据实际需求自定义
 */
function processContent(data: any, languageCode: string, projectId?: number, fileId?: number): Record<string, any> {
  // 这里是根据实际需求处理数据的地方

  // 获取当前时间
  const currentTime = new Date().toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(/\//g, "-");

  // 加载之前存储的翻译缓存（如果存在）
  let previousTranslations: Record<string, any> = {};
  try {
    const cacheDir = path.join(config.outputDir || 'cache', 'translation_cache');
    const cacheFileName = `${languageCode}${projectId ? '_p' + projectId : ''}${fileId ? '_f' + fileId : ''}.json`;
    const cacheFilePath = path.join(cacheDir, cacheFileName);
    
    // 确保缓存目录存在
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // 读取现有缓存
    if (fs.existsSync(cacheFilePath)) {
      const cacheContent = fs.readFileSync(cacheFilePath, 'utf-8');
      previousTranslations = JSON.parse(cacheContent);
      logger.debug(`已加载翻译缓存文件: ${cacheFilePath}`, { entryCount: Object.keys(previousTranslations).length });
    } else {
      logger.debug(`翻译缓存文件不存在，将创建新文件: ${cacheFilePath}`);
    }
  } catch (error) {
    logger.warn(`无法加载翻译缓存，将创建新的翻译记录`, { error });
    // 继续处理，视为所有翻译都是新的
  }

  // 如果是数组（CSV数据），转换为键值对
  if (Array.isArray(data)) {
    const processedContent: any[] = [];
    const updatedCache: Record<string, any> = {};

    data.forEach((row, index) => {
      // 提取键和值
      const key = String(Object.values(row)[0] || '');
      const value = String(Object.values(row)[1] || '');
      
      if (!key) {
        logger.warn(`跳过无效的翻译项 #${index}，键为空`);
        return;
      }

      // 检查该翻译键是否已存在于缓存中
      const existingTranslation = previousTranslations[key];
      
      let creationTime = currentTime;
      let updateTime = currentTime;
      
      // 如果存在上一次的翻译，复用其创建时间
      if (existingTranslation) {
        if (existingTranslation.creationTime) {
          creationTime = existingTranslation.creationTime;
          logger.debug(`找到现有翻译: ${key}, 创建时间: ${creationTime}`);
        }
        
        // 只有当value发生变化时才更新updateTime
        if (existingTranslation.value === value) {
          updateTime = existingTranslation.updateTime || currentTime;
          logger.debug(`翻译内容未变化: ${key}, 保留更新时间: ${updateTime}`);
        } else {
          logger.debug(`翻译内容已变化: ${key}, 旧值: "${existingTranslation.value}", 新值: "${value}", 更新时间更新为: ${currentTime}`);
        }
      } else {
        logger.debug(`新增翻译: ${key}, 创建时间: ${creationTime}`);
      }

      // 创建翻译项
      const translationItem = {
        key,
        value,
        creationTime,
        updateTime, // 只有在内容变化时才会是当前时间，否则保留原更新时间
        language: languageCode,
      };
      
      // 添加到处理后的内容
      processedContent.push(translationItem);
      
      // 更新缓存
      updatedCache[key] = translationItem;
    });

    // 保存更新后的缓存
    try {
      const cacheDir = path.join(config.outputDir || 'cache', 'translation_cache');
      const cacheFileName = `${languageCode}${projectId ? '_p' + projectId : ''}${fileId ? '_f' + fileId : ''}.json`;
      const cacheFilePath = path.join(cacheDir, cacheFileName);
      
      fs.writeFileSync(cacheFilePath, JSON.stringify(updatedCache, null, 2), 'utf-8');
      logger.debug(`已更新翻译缓存文件: ${cacheFilePath}`, { entryCount: Object.keys(updatedCache).length });
    } catch (error) {
      logger.error(`保存翻译缓存失败`, { error });
      // 继续处理，即使缓存保存失败
    }

    return processedContent;
  }
  
  // 处理 JSON 或 TypeScript 格式的对象
  if (typeof data === "object" && !Array.isArray(data)) {
    // 检查是否是 TypeScript 对象（包含 type: 'typescript' 标记）
    const isTs = data.type === 'typescript';
    const sourceObj = isTs && data.content ? data.content : data;
    
    // 如果是对象，创建键值对数组
    if (typeof sourceObj === "object" && !Array.isArray(sourceObj)) {
      const processedContent: any[] = [];
      const updatedCache: Record<string, any> = {};
      
      for (const key in sourceObj) {
        if (Object.prototype.hasOwnProperty.call(sourceObj, key)) {
          const value = String(sourceObj[key]);
          
          // 检查该翻译键是否已存在于缓存中
          const existingTranslation = previousTranslations[key];
          
          let creationTime = currentTime;
          let updateTime = currentTime;
          
          // 如果存在上一次的翻译，复用其创建时间
          if (existingTranslation) {
            if (existingTranslation.creationTime) {
              creationTime = existingTranslation.creationTime;
              logger.debug(`找到现有翻译: ${key}, 创建时间: ${creationTime}`);
            }
            
            // 只有当value发生变化时才更新updateTime
            if (existingTranslation.value === value) {
              updateTime = existingTranslation.updateTime || currentTime;
              logger.debug(`翻译内容未变化: ${key}, 保留更新时间: ${updateTime}`);
            } else {
              logger.debug(`翻译内容已变化: ${key}, 旧值: "${existingTranslation.value}", 新值: "${value}", 更新时间更新为: ${currentTime}`);
            }
          } else {
            logger.debug(`新增翻译: ${key}, 创建时间: ${creationTime}`);
          }
          
          // 创建翻译项
          const translationItem = {
            key,
            value,
            creationTime,
            updateTime, // 只有在内容变化时才会是当前时间，否则保留原更新时间
            language: languageCode,
          };
          
          // 添加到处理后的内容
          processedContent.push(translationItem);
          
          // 更新缓存
          updatedCache[key] = translationItem;
        }
      }
      
      // 保存更新后的缓存
      try {
        const cacheDir = path.join(config.outputDir || 'cache', 'translation_cache');
        const cacheFileName = `${languageCode}${projectId ? '_p' + projectId : ''}${fileId ? '_f' + fileId : ''}.json`;
        const cacheFilePath = path.join(cacheDir, cacheFileName);
        
        fs.writeFileSync(cacheFilePath, JSON.stringify(updatedCache, null, 2), 'utf-8');
        logger.debug(`已更新翻译缓存文件: ${cacheFilePath}`, { entryCount: Object.keys(updatedCache).length });
      } catch (error) {
        logger.error(`保存翻译缓存失败`, { error });
        // 继续处理，即使缓存保存失败
      }
      
      return processedContent;
    }
  }

  // 处理其他类型数据
  const processedContent: Record<string, any> = { ...data };

  // 添加语言标识
  processedContent._language = languageCode;

  // 添加时间戳
  processedContent._timestamp = Date.now();

  return processedContent;
}
