import { EnhancedTranslation } from "../types";
import logger from "../utils/logger";
import { parse as csvParse } from "csv-parse/sync";

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
    enhancedTranslation.content = processContent(parsedData, languageCode);

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
function processContent(data: any, languageCode: string): Record<string, any> {
  // 这里是根据实际需求处理数据的地方

  // 如果是数组（CSV数据），转换为键值对
  if (Array.isArray(data)) {
    const processedContent: any[] = [];

    data.forEach((row, index) => {
      // 假设CSV第一列是键，第二列是值

      processedContent.push({
        key: Object.values(row)[0],
        value: Object.values(row)[1],
        timestamp: Date.now(),
        language: languageCode,
      });
    });

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
