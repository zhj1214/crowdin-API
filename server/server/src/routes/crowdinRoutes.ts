import express from 'express';
import * as crowdinController from '../controllers/crowdinController';

const router = express.Router();

// 获取项目列表
router.get('/projects', crowdinController.getProjects);

// 获取项目文件列表
router.get('/projects/:projectId/files', crowdinController.getProjectFiles);

// 获取项目语言列表
router.get('/projects/:projectId/languages', crowdinController.getProjectLanguages);

// 下载文件翻译
router.post('/translations/file', crowdinController.downloadFileTranslation);

// 下载项目翻译
router.post('/translations/project', crowdinController.downloadProjectTranslation);

export default router; 