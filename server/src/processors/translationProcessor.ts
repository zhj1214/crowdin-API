import { EnhancedTranslation } from '../types';
import logger from '../utils/logger';

/**
 * 处理翻译数据，添加额外信息和格式化
 */
export function processTranslationData(
  originalData: Record<string, any>,
  languageCode: string,
  projectId: number,
  fileId?: number
): EnhancedTranslation {
  logger.debug(`处理语言 ${languageCode} 的翻译数据`, { fileId });
  
  try {
    // 创建增强翻译对象
    const enhancedTranslation: EnhancedTranslation = {
      original: originalData,
      metadata: {
        downloadedAt: new Date().toISOString(),
        languageCode,
        projectId,
        version: '1.0',
      },
      content: {}
    };
    
    // 添加可选的文件ID
    if (fileId !== undefined) {
      enhancedTranslation.metadata.fileId = fileId;
    }
    
    // 处理翻译内容 - 这里可以根据实际需求自定义处理逻辑
    enhancedTranslation.content = processContent(originalData, languageCode);
    
    return enhancedTranslation;
  } catch (error) {
    logger.error(`处理翻译数据失败: ${languageCode}`, { error, fileId });
    throw new Error(`处理翻译数据失败: ${(error as Error).message}`);
  }
}

/**
 * 内容处理函数 - 可根据实际需求自定义
 */
function processContent(
  data: Record<string, any>,
  languageCode: string
): Record<string, any> {
  // 这里是根据实际需求处理数据的地方
  
  const processedContent: Record<string, any> = { ...data };
  
  // 添加语言标识
  processedContent._language = languageCode;
  
  // 添加时间戳
  processedContent._timestamp = Date.now();
  
  return processedContent;
} 