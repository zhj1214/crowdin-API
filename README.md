## Crowdin 翻译下载方案（含 Vue3 测试界面）

### 项目结构

```
crowdin-http/
├── client/                       # Vue3 前端应用
│   ├── public/                   # 静态资源
│   ├── src/                      # 源代码
│   │   ├── assets/               # 资源文件
│   │   ├── components/           # 组件
│   │   ├── views/                # 页面
│   │   ├── router/               # 路由
│   │   ├── stores/               # Pinia 状态管理
│   │   ├── services/             # API 服务
│   │   ├── types/                # 类型定义
│   │   ├── App.vue               # 主组件
│   │   └── main.ts               # 入口文件
│   ├── .env                      # 环境变量
│   ├── index.html                # HTML 模板
│   ├── tsconfig.json             # TypeScript 配置
│   ├── vite.config.ts            # Vite 配置
│   └── package.json              # 依赖配置
├── server/                       # Node.js 后端应用
│   ├── src/                      # 源代码
│   │   ├── config/               # 配置文件
│   │   ├── services/             # Crowdin API 服务
│   │   ├── controllers/          # API 控制器
│   │   ├── routes/               # 路由定义
│   │   ├── utils/                # 工具函数
│   │   ├── types/                # 类型定义
│   │   ├── processors/           # 数据处理器
│   │   └── index.ts              # 入口文件
│   ├── .env                      # 环境变量
│   └── tsconfig.json             # TypeScript 配置
├── .gitignore                    # Git 忽略文件
├── package.json                  # 根项目依赖
└── README.md                     # 项目说明
```

### 1. 根项目配置

**package.json**
```json
{
  "name": "crowdin-http",
  "version": "1.0.0",
  "description": "Crowdin 翻译下载工具及测试界面",
  "private": true,
  "workspaces": [
    "server",
    "client"
  ],
  "scripts": {
    "dev:server": "yarn workspace server dev",
    "dev:client": "yarn workspace client dev",
    "dev": "concurrently \"yarn dev:server\" \"yarn dev:client\"",
    "build:server": "yarn workspace server build",
    "build:client": "yarn workspace client build",
    "build": "yarn build:server && yarn build:client",
    "start": "yarn workspace server start"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**.gitignore**
```
node_modules
.env
dist
.DS_Store
*.log
coverage
```

### 2. 后端服务

#### 后端依赖配置

**server/package.json**
```json
{
  "name": "server",
  "version": "1.0.0",
  "description": "Crowdin API 服务端",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@crowdin/crowdin-api-client": "^1.42.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-async-handler": "^1.2.0",
    "helmet": "^7.1.0",
    "http-status-codes": "^2.3.0",
    "joi": "^17.11.0",
    "morgan": "^1.10.0",
    "p-limit": "^3.1.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.12.0",
    "@typescript-eslint/parser": "^6.12.0",
    "eslint": "^8.54.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.2"
  }
}
```

#### 后端应用配置

**server/tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "sourceMap": true,
    "declaration": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**server/.env.example**
```
# 服务器配置
PORT=23501
NODE_ENV=development

# Crowdin API 配置
CROWDIN_API_TOKEN=your_api_token_here
CROWDIN_ORGANIZATION=your_organization_name

# 日志级别 (debug, info, warn, error)
LOG_LEVEL=info

# 输出目录
OUTPUT_DIR=./translations
```

#### 后端核心文件

**server/src/types/index.ts**
```typescript
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
```

**server/src/config/config.ts**
```typescript
import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

dotenv.config();

// 验证环境变量
const envSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(23501),
    CROWDIN_API_TOKEN: Joi.string().required().description('Crowdin API 访问令牌'),
    CROWDIN_ORGANIZATION: Joi.string().description('Crowdin 组织名称'),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    OUTPUT_DIR: Joi.string().default('./translations')
  })
  .unknown();

const { value: envVars, error } = envSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`环境变量验证错误: ${error.message}`);
}

export default {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  crowdin: {
    token: envVars.CROWDIN_API_TOKEN,
    organization: envVars.CROWDIN_ORGANIZATION
  },
  logger: {
    level: envVars.LOG_LEVEL
  },
  outputDir: path.resolve(envVars.OUTPUT_DIR)
};
```

**server/src/utils/logger.ts**
```typescript
import winston from 'winston';
import config from '../config/config';

const logger = winston.createLogger({
  level: config.logger.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ''
          }`;
        })
      ),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

export default logger;
```

**server/src/services/crowdinService.ts**
```typescript
import { CrowdinApi } from '@crowdin/crowdin-api-client';
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
  private api: ReturnType<typeof CrowdinApi>;
  
  constructor(credentials: CrowdinCredentials = config.crowdin) {
    this.api = new CrowdinApi(credentials);
    logger.info('Crowdin服务初始化完成');
  }
  
  /**
   * 获取项目列表
   */
  async getProjects(): Promise<ProjectInfo[]> {
    try {
      logger.info('获取项目列表');
      
      const response = await this.api.projectsGroupsApi.listProjects();
      
      return response.data.map(project => ({
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
   */
  async getProjectFiles(projectId: number) {
    try {
      logger.info(`获取项目文件列表: 项目ID ${projectId}`);
      
      const response = await this.api.sourceFilesApi.listFiles(projectId);
      
      return response.data.map(file => ({
        id: file.data.id,
        name: file.data.name,
        type: file.data.type,
        path: file.data.path || '',
        directoryId: file.data.directoryId
      }));
    } catch (error) {
      logger.error(`获取项目文件列表失败: 项目ID ${projectId}`, { error });
      throw error;
    }
  }
  
  /**
   * 获取项目语言列表
   */
  async getProjectLanguages(projectId: number) {
    try {
      logger.info(`获取项目语言列表: 项目ID ${projectId}`);
      
      const project = await this.api.projectsGroupsApi.getProject(projectId);
      
      // 获取源语言和目标语言列表
      const sourceLanguageId = project.data.sourceLanguageId;
      const targetLanguageIds = project.data.targetLanguageIds || [];
      
      // 获取语言详情
      const languages = await this.api.languagesApi.listSupportedLanguages();
      
      // 筛选项目使用的语言
      const projectLanguages = languages.data
        .filter(lang => 
          lang.data.id === sourceLanguageId || 
          targetLanguageIds.includes(lang.data.id)
        )
        .map(lang => ({
          id: lang.data.id,
          name: lang.data.name,
          localeCode: lang.data.localeCode,
          isSource: lang.data.id === sourceLanguageId
        }));
      
      return projectLanguages;
    } catch (error) {
      logger.error(`获取项目语言列表失败: 项目ID ${projectId}`, { error });
      throw error;
    }
  }
  
  /**
   * 下载项目文件翻译
   */
  async downloadFileTranslation(request: FileTranslationRequest): Promise<EnhancedTranslation> {
    const { projectId, fileId, languageId } = request;
    
    try {
      logger.info(`下载文件翻译: 项目ID ${projectId}, 文件ID ${fileId}, 语言ID ${languageId}`);
      
      // 构建文件翻译
      const buildResponse = await this.api.translationsApi.buildProjectFileTranslation(
        projectId,
        fileId,
        {
          targetLanguageId: languageId
        }
      );
      
      // 获取下载链接
      const downloadUrl = buildResponse.data.url;
      logger.debug(`获取到下载链接: ${downloadUrl}`);
      
      // 下载翻译内容
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`下载失败: HTTP状态 ${response.status}`);
      }
      
      // 解析翻译数据
      const translationData = await response.json();
      
      // 处理翻译数据
      const enhancedTranslation = processTranslationData(
        translationData,
        languageId,
        projectId,
        fileId
      );
      
      // 保存到本地（可选）
      this.saveTranslationToFile(enhancedTranslation, languageId, fileId);
      
      return enhancedTranslation;
    } catch (error) {
      logger.error(`下载文件翻译失败: 项目ID ${projectId}, 文件ID ${fileId}, 语言ID ${languageId}`, { error });
      throw error;
    }
  }
  
  /**
   * 下载项目翻译 
   */
  async downloadProjectTranslation(request: ProjectTranslationRequest): Promise<{ downloadUrl: string }> {
    const { projectId, languageId } = request;
    
    try {
      logger.info(`下载项目翻译: 项目ID ${projectId}, 语言ID ${languageId}`);
      
      // 构建项目翻译
      const buildResponse = await this.api.translationsApi.buildProjectTranslation(
        projectId,
        {
          targetLanguageId: languageId
        }
      );
      
      // 获取下载链接
      const downloadUrl = buildResponse.data.url;
      logger.debug(`获取到项目下载链接: ${downloadUrl}`);
      
      // 返回下载链接（因为项目翻译通常是ZIP文件）
      return { downloadUrl };
    } catch (error) {
      logger.error(`下载项目翻译失败: 项目ID ${projectId}, 语言ID ${languageId}`, { error });
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
```

**server/src/processors/translationProcessor.ts**
```typescript
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
```

**server/src/controllers/crowdinController.ts**
```typescript
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
    
    const response: ApiResponse<null> = {
      success: false,
      error: (error as Error).message
    };
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
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
    
    const response: ApiResponse<null> = {
      success: false,
      error: (error as Error).message
    };
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
  }
};
```

**server/src/routes/crowdinRoutes.ts**
```typescript
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
```

**server/src/index.ts**
```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import config from './config/config';
import logger from './utils/logger';
import crowdinRoutes from './routes/crowdinRoutes';

// 创建Express应用
const app = express();

// 创建输出目录
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// 应用中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API路由
app.use('/api/crowdin', crowdinRoutes);

// 静态文件服务（生产环境）
if (config.env === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('未处理的错误', { error: err.message, stack: err.stack });
  
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 启动服务器
const port = config.port;
app.listen(port, () => {
  logger.info(`服务器已启动: http://localhost:${port}`);
});
```

### 3. 前端 Vue3 测试界面

#### 前端依赖配置

**client/package.json**
```json
{
  "name": "client",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "element-plus": "^2.4.2",
    "pinia": "^2.1.7",
    "vue": "^3.3.8",
    "vue-router": "^4.2.5"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@vitejs/plugin-vue": "^4.5.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.3.2",
    "unplugin-auto-import": "^0.16.7",
    "unplugin-vue-components": "^0.25.2",
    "vite": "^5.0.0",
    "vue-tsc": "^1.8.22"
  }
}
```

#### 前端应用配置

**client/tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**client/tsconfig.node.json**
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```
继续提供前端 Vue3 测试界面的配置和实现：

**client/vite.config.ts**
```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:23501',
        changeOrigin: true,
      },
    },
  },
});
```

**client/.env**
```
VITE_API_BASE_URL=http://localhost:23501/api
```

#### 前端核心文件

**client/src/types/index.ts**
```typescript
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
```

**client/src/services/api.ts**
```typescript
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
```

**client/src/stores/crowdin.ts**
```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/services/api';
import type { 
  ProjectInfo, 
  FileInfo, 
  LanguageInfo, 
  EnhancedTranslation 
} from '@/types';

export const useCrowdinStore = defineStore('crowdin', () => {
  // 状态
  const projects = ref<ProjectInfo[]>([]);
  const selectedProject = ref<ProjectInfo | null>(null);
  const files = ref<FileInfo[]>([]);
  const languages = ref<LanguageInfo[]>([]);
  const selectedFile = ref<FileInfo | null>(null);
  const selectedLanguage = ref<LanguageInfo | null>(null);
  const translation = ref<EnhancedTranslation | null>(null);
  const downloadUrl = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // getter
  const hasProject = computed(() => selectedProject.value !== null);
  const hasFile = computed(() => selectedFile.value !== null);
  const hasLanguage = computed(() => selectedLanguage.value !== null);
  const hasTranslation = computed(() => translation.value !== null);
  const hasDownloadUrl = computed(() => downloadUrl.value !== null);
  const targetLanguages = computed(() => 
    languages.value.filter(lang => !lang.isSource)
  );
  
  // 动作
  async function fetchProjects() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getProjects();
      
      if (response.success && response.data) {
        projects.value = response.data;
      } else {
        error.value = response.error || '获取项目列表失败';
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }
  
  async function fetchProjectFiles(projectId: number) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getProjectFiles(projectId);
      
      if (response.success && response.data) {
        files.value = response.data;
      } else {
        error.value = response.error || '获取项目文件列表失败';
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }
  
  async function fetchProjectLanguages(projectId: number) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getProjectLanguages(projectId);
      
      if (response.success && response.data) {
        languages.value = response.data;
      } else {
        error.value = response.error || '获取项目语言列表失败';
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }
  
  async function downloadFileTranslation() {
    if (!selectedProject.value || !selectedFile.value || !selectedLanguage.value) {
      error.value = '请选择项目、文件和语言';
      return;
    }
    
    loading.value = true;
    error.value = null;
    downloadUrl.value = null;
    translation.value = null;
    
    try {
      const response = await api.downloadFileTranslation({
        projectId: selectedProject.value.id,
        fileId: selectedFile.value.id,
        languageId: selectedLanguage.value.id
      });
      
      if (response.success && response.data) {
        translation.value = response.data;
      } else {
        error.value = response.error || '下载文件翻译失败';
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }
  
  async function downloadProjectTranslation() {
    if (!selectedProject.value || !selectedLanguage.value) {
      error.value = '请选择项目和语言';
      return;
    }
    
    loading.value = true;
    error.value = null;
    downloadUrl.value = null;
    translation.value = null;
    
    try {
      const response = await api.downloadProjectTranslation({
        projectId: selectedProject.value.id,
        languageId: selectedLanguage.value.id
      });
      
      if (response.success && response.data) {
        downloadUrl.value = response.data.downloadUrl;
      } else {
        error.value = response.error || '下载项目翻译失败';
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }
  
  function selectProject(project: ProjectInfo) {
    selectedProject.value = project;
    selectedFile.value = null;
    files.value = [];
    languages.value = [];
    translation.value = null;
    downloadUrl.value = null;
    
    // 加载项目文件和语言
    fetchProjectFiles(project.id);
    fetchProjectLanguages(project.id);
  }
  
  function selectFile(file: FileInfo) {
    selectedFile.value = file;
    translation.value = null;
  }
  
  function selectLanguage(language: LanguageInfo) {
    selectedLanguage.value = language;
    translation.value = null;
    downloadUrl.value = null;
  }
  
  function reset() {
    selectedProject.value = null;
    selectedFile.value = null;
    selectedLanguage.value = null;
    files.value = [];
    languages.value = [];
    translation.value = null;
    downloadUrl.value = null;
    error.value = null;
  }
  
  return {
    // 状态
    projects,
    selectedProject,
    files,
    languages,
    selectedFile,
    selectedLanguage,
    translation,
    downloadUrl,
    loading,
    error,
    
    // getters
    hasProject,
    hasFile,
    hasLanguage,
    hasTranslation,
    hasDownloadUrl,
    targetLanguages,
    
    // 动作
    fetchProjects,
    fetchProjectFiles,
    fetchProjectLanguages,
    downloadFileTranslation,
    downloadProjectTranslation,
    selectProject,
    selectFile,
    selectLanguage,
    reset
  };
});
```

**client/src/router/index.ts**
```typescript
import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '@/views/Dashboard.vue';
import ProjectView from '@/views/ProjectView.vue';
import TranslationView from '@/views/TranslationView.vue';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
  },
  {
    path: '/project/:id',
    name: 'Project',
    component: ProjectView,
    props: true,
  },
  {
    path: '/translation',
    name: 'Translation',
    component: TranslationView,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
```

**client/src/App.vue**
```vue
<template>
  <div class="app-container">
    <el-config-provider :locale="zhCn">
      <el-container>
        <el-header height="60px">
          <AppHeader />
        </el-header>
        <el-main>
          <router-view />
        </el-main>
        <el-footer height="40px">
          <AppFooter />
        </el-footer>
      </el-container>
    </el-config-provider>
  </div>
</template>

<script setup lang="ts">
import { zhCn } from 'element-plus/es/locale/lang/zh-cn';
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'PingFang SC', 'Helvetica Neue', Helvetica, 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.app-container {
  min-height: 100vh;
}

.el-header {
  padding: 0;
  background-color: #409EFF;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}

.el-main {
  padding: 20px;
}

.el-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  color: #909399;
  font-size: 12px;
}
</style>
```

**client/src/main.ts**
```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import router from './router';
import App from './App.vue';
import './assets/tailwind.css';

const app = createApp(App);
const pinia = createPinia();

app.use(ElementPlus);
app.use(pinia);
app.use(router);

app.mount('#app');
```

**client/src/components/AppHeader.vue**
```vue
<template>
  <div class="header-container">
    <div class="header-logo" @click="goHome">
      <img src="@/assets/logo.png" alt="Logo" class="h-8 w-auto" />
      <span class="ml-2 text-xl font-bold">Crowdin 翻译工具</span>
    </div>
    <div class="header-nav">
      <el-button type="text" @click="goHome" :class="{ active: isHome }">主页</el-button>
      <el-button type="text" @click="goTranslation" :class="{ active: isTranslation }">翻译下载</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// 计算当前路由
const isHome = computed(() => route.name === 'Dashboard');
const isTranslation = computed(() => route.name === 'Translation');

// 导航方法
function goHome() {
  router.push({ name: 'Dashboard' });
}

function goTranslation() {
  router.push({ name: 'Translation' });
}
</script>

<style scoped>
.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 20px;
}

.header-logo {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.header-nav {
  display: flex;
  gap: 16px;
}

.el-button.active {
  font-weight: bold;
  border-bottom: 2px solid white;
}

.el-button--text {
  color: white;
}
</style>
```

**client/src/components/AppFooter.vue**
```vue
<template>
  <div class="footer-container">
    Crowdin 翻译工具 &copy; {{ currentYear }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>

<style scoped>
.footer-container {
  font-size: 12px;
  color: #909399;
}
</style>
```

**client/src/views/Dashboard.vue**
```vue
<template>
  <div class="dashboard-container">
    <h1 class="text-2xl font-bold mb-6">Crowdin 翻译工具</h1>
    
    <el-card class="mb-6">
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">功能介绍</h2>
        </div>
      </template>
      <div class="card-content">
        <p class="mb-3">本工具可以帮助您方便地下载和管理 Crowdin 平台上的翻译内容。</p>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card shadow="hover" class="feature-card">
              <h3 class="text-md font-bold mb-2">项目管理</h3>
              <p>浏览和管理您的 Crowdin 项目列表</p>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="feature-card">
              <h3 class="text-md font-bold mb-2">文件翻译</h3>
              <p>下载特定文件的翻译内容并以 JSON 格式保存</p>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="feature-card">
              <h3 class="text-md font-bold mb-2">项目翻译</h3>
              <p>下载整个项目的翻译内容打包文件</p>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
    
    <el-card>
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">项目列表</h2>
          <el-button type="primary" @click="loadProjects" :loading="loading">刷新列表</el-button>
        </div>
      </template>
      <div class="card-content">
        <el-table
          v-if="projects.length > 0"
          :data="projects"
          style="width: 100%"
          stripe
          border
          v-loading="loading"
        >
          <el-table-column prop="id" label="项目 ID" width="100" />
          <el-table-column prop="name" label="项目名称" />
          <el-table-column prop="identifier" label="标识符" width="150" />
          <el-table-column prop="sourceLanguageId" label="源语言" width="120" />
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewProject(row)">查看</el-button>
              <el-button type="success" size="small" @click="goToTranslation(row)">翻译</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else-if="!loading" description="暂无项目数据" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCrowdinStore } from '@/stores/crowdin';
import type { ProjectInfo } from '@/types';

const router = useRouter();
const crowdinStore = useCrowdinStore();

const { 
  projects, 
  loading, 
  error, 
  fetchProjects, 
  selectProject 
} = crowdinStore;

// 加载项目列表
async function loadProjects() {
  await fetchProjects();
  
  if (error) {
    ElMessage.error(error);
  }
}

// 查看项目详情
function viewProject(project: ProjectInfo) {
  router.push({ 
    name: 'Project', 
    params: { id: project.id } 
  });
}

// 前往翻译页面
function goToTranslation(project: ProjectInfo) {
  selectProject(project);
  router.push({ name: 'Translation' });
}

// 组件挂载时加载项目列表
onMounted(() => {
  loadProjects();
});
</script>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feature-card {
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
```

**client/src/views/ProjectView.vue**
```vue
<template>
  <div class="project-view-container">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>
    
    <template v-else-if="hasProject">
      <div class="project-header">
        <el-page-header @back="goBack" :title="selectedProject?.name">
          <template #content>
            <span class="text-lg font-medium">项目详情</span>
          </template>
        </el-page-header>
      </div>
      
      <el-divider />
      
      <el-descriptions title="项目信息" :column="2" border>
        <el-descriptions-item label="项目 ID">{{ selectedProject?.id }}</el-descriptions-item>
        <el-descriptions-item label="标识符">{{ selectedProject?.identifier }}</el-descriptions-item>
        <el-descriptions-item label="源语言">{{ selectedProject?.sourceLanguageId }}</el-descriptions-item>
        <el-descriptions-item label="目标语言">
          {{ selectedProject?.targetLanguageIds.join(', ') }}
        </el-descriptions-item>
        <el-descriptions-item label="公开状态">
          <el-tag :type="selectedProject?.public ? 'success' : 'info'">
            {{ selectedProject?.public ? '公开' : '私有' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">
          {{ selectedProject?.description || '无描述' }}
        </el-descriptions-item>
      </el-descriptions>
      
      <div class="mt-6">
        <el-tabs>
          <el-tab-pane label="文件列表">
            <el-table 
              :data="files" 
              style="width: 100%" 
              v-loading="loading"
              border
            >
              <el-table-column prop="id" label="ID" width="100" />
              <el-table-column prop="name" label="文件名" />
              <el-table-column prop="type" label="类型" width="100" />
              <el-table-column prop="path" label="路径" />
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="goToFileTranslation(row)"
                  >
                    翻译
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="语言列表">
            <el-table 
              :data="languages" 
              style="width: 100%" 
              v-loading="loading"
              border
            >
              <el-table-column prop="id" label="语言 ID" width="150" />
              <el-table-column prop="name" label="语言名称" />
              <el-table-column prop="localeCode" label="区域代码" width="120" />
              <el-table-column prop="isSource" label="源语言" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.isSource ? 'success' : 'info'">
                    {{ row.isSource ? '是' : '否' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
    
    <el-result 
      v-else
      icon="error"
      title="未找到项目"
      sub-title="无法加载项目信息，请返回首页重试"
    >
      <template #extra>
        <el-button type="primary" @click="goHome">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCrowdinStore } from '@/stores/crowdin';
import type { FileInfo } from '@/types';

const router = useRouter();
const route = useRoute();
const crowdinStore = useCrowdinStore();

const { 
  projects, 
  selectedProject, 
  files, 
  languages, 
  loading, 
  hasProject,
  fetchProjects, 
  fetchProjectFiles, 
  fetchProjectLanguages,
  selectProject,
  selectFile
} = crowdinStore;

// 获取路由中的项目ID
const projectId = Number(route.params.id);

// 加载项目详情
async function loadProjectDetails() {
  // 如果没有项目列表，先获取项目列表
  if (projects.length === 0) {
    await fetchProjects();
  }
  
  // 查找当前项目
  const project = projects.find(p => p.id === projectId);
  
  if (project) {
    selectProject(project);
  }
}

// 跳转到文件翻译页面
function goToFileTranslation(file: FileInfo) {
  selectFile(file);
  router.push({ name: 'Translation' });
}

// 返回上一页
function goBack() {
  router.go(-1);
}

// 返回首页
function goHome() {
  router.push({ name: 'Dashboard' });
}

// 监听路由参数变化
watch(() => route.params.id, (newId) => {
  if (newId && Number(newId) !== selectedProject?.id) {
    loadProjectDetails();
  }
});

// 组件挂载时加载项目详情
onMounted(() => {
  loadProjectDetails();
});
</script>

<style scoped>
.project-view-container {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-container {
  padding: 20px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>
```

**client/src/views/TranslationView.vue**
```vue
<template>
  <div class="translation-view-container">
    <h1 class="text-2xl font-bold mb-6">翻译下载</h1>
    
    <el-card class="mb-6">
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">翻译配置</h2>
        </div>
      </template>
      
      <el-form label-width="100px" label-position="left">
        <el-form-item label="项目">
          <el-select 
            v-model="selectedProjectId" 
            placeholder="请选择项目" 
            filterable 
            @change="handleProjectChange"
            style="width: 100%"
          >
            <el-option 
              v-for="project in projects" 
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="语言">
          <el-select 
            v-model="selectedLanguageId" 
            placeholder="请选择语言" 
            filterable 
            :disabled="!selectedProject"
            @change="handleLanguageChange"
            style="width: 100%"
          >
            <el-option 
              v-for="language in targetLanguages" 
              :key="language.id"
              :label="`${language.name} (${language.id})`"
              :value="language.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="文件">
          <el-select 
            v-model="selectedFileId" 
            placeholder="请选择文件（可选）" 
            filt
            v-model="selectedFileId" 
            placeholder="请选择文件（可选）" 
            filterable 
            clearable
            :disabled="!selectedProject"
            @change="handleFileChange"
            style="width: 100%"
          >
            <el-option 
              v-for="file in files" 
              :key="file.id"
              :label="`${file.name} (${file.type})`"
              :value="file.id"
            />
          </el-select>
          <div class="mt-2 text-gray-500 text-sm">
            选择文件将下载单个文件翻译，不选择将下载整个项目翻译
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            :disabled="!canDownload"
            :loading="loading"
            @click="handleDownload"
          >
            下载翻译
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card v-if="error" class="mb-6 error-card">
      <template #header>
        <div class="card-header text-red-500">
          <h2 class="text-lg font-medium">错误信息</h2>
        </div>
      </template>
      <div class="error-message">{{ error }}</div>
    </el-card>
    
    <!-- 下载链接卡片 -->
    <el-card v-if="downloadUrl" class="mb-6">
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">项目翻译下载链接</h2>
        </div>
      </template>
      <div class="download-link-container">
        <p class="mb-3">项目翻译文件已准备就绪，请点击下面的链接下载：</p>
        <el-link type="primary" :href="downloadUrl" target="_blank">
          下载翻译文件 <el-icon><Download /></el-icon>
        </el-link>
        <div class="mt-3 text-gray-500">
          <el-alert type="warning" :closable="false">
            注意：此下载链接有有效期限制，请尽快下载
          </el-alert>
        </div>
      </div>
    </el-card>
    
    <!-- 翻译内容预览卡片 -->
    <el-card v-if="translation" class="mb-6">
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">翻译内容预览</h2>
          <el-button type="primary" @click="handleSaveJson" size="small">
            保存为JSON文件
          </el-button>
        </div>
      </template>
      <div class="translation-preview">
        <el-tabs>
          <el-tab-pane label="元数据">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="下载时间">
                {{ formatDate(translation.metadata.downloadedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="语言代码">
                {{ translation.metadata.languageCode }}
              </el-descriptions-item>
              <el-descriptions-item label="项目ID">
                {{ translation.metadata.projectId }}
              </el-descriptions-item>
              <el-descriptions-item v-if="translation.metadata.fileId" label="文件ID">
                {{ translation.metadata.fileId }}
              </el-descriptions-item>
              <el-descriptions-item label="版本">
                {{ translation.metadata.version }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          
          <el-tab-pane label="内容">
            <pre class="json-preview">{{ formatJson(translation.content) }}</pre>
          </el-tab-pane>
          
          <el-tab-pane label="原始数据">
            <pre class="json-preview">{{ formatJson(translation.original) }}</pre>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { Download } from '@element-plus/icons-vue';
import { useCrowdinStore } from '@/stores/crowdin';
import type { ProjectInfo, FileInfo, LanguageInfo } from '@/types';

const crowdinStore = useCrowdinStore();

const { 
  projects, 
  selectedProject, 
  files, 
  languages, 
  selectedFile, 
  selectedLanguage, 
  translation,
  downloadUrl,
  loading, 
  error, 
  targetLanguages,
  fetchProjects,
  selectProject,
  selectFile,
  selectLanguage,
  downloadFileTranslation,
  downloadProjectTranslation,
  reset
} = crowdinStore;

// 本地状态
const selectedProjectId = ref<number | null>(null);
const selectedLanguageId = ref<string | null>(null);
const selectedFileId = ref<number | null>(null);

// 计算属性
const canDownload = computed(() => {
  return selectedProjectId.value && selectedLanguageId.value;
});

// 方法
async function init() {
  if (projects.length === 0) {
    await fetchProjects();
  }
  
  // 如果已经选择了项目，更新本地状态
  if (selectedProject.value) {
    selectedProjectId.value = selectedProject.value.id;
  }
  
  // 如果已经选择了语言，更新本地状态
  if (selectedLanguage.value) {
    selectedLanguageId.value = selectedLanguage.value.id;
  }
  
  // 如果已经选择了文件，更新本地状态
  if (selectedFile.value) {
    selectedFileId.value = selectedFile.value.id;
  }
}

function handleProjectChange(projectId: number) {
  const project = projects.find(p => p.id === projectId);
  if (project) {
    selectProject(project);
    selectedLanguageId.value = null;
    selectedFileId.value = null;
  }
}

function handleLanguageChange(languageId: string) {
  const language = languages.find(l => l.id === languageId);
  if (language) {
    selectLanguage(language);
  }
}

function handleFileChange(fileId: number | null) {
  if (fileId) {
    const file = files.find(f => f.id === fileId);
    if (file) {
      selectFile(file);
    }
  } else {
    // 清除文件选择
    selectedFile.value = null;
  }
}

async function handleDownload() {
  if (!selectedProjectId.value || !selectedLanguageId.value) {
    ElMessage.warning('请选择项目和语言');
    return;
  }
  
  if (selectedFileId.value) {
    // 下载文件翻译
    await downloadFileTranslation();
  } else {
    // 下载项目翻译
    await downloadProjectTranslation();
  }
  
  if (error.value) {
    ElMessage.error(error.value);
  } else if (translation.value || downloadUrl.value) {
    ElMessage.success('翻译下载成功');
  }
}

function resetForm() {
  selectedProjectId.value = null;
  selectedLanguageId.value = null;
  selectedFileId.value = null;
  reset();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN');
}

function formatJson(json: Record<string, any>): string {
  return JSON.stringify(json, null, 2);
}

function handleSaveJson() {
  if (!translation.value) return;
  
  // 创建下载链接
  const jsonString = JSON.stringify(translation.value, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // 创建下载元素
  const a = document.createElement('a');
  a.href = url;
  
  // 生成文件名
  const fileName = selectedFile.value 
    ? `translation_${selectedLanguage.value?.id}_file_${selectedFile.value.id}.json`
    : `translation_${selectedLanguage.value?.id}.json`;
  
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
  
  ElMessage.success('JSON文件已保存');
}

// 初始化
onMounted(() => {
  init();
});
</script>

<style scoped>
.translation-view-container {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.json-preview {
  background-color: #f8f9fa;
  padding: 16px;
  border-radius: 4px;
  overflow: auto;
  max-height: 400px;
  font-family: 'Courier New', Courier, monospace;
  white-space: pre-wrap;
}

.error-card {
  border-color: #f56c6c;
}

.error-message {
  color: #f56c6c;
  font-weight: bold;
}

.download-link-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}
</style>
```

**client/index.html**
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Crowdin 翻译工具</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**client/src/assets/tailwind.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**client/tailwind.config.js**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**client/postcss.config.js**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 4. 项目启动说明

**README.md**
```markdown
# Crowdin 翻译下载工具

## 项目介绍

这是一个用于从 Crowdin 平台下载已翻译内容的工具，支持通过 API 获取项目、文件和语言列表，并下载特定文件或整个项目的翻译内容。

## 主要特性

- 以 JSON 格式保存翻译数据
- 使用环境变量管理配置，避免硬编码敏感信息
- 批量下载和异步处理，适用于大型项目
- 完善的错误处理和日志记录
- Vue3 构建的 Web 测试界面，方便接口测试

## 项目结构

- `server`: 后端 Node.js 应用，提供 API 服务
- `client`: 前端 Vue3 应用，提供测试界面

## 技术栈

### 后端
- Node.js + Express
- TypeScript
- Crowdin API 客户端
- Winston (日志管理)

### 前端
- Vue 3
- TypeScript
- Pinia (状态管理)
- Vue Router
- Element Plus (UI 组件库)
- Tailwind CSS (样式)

## 快速开始

### 环境要求

- Node.js 14+
- Yarn 包管理器

### 安装依赖

```bash
# 安装所有依赖
yarn install
```

### 配置环境变量

1. 在 `server` 目录下，复制 `.env.example` 文件为 `.env`
2. 填写 Crowdin API 令牌和其他必要配置

```
# 服务器配置
PORT=23501
NODE_ENV=development

# Crowdin API 配置
CROWDIN_API_TOKEN=your_api_token_here
CROWDIN_ORGANIZATION=your_organization_name  # 如果是企业版

# 日志级别 (debug, info, warn, error)
LOG_LEVEL=info

# 输出目录
OUTPUT_DIR=./translations
```

### 开发模式

```bash
# 启动前端和后端开发服务
yarn dev

# 只启动后端
yarn dev:server

# 只启动前端
yarn dev:client
```

### 生产构建

```bash
# 构建前端和后端
yarn build

# 启动生产服务器
yarn start
```

## API 文档

### 获取项目列表

```
GET /api/crowdin/projects
```

### 获取项目文件列表

```
GET /api/crowdin/projects/:projectId/files
```

### 获取项目语言列表

```
GET /api/crowdin/projects/:projectId/languages
```

### 下载文件翻译

```
POST /api/crowdin/translations/file
```

请求体:
```json
{
  "projectId": 123,
  "fileId": 456,
  "languageId": "zh-CN"
}
```

### 下载项目翻译

```
POST /api/crowdin/translations/project
```

请求体:
```json
{
  "projectId": 123,
  "languageId": "zh-CN"
}
```

## 注意事项

- 翻译内容会以 JSON 格式保存，包含元数据和内容
- 不使用缓存机制，确保每次都获取最新翻译
- 项目翻译通常以 ZIP 格式下载，提供下载链接
- 文件翻译直接返回 JSON 数据
```

## 使用说明

1. 在 `server/.env` 中填写您的 Crowdin API 访问令牌和项目 ID
2. 使用 `yarn install` 安装所有依赖
3. 使用 `yarn dev` 同时启动前端和后端服务
4. 访问 http://localhost:5173 打开测试界面
5. 通过界面可以浏览项目、文件和语言列表，并下载翻译内容

## 项目优势

1. **完整的前后端解决方案**：提供了全面的翻译下载工具，包括后端 API 和前端测试界面
2. **基于 Vue3 和 TypeScript**：使用现代前端技术栈，提供类型安全和高性能体验
3. **用户友好的界面**：直观的 UI 设计，使翻译下载操作更加简单
4. **灵活的配置**：通过环境变量管理配置，安全且可扩展
5. **全面的错误处理**：完善的错误捕获和日志记录，便于调试和跟踪问题
6. **数据处理能力**：支持在保存翻译数据前进行自定义处理和增强

这个完整的方案不仅能够满足您下载 Crowdin 平台翻译内容的需求，还提供了一个直观的 Web 界面来测试和使用各种 API 功能。使用 yarn 进行包依赖管理，确保项目的依赖关系清晰可控。
