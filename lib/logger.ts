export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isServer = typeof window === "undefined";
let fsModule: typeof import("fs") | null = null;
let pathModule: typeof import("path") | null = null;
let logFilePath: string | null = null;

const ensureServerLogger = () => {
  if (!isServer) return false;
  if (!fsModule || !pathModule) {
    try {
      // Avoid bundling fs/path in the client.
      const req = (0, eval)("require") as (mod: string) => unknown;
      fsModule = req("fs") as typeof import("fs");
      pathModule = req("path") as typeof import("path");
    } catch {
      return false;
    }
  }
  if (!logFilePath) {
    const logDir = pathModule.join(process.cwd(), "logs");
    logFilePath = pathModule.join(logDir, "app.log");
    if (!fsModule.existsSync(logDir)) {
      try {
        fsModule.mkdirSync(logDir, { recursive: true });
      } catch (err) {
        console.error("Failed to create log directory:", err);
      }
    }
  }
  return true;
};

function formatMessage(level: LogLevel, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return '[Complex Object]';
      }
    }
    if (typeof arg === 'symbol' || typeof arg === 'function') {
      return arg.toString();
    }
    return String(arg as string);
  }).join(' ');
  return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
}

function writeToFile(message: string) {
  if (!ensureServerLogger()) return;
  try {
    fsModule?.appendFileSync(logFilePath as string, message);
  } catch (err) {
    console.error("Failed to write to log file:", err);
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
