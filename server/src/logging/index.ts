import { config } from '../config/index.js';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

function shouldLog(level: keyof typeof LEVELS): boolean {
  return LEVELS[level] >= LEVELS[config.logging.level];
}

function ts(): string {
  return new Date().toISOString();
}

export const log = {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      console.debug(`[${ts()}] DEBUG ${msg}`, meta ? JSON.stringify(meta) : '');
    }
  },

  info(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('info')) {
      console.info(`[${ts()}] INFO  ${msg}`, meta ? JSON.stringify(meta) : '');
    }
  },

  warn(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      console.warn(`[${ts()}] WARN  ${msg}`, meta ? JSON.stringify(meta) : '');
    }
  },

  error(msg: string, err?: unknown, meta?: Record<string, unknown>) {
    if (shouldLog('error')) {
      const errInfo = err instanceof Error
        ? { name: err.name, message: err.message }
        : { raw: String(err) };
      console.error(`[${ts()}] ERROR ${msg}`, JSON.stringify({ ...errInfo, ...meta }));
    }
  },
};
