/**
 * Simple logger utility to provide a consistent interface for logging.
 * This can be expanded to log to external services or files if needed.
 */

type LogLevel = "info" | "warn" | "error" | "log";

const formatMessage = (level: LogLevel, message: string) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.info(formatMessage("info", message), ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(formatMessage("warn", message), ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(formatMessage("error", message), ...args);
  },
  log: (message: string, ...args: any[]) => {
    console.log(formatMessage("log", message), ...args);
  },
};
