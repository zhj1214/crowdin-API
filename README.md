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

1. 在 `server` 目录下，复制 `env.example` 文件为 `.env`
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

## 使用说明

1. 在 `server/.env` 中填写您的 Crowdin API 访问令牌和项目 ID
2. 使用 `yarn install` 安装所有依赖
3. 使用 `yarn dev` 同时启动前端和后端服务
4. 访问 http://localhost:5173 打开测试界面
5. 通过界面可以浏览项目、文件和语言列表，并下载翻译内容 