import * as crowdin from "@crowdin/crowdin-api-client";
import config from "../config/config";
import logger from "../utils/logger";
import fs from "fs";
import path from "path";
import {
  CrowdinCredentials,
  EnhancedTranslation,
  FileTranslationRequest,
  ProjectInfo,
  ProjectTranslationRequest,
} from "../types";
import { processTranslationData } from "../processors/translationProcessor";

class CrowdinService {
  private api: any; // 使用any类型避免类型错误

  constructor(credentials: CrowdinCredentials = config.crowdin) {
    try {
      logger.info("初始化 Crowdin 客户端", {
        token: credentials.token ? "已设置" : "未设置",
        organization: credentials.organization || "未设置",
      });

      // 正确初始化Crowdin客户端 - 使用完整客户端
      this.api = new crowdin.default(credentials);

      logger.info("Crowdin服务初始化完成", {
        hasApi: !!this.api,
        hasProjectsGroupsApi: !!this.api.projectsGroupsApi,
        hasSourceFilesApi: !!this.api.sourceFilesApi,
        hasTranslationsApi: !!this.api.translationsApi,
        hasLanguagesApi: !!this.api.languagesApi,
      });
    } catch (error) {
      logger.error("Crowdin服务初始化失败", {
        error,
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : "",
      });
      throw error;
    }
  }

  /**
   * 获取项目列表
   */
  async getProjects(): Promise<ProjectInfo[]> {
    try {
      logger.info("获取项目列表");

      const response = await this.api.projectsGroupsApi.listProjects();

      return response.data.map((project: any) => ({
        id: project.data.id,
        name: project.data.name,
        identifier: project.data.identifier,
        description: project.data.description,
        public: project.data.visibility === "open",
        sourceLanguageId: project.data.sourceLanguageId,
        targetLanguageIds: project.data.targetLanguageIds || [],
      }));
    } catch (error) {
      logger.error("获取项目列表失败", {
        error,
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : "",
        name: error instanceof Error ? error.name : "",
        toString: String(error),
      });
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

      const response = await this.api.sourceFilesApi.listProjectFiles(
        projectId
      );
      return response.data;
    } catch (error) {
      logger.error(`获取项目 ${projectId} 的文件列表失败`, {
        error,
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : "",
      });
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

      // 获取项目详情，以获取源语言和目标语言ID
      logger.info(`正在获取项目 ${projectId} 的详情`);
      const projectResponse = await this.api.projectsGroupsApi.getProject(
        projectId
      );
      const project = projectResponse.data;

      logger.info(`项目 ${projectId} 详情获取成功`, {
        projectId: project.id,
        name: project.name,
        sourceLanguageId: project.sourceLanguageId,
        targetLanguageIds: project.targetLanguageIds || [],
        hasTargetLanguages:
          !!project.targetLanguageIds && project.targetLanguageIds.length > 0,
      });

      // 直接使用项目中的targetLanguageIds
      const languages = [];

      // 添加源语言
      languages.push({
        id: project.sourceLanguageId,
        name: project.sourceLanguageId, // 由于没有语言详情，暂时使用ID作为名称
        localeCode: project.sourceLanguageId,
        isSource: true,
      });

      // 添加目标语言
      if (project.targetLanguageIds && project.targetLanguageIds.length > 0) {
        project.targetLanguageIds.forEach((langId: string) => {
          languages.push({
            id: langId,
            name: langId, // 由于没有语言详情，暂时使用ID作为名称
            localeCode: langId,
            isSource: false,
          });
        });
      }

      logger.info(`返回项目配置的语言，共 ${languages.length} 种`, {
        languages: languages
          .map((l) => `${l.id}${l.isSource ? "(源语言)" : ""}`)
          .join(", "),
      });

      return languages;
    } catch (error) {
      logger.error(`获取项目 ${projectId} 的语言列表失败`, {
        error,
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : "",
      });
      throw error;
    }
  }

  /**
   * 下载文件翻译
   * @param request 文件翻译请求参数
   */
  async downloadFileTranslation(
    request: FileTranslationRequest
  ): Promise<EnhancedTranslation> {
    const { projectId, fileId, languageId } = request;

    try {
      logger.info(`为项目 ${projectId} 文件 ${fileId} 构建翻译`);

      // 检查API是否已初始化
      if (!this.api || !this.api.translationsApi) {
        throw new Error("翻译API未初始化，请检查Crowdin配置");
      }

      // 1. 构建文件翻译
      try {
        const buildResponse =
          await this.api.translationsApi.buildProjectFileTranslation(
            projectId,
            fileId,
            {
              targetLanguageId: languageId,
            }
          );

        const buildId = buildResponse.data.id;
        logger.info(`翻译构建ID: ${buildId}`, {
          buildResponse: buildResponse ? JSON.stringify(buildResponse) : '无数据'
        });

        // 如果buildResponse.data包含url，则直接使用该URL下载
        if (buildResponse.data && buildResponse.data.url) {
          logger.info(`使用直接URL下载翻译: ${buildResponse.data.url.substring(0, 100)}...`);
          
          // 使用fetch或axios等库下载文件
          const axios = require('axios');
          const response = await axios.get(buildResponse.data.url, {
            responseType: 'arraybuffer'
          });
          
          // 4. 处理翻译数据
          const rawData = response.data;
          const translationData = processTranslationData(
            rawData,
            languageId,
            projectId,
            fileId
          );

          // 5. 保存到文件（如果需要）
          const outputDir = config.outputDir;
          if (outputDir) {
            this.saveTranslationToFile(translationData, languageId, fileId);
          }

          return translationData;
        }

        // 如果没有直接URL，则继续使用传统的方法
        // 2. 检查构建状态
        let buildStatus = "inProgress";
        while (buildStatus === "inProgress") {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒

          const checkResponse = await this.api.translationsApi.checkBuildStatus(
            buildId
          );
          buildStatus = checkResponse.data.status;

          logger.debug(`翻译构建状态: ${buildStatus}`);
        }

        if (buildStatus !== "finished") {
          throw new Error(`翻译构建失败，状态为 ${buildStatus}`);
        }

        // 3. 下载翻译
        logger.info(`使用downloadTranslations下载翻译构建 ${buildId}`);
        const downloadResponse =
          await this.api.translationsApi.downloadTranslations(buildId);

        // 4. 处理翻译数据
        const rawData = downloadResponse.data;
        const translationData = processTranslationData(
          rawData,
          languageId,
          projectId,
          fileId
        );

        // 5. 保存到文件（如果需要）
        const outputDir = config.outputDir;
        if (outputDir) {
          this.saveTranslationToFile(translationData, languageId, fileId);
        }

        return translationData;
      } catch (apiError: any) {
        // 处理API权限错误
        if (
          apiError.message &&
          (apiError.message.includes("not allowed for token scopes") ||
            apiError.message.includes("Endpoint isn't allowed"))
        ) {
          logger.error("API权限不足，无法访问翻译功能", {
            error: apiError,
            message:
              "您的Crowdin API令牌没有足够的权限访问翻译功能。请确保您的令牌具有以下权限：translation.get, translation.build",
          });
          throw new Error(
            "Crowdin API令牌权限不足。请更新您的令牌，确保它具有翻译功能的访问权限。"
          );
        }
        // 其他API错误
        throw apiError;
      }
    } catch (error) {
      logger.error(`下载文件 ${fileId} 的 ${languageId} 翻译失败`, {
        error,
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : "",
        name: error instanceof Error ? error.name : "",
      });
      throw error;
    }
  }

  /**
   * 下载项目翻译
   * @param request 项目翻译请求参数
   */
  async downloadProjectTranslation(
    request: ProjectTranslationRequest
  ): Promise<EnhancedTranslation> {
    const { projectId, languageId } = request;

    try {
      logger.info(`为项目 ${projectId} 构建翻译`);

      // 检查API是否已初始化
      if (!this.api || !this.api.translationsApi) {
        throw new Error("翻译API未初始化，请检查Crowdin配置");
      }

      // 1. 构建项目翻译
      try {
        const buildResponse = await this.api.translationsApi.buildProject(
          projectId,
          {
            targetLanguageId: languageId,
          }
        );

        const buildId = buildResponse.data.id;
        logger.info(`翻译构建ID: ${buildId}`, {
          buildResponse: buildResponse ? JSON.stringify(buildResponse) : '无数据'
        });
        
        // 如果buildResponse.data包含url，则直接使用该URL下载
        if (buildResponse.data && buildResponse.data.url) {
          logger.info(`使用直接URL下载翻译: ${buildResponse.data.url.substring(0, 100)}...`);
          
          // 使用axios下载文件
          const axios = require('axios');
          const response = await axios.get(buildResponse.data.url, {
            responseType: 'arraybuffer'
          });
          
          // 4. 处理翻译数据
          const rawData = response.data;
          const translationData = processTranslationData(
            rawData,
            languageId,
            projectId
          );

          // 5. 保存到文件（如果需要）
          const outputDir = config.outputDir;
          if (outputDir) {
            this.saveTranslationToFile(translationData, languageId);
          }

          return translationData;
        }

        // 如果没有直接URL，则继续使用传统的方法
        // 2. 检查构建状态
        let buildStatus = "inProgress";
        while (buildStatus === "inProgress") {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒

          const checkResponse = await this.api.translationsApi.checkBuildStatus(
            buildId
          );
          buildStatus = checkResponse.data.status;

          logger.debug(`翻译构建状态: ${buildStatus}`);
        }

        if (buildStatus !== "finished") {
          throw new Error(`翻译构建失败，状态为 ${buildStatus}`);
        }

        // 3. 下载翻译
        logger.info(`使用downloadTranslations下载翻译构建 ${buildId}`);
        const downloadResponse =
          await this.api.translationsApi.downloadTranslations(buildId);

        // 4. 处理翻译数据
        const rawData = downloadResponse.data;
        const translationData = processTranslationData(
          rawData,
          languageId,
          projectId
        );

        // 5. 保存到文件（如果需要）
        const outputDir = config.outputDir;
        if (outputDir) {
          this.saveTranslationToFile(translationData, languageId);
        }

        return translationData;
      } catch (apiError: any) {
        // 处理API权限错误
        if (
          apiError.message &&
          (apiError.message.includes("not allowed for token scopes") ||
            apiError.message.includes("Endpoint isn't allowed"))
        ) {
          logger.error("API权限不足，无法访问翻译功能", {
            error: apiError,
            message:
              "您的Crowdin API令牌没有足够的权限访问翻译功能。请确保您的令牌具有以下权限：translation.get, translation.build",
          });
          throw new Error(
            "Crowdin API令牌权限不足。请更新您的令牌，确保它具有翻译功能的访问权限。"
          );
        }
        // 其他API错误
        throw apiError;
      }
    } catch (error) {
      logger.error(`下载项目 ${projectId} 的 ${languageId} 翻译失败`, {
        error,
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : "",
        name: error instanceof Error ? error.name : "",
      });
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
        : "project_translation.json";

      // 完整路径
      const filePath = path.join(dirPath, fileName);

      // 写入文件
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

      logger.info(`翻译数据已保存至文件: ${filePath}`);
    } catch (error) {
      logger.error("保存翻译数据到文件失败", {
        error,
        languageId,
        fileId,
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  }
}

export default new CrowdinService();
