/**
 * Log capture utility for detailed export operation logging
 * Intercepts console.log/warn/error to capture detailed export operation logs
 */

export interface CapturedLog {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
}

export class LogCapture {
  private logs: CapturedLog[] = [];
  private originalLog: typeof console.log;
  private originalWarn: typeof console.warn;
  private originalError: typeof console.error;

  constructor() {
    this.originalLog = console.log;
    this.originalWarn = console.warn;
    this.originalError = console.error;
  }

  start() {
    // Override console methods to capture logs
    console.log = (...args: unknown[]) => {
      this.captureLog("info", args);
      this.originalLog(...args);
    };

    console.warn = (...args: unknown[]) => {
      this.captureLog("warn", args);
      this.originalWarn(...args);
    };

    console.error = (...args: unknown[]) => {
      this.captureLog("error", args);
      this.originalError(...args);
    };
  }

  stop() {
    // Restore original console methods
    console.log = this.originalLog;
    console.warn = this.originalWarn;
    console.error = this.originalError;
  }

  private captureLog(level: "info" | "warn" | "error", args: unknown[]) {
    if (args.length === 0) return;

    const timestamp = new Date().toISOString();
    const firstArg = args[0];

    // Extract message and context from arguments
    let message = "";
    let context: Record<string, unknown> | undefined;

    if (typeof firstArg === "string") {
      message = firstArg;
      // If there are additional arguments (context objects), combine them
      if (args.length > 1) {
        context = {};
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (typeof arg === "object" && arg !== null) {
            context = { ...context, ...(arg as Record<string, unknown>) };
          }
        }
      }
    } else if (typeof firstArg === "object") {
      // If first argument is an object, use it as context
      message = "Log data";
      context = firstArg as Record<string, unknown>;
    } else {
      message = String(firstArg);
    }

    this.logs.push({
      timestamp,
      level,
      message,
      context,
    });
  }

  getLogs(): CapturedLog[] {
    return [...this.logs]; // Return a copy
  }

  clearLogs() {
    this.logs = [];
  }

  getFilteredLogs(level?: "info" | "warn" | "error"): CapturedLog[] {
    if (!level) return this.getLogs();
    return this.logs.filter((log) => log.level === level);
  }

  exportAsJSON() {
    return JSON.stringify(this.logs, null, 2);
  }

  exportAsText() {
    return this.logs
      .map((log) => {
        const contextStr = log.context
          ? `\n  ${JSON.stringify(log.context)}`
          : "";
        return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${contextStr}`;
      })
      .join("\n");
  }
}
