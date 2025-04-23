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