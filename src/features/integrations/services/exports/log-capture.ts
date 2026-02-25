import type { CapturedLog } from '@/shared/contracts/integrations';

export type { CapturedLog };

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

  start(): void {
    // Override console methods to capture logs
    console.log = (...args: unknown[]): void => {
      this.captureLog('info', args);
      this.originalLog(...args);
    };

    console.warn = (...args: unknown[]): void => {
      this.captureLog('warn', args);
      this.originalWarn(...args);
    };

    console.error = (...args: unknown[]): void => {
      this.captureLog('error', args);
      this.originalError(...args);
    };
  }

  stop(): void {
    // Restore original console methods
    console.log = this.originalLog;
    console.warn = this.originalWarn;
    console.error = this.originalError;
  }

  private captureLog(level: 'info' | 'warn' | 'error', args: unknown[]): void {
    if (args.length === 0) return;

    const timestamp = new Date().toISOString();
    const firstArg = args[0];

    // Extract message and context from arguments
    let message: string;
    let context: Record<string, unknown> | undefined;

    if (typeof firstArg === 'string') {
      message = firstArg;
      // If there are additional arguments (context objects), combine them
      if (args.length > 1) {
        context = {};
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (typeof arg === 'object' && arg !== null) {
            context = { ...context, ...(arg as Record<string, unknown>) };
          }
        }
      }
    } else if (typeof firstArg === 'object' && firstArg !== null) {
      // If first argument is an object, use it as context
      message = 'Log data';
      context = firstArg as Record<string, unknown>;
    } else {
      message = firstArg === null ? 'null' : (typeof firstArg === 'symbol' ? firstArg.toString() : String(firstArg as unknown));
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

  clearLogs(): void {
    this.logs = [];
  }

  getFilteredLogs(level?: 'info' | 'warn' | 'error'): CapturedLog[] {
    if (!level) return this.getLogs();
    return this.logs.filter((log: CapturedLog) => log.level === level);
  }

  exportAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  exportAsText(): string {
    return this.logs
      .map((log: CapturedLog) => {
        const contextStr = log.context
          ? `\n  ${JSON.stringify(log.context)}`
          : '';
        return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${contextStr}`;
      })
      .join('\n');
  }
}
