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
        // 尝试解析为JSON
        const stringData = originalData.toString("utf-8");
        try {
          parsedData = JSON.parse(stringData);
          logger.debug("数据已成功解析为JSON");
        } catch (jsonError) {
          // 不是有效的JSON，尝试解析为CSV
          logger.debug("不是有效的JSON，尝试解析为CSV");

          try {
            parsedData = csvParse(stringData, {
              columns: true,
              skip_empty_lines: true,
            });
            logger.debug("数据已成功解析为CSV", {
              rowCount: parsedData.length,
            });
          } catch (csvError) {
            // 无法解析为CSV，保留为字符串
            logger.debug("无法解析为CSV，保留为字符串");
            parsedData = { content: stringData };
          }
        }
      } catch (parseError) {
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

  // 处理对象数据或其他格式
  const processedContent: Record<string, any> = { ...data };

  // 添加语言标识
  processedContent._language = languageCode;

  // 添加时间戳
  processedContent._timestamp = Date.now();

  return processedContent;
}
