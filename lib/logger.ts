import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create log directory:', err);
  }
}

function formatMessage(level: LogLevel, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
}

function writeToFile(message: string) {
  try {
    fs.appendFileSync(LOG_FILE, message);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

export const logger = {
  log: (...args: unknown[]) => {
    console.log("[LOG]", ...args);
    writeToFile(formatMessage('info', args));
  },
  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
    writeToFile(formatMessage('error', args));
  },
  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
    writeToFile(formatMessage('warn', args));
  },
  info: (...args: unknown[]) => {
    console.info("[INFO]", ...args);
    writeToFile(formatMessage('info', args));
  },
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.debug("[DEBUG]", ...args);
      writeToFile(formatMessage('debug', args));
    }
  },
};