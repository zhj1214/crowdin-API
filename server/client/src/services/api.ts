import axios from 'axios';
import type { 
  ApiResponse, 
  ProjectInfo, 
  FileInfo, 
  LanguageInfo, 
  FileTranslationRequest, 
  ProjectTranslationRequest,
  EnhancedTranslation
} from '@/types';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API 请求错误:', error);
    return Promise.reject(error);
  }
);

// API 服务类
export const api = {
  // 获取项目列表
  async getProjects(): Promise<ApiResponse<ProjectInfo[]>> {
    const response = await apiClient.get<ApiResponse<ProjectInfo[]>>('/crowdin/projects');
    return response.data;
  },
  
  // 获取项目文件列表
  async getProjectFiles(projectId: number): Promise<ApiResponse<FileInfo[]>> {
    const response = await apiClient.get<ApiResponse<FileInfo[]>>(`/crowdin/projects/${projectId}/files`);
    return response.data;
  },
  
  // 获取项目语言列表
  async getProjectLanguages(projectId: number): Promise<ApiResponse<LanguageInfo[]>> {
    const response = await apiClient.get<ApiResponse<LanguageInfo[]>>(`/crowdin/projects/${projectId}/languages`);
    return response.data;
  },
  
  // 下载文件翻译
  async downloadFileTranslation(request: FileTranslationRequest): Promise<ApiResponse<EnhancedTranslation>> {
    const response = await apiClient.post<ApiResponse<EnhancedTranslation>>('/crowdin/translations/file', request);
    return response.data;
  },
  
  // 下载项目翻译
  async downloadProjectTranslation(request: ProjectTranslationRequest): Promise<ApiResponse<{ downloadUrl: string }>> {
    const response = await apiClient.post<ApiResponse<{ downloadUrl: string }>>('/crowdin/translations/project', request);
    return response.data;
  }
}; 