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