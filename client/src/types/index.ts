// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

// 项目信息类型
export interface ProjectInfo {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  public: boolean;
  sourceLanguageId: string;
  targetLanguageIds: string[];
}

// 文件信息类型
export interface FileInfo {
  id: number;
  name: string;
  type: string;
  path: string;
  directoryId?: number;
}

// 语言信息类型
export interface LanguageInfo {
  id: string;
  name: string;
  localeCode: string;
  isSource: boolean;
}

// 翻译下载请求类型
export interface FileTranslationRequest {
  projectId: number;
  fileId: number;
  languageId: string;
}

// 项目翻译下载请求类型
export interface ProjectTranslationRequest {
  projectId: number;
  languageId: string;
}

// 增强的翻译内容类型
export interface EnhancedTranslation {
  original: Record<string, any>;
  metadata: {
    downloadedAt: string;
    languageCode: string;
    fileId?: number;
    projectId: number;
    version: string;
  };
  content: Record<string, any>;
} 