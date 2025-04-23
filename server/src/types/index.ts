// Crowdin API 相关类型
export interface CrowdinCredentials {
  token: string;
  organization?: string;
}

export interface TranslationRequest {
  projectId: number;
  targetLanguages: string[];
  fileIds?: number[];
}

export interface FileTranslationRequest {
  projectId: number;
  fileId: number;
  languageId: string;
}

export interface ProjectTranslationRequest {
  projectId: number;
  languageId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

export interface ProjectInfo {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  public: boolean;
  sourceLanguageId: string;
  targetLanguageIds: string[];
}

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