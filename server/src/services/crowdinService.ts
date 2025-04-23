import crowdin, { CrowdinApi } from '@crowdin/crowdin-api-client';
import config from '../config/config';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { 
  CrowdinCredentials, 
  EnhancedTranslation, 
  FileTranslationRequest, 
  ProjectInfo, 
  ProjectTranslationRequest 
} from '../types';
import { processTranslationData } from '../processors/translationProcessor';

class CrowdinService {
  private api: any; // 使用any类型避免类型错误
  
  constructor(credentials: CrowdinCredentials = config.crowdin) {
    try {
      // 正确初始化Crowdin客户端
      const {
        projectsGroupsApi,
        sourceFilesApi,
        translationsApi,
        languagesApi
      } = new crowdin(credentials);
      
      // 将API实例存储到this.api对象中
      this.api = {
        projectsGroupsApi,
        sourceFilesApi,
        translationsApi,
        languagesApi
      };
      
      logger.info('Crowdin服务初始化完成');
    } catch (error) {
      logger.error('Crowdin服务初始化失败', { error });
      throw error;
    }
  }
  
  /**
   * 获取项目列表
   */
  async getProjects(): Promise<ProjectInfo[]> {
    try {
      logger.info('获取项目列表');
      
      const response = await this.api.projectsGroupsApi.listProjects();
      
      return response.data.map((project: any) => ({
        id: project.data.id,
        name: project.data.name,
        identifier: project.data.identifier,
        description: project.data.description,
        public: project.data.visibility === 'open',
        sourceLanguageId: project.data.sourceLanguageId,
        targetLanguageIds: project.data.targetLanguageIds || []
      }));
    } catch (error) {
      logger.error('获取项目列表失败', { error });
      throw error;
    }
  }
  
  /**
   * 获取项目文件列表
   * @param projectId 项目ID
   */
  async getProjectFiles(projectId: number): Promise<any[]> {
    try {
      logger.info(`获取项目 ${projectId} 的文件列表`);
      
      const response = await this.api.sourceFilesApi.listFiles(projectId);
      return response.data;
    } catch (error) {
      logger.error(`获取项目 ${projectId} 的文件列表失败`, { error });
      throw error;
    }
  }
  
  /**
   * 获取项目语言列表
   * @param projectId 项目ID
   */
  async getProjectLanguages(projectId: number): Promise<any[]> {
    try {
      logger.info(`获取项目 ${projectId} 的语言列表`);
      
      const response = await this.api.languagesApi.listSupportedLanguages();
      return response.data;
    } catch (error) {
      logger.error(`获取项目 ${projectId} 的语言列表失败`, { error });
      throw error;
    }
  }
  
  /**
   * 下载文件翻译
   * @param request 文件翻译请求参数
   */
  async downloadFileTranslation(request: FileTranslationRequest): Promise<EnhancedTranslation> {
    const { projectId, fileId, languageId } = request;
    
    try {
      logger.info(`为项目 ${projectId} 文件 ${fileId} 构建翻译`);
      
      // 1. 构建文件翻译
      const buildResponse = await this.api.translationsApi.buildProjectFileTranslation(projectId, fileId, {
        targetLanguageId: languageId
      });
      
      const buildId = buildResponse.data.id;
      logger.info(`翻译构建ID: ${buildId}`);
      
      // 2. 检查构建状态
      let buildStatus = 'inProgress';
      while (buildStatus === 'inProgress') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
        
        const checkResponse = await this.api.translationsApi.checkBuildStatus(buildId);
        buildStatus = checkResponse.data.status;
        
        logger.debug(`翻译构建状态: ${buildStatus}`);
      }
      
      if (buildStatus !== 'finished') {
        throw new Error(`翻译构建失败，状态为 ${buildStatus}`);
      }
      
      // 3. 下载翻译
      logger.info(`下载翻译构建 ${buildId}`);
      const downloadResponse = await this.api.translationsApi.downloadTranslations(buildId);
      
      // 4. 处理翻译数据
      const rawData = downloadResponse.data;
      const translationData = processTranslationData(rawData, languageId, projectId, fileId);
      
      // 5. 保存到文件（如果需要）
      const outputDir = config.outputDir;
      if (outputDir) {
        this.saveTranslationToFile(translationData, languageId, fileId);
      }
      
      return translationData;
    } catch (error) {
      logger.error(`下载文件 ${fileId} 的 ${languageId} 翻译失败`, { error });
      throw error;
    }
  }
  
  /**
   * 下载项目翻译
   * @param request 项目翻译请求参数
   */
  async downloadProjectTranslation(request: ProjectTranslationRequest): Promise<EnhancedTranslation> {
    const { projectId, languageId } = request;
    
    try {
      logger.info(`为项目 ${projectId} 构建翻译`);
      
      // 1. 构建项目翻译
      const buildResponse = await this.api.translationsApi.buildProject(projectId, {
        targetLanguageId: languageId
      });
      
      const buildId = buildResponse.data.id;
      logger.info(`翻译构建ID: ${buildId}`);
      
      // 2. 检查构建状态
      let buildStatus = 'inProgress';
      while (buildStatus === 'inProgress') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
        
        const checkResponse = await this.api.translationsApi.checkBuildStatus(buildId);
        buildStatus = checkResponse.data.status;
        
        logger.debug(`翻译构建状态: ${buildStatus}`);
      }
      
      if (buildStatus !== 'finished') {
        throw new Error(`翻译构建失败，状态为 ${buildStatus}`);
      }
      
      // 3. 下载翻译
      logger.info(`下载翻译构建 ${buildId}`);
      const downloadResponse = await this.api.translationsApi.downloadTranslations(buildId);
      
      // 4. 处理翻译数据
      const rawData = downloadResponse.data;
      const translationData = processTranslationData(rawData, languageId, projectId);
      
      // 5. 保存到文件（如果需要）
      const outputDir = config.outputDir;
      if (outputDir) {
        this.saveTranslationToFile(translationData, languageId);
      }
      
      return translationData;
    } catch (error) {
      logger.error(`下载项目 ${projectId} 的 ${languageId} 翻译失败`, { error });
      throw error;
    }
  }
  
  /**
   * 保存翻译到文件
   */
  private saveTranslationToFile(
    data: EnhancedTranslation,
    languageId: string,
    fileId?: number
  ): void {
    try {
      // 创建目标目录
      const dirPath = path.join(config.outputDir, languageId);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 文件名
      const fileName = fileId 
        ? `file_${fileId}.json` 
        : 'project_translation.json';
      
      // 完整路径
      const filePath = path.join(dirPath, fileName);
      
      // 写入文件
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      
      logger.info(`翻译数据已保存至文件: ${filePath}`);
    } catch (error) {
      logger.error('保存翻译数据到文件失败', { error, languageId, fileId });
    }
  }
}

export default new CrowdinService(); 