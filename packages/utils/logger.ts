import { getLogger } from 'log4js';

// 使用简单的 logger 配置，避免启动问题
const logger = getLogger();
logger.level = process.env.NODE_ENV === 'development' ? 'trace' : 'info';

export default logger;
