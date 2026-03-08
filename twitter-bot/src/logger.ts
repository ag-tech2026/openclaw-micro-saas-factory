import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { BotConfig } from './types';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'twitter-bot' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, service, ...meta }) => {
            return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          }
        )
      ),
    }),
  ],
});

const configureFileTransport = (config: BotConfig) => {
  try {
    const logDir = path.dirname(config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    logger.add(new winston.transports.File({
      filename: config.logFile,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }));
  } catch (error) {
    logger.warn('Could not configure file transport:', error);
  }
};

export const setupLogger = (config: BotConfig) => {
  logger.level = config.logLevel;
  configureFileTransport(config);
};
