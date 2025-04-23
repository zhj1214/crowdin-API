import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse, FileTranslationRequest, ProjectTranslationRequest } from '../types';
import crowdinService from '../services/crowdinService';
import logger from '../utils/logger';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await crowdinService.getProjects();
    
    const response: ApiResponse<typeof projects> = {
      success: true,
      data: projects
    };
    
    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    logger.error('获取项目列表失败', { error });
    
    const response: ApiResponse<null> = {
      success: false,
      error: (error as Error).message
    };
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
  }
};

export const getProjectFiles = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: '无效的项目ID'
      });
    }
    
    const files = await crowdinService.getProjectFiles(projectId);
    
    const response: ApiResponse<typeof files> = {
      success: true,
      data: files
    };
    
    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    logger.error('获取项目文件列表失败', { error });
    
    const response: ApiResponse<null> = {
      success: false,
      error: (error as Error).message
    };
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
  }
};

export const getProjectLanguages = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: '无效的项目ID'
      });
    }
    
    const languages = await crowdinService.getProjectLanguages(projectId);
    
    const response: ApiResponse<typeof languages> = {
      success: true,
      data: languages
    };
    
    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    logger.error('获取项目语言列表失败', { error });
    
    const response: ApiResponse<null> = {
      success: false,
      error: (error as Error).message
    };
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
  }
};

export const downloadFileTranslation = async (req: Request, res: Response) => {
  try {
    const { projectId, fileId, languageId } = req.body as FileTranslationRequest;
    
    if (!projectId || !fileId || !languageId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: '缺少必要参数：projectId, fileId, languageId'
      });
    }
    
    const translation = await crowdinService.downloadFileTranslation({
      projectId,
      fileId,
      languageId
    });
    
    const response: ApiResponse<typeof translation> = {
      success: true,
      data: translation
    };
    
    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    logger.error('下载文件翻译失败', { error });
    
    // 为前端提供更详细的错误信息
    let errorMessage = error instanceof Error ? error.message : '未知错误';
    let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    
    // 处理权限不足错误
    if (errorMessage.includes('API令牌权限不足') || errorMessage.includes("Endpoint isn't allowed")) {
      errorMessage = 'Crowdin API令牌权限不足。请更新您的令牌，确保它具有翻译功能的访问权限（translation.get, translation.build）。';
      statusCode = StatusCodes.FORBIDDEN;
    }
    
    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage
    };
    
    res.status(statusCode).json(response);
  }
};

export const downloadProjectTranslation = async (req: Request, res: Response) => {
  try {
    const { projectId, languageId } = req.body as ProjectTranslationRequest;
    
    if (!projectId || !languageId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: '缺少必要参数：projectId, languageId'
      });
    }
    
    const result = await crowdinService.downloadProjectTranslation({
      projectId,
      languageId
    });
    
    const response: ApiResponse<typeof result> = {
      success: true,
      data: result
    };
    
    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    logger.error('下载项目翻译失败', { error });
    
    // 为前端提供更详细的错误信息
    let errorMessage = error instanceof Error ? error.message : '未知错误';
    let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    
    // 处理权限不足错误
    if (errorMessage.includes('API令牌权限不足') || errorMessage.includes("Endpoint isn't allowed")) {
      errorMessage = 'Crowdin API令牌权限不足。请更新您的令牌，确保它具有翻译功能的访问权限（translation.get, translation.build）。';
      statusCode = StatusCodes.FORBIDDEN;
    }
    
    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage
    };
    
    res.status(statusCode).json(response);
  }
}; 