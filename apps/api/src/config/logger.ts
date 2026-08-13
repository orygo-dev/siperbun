import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.isDev ? 'debug' : 'info',
  transport: env.isDev
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
