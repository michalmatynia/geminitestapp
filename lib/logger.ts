// A simple logger utility

export const logger = {
  log: (...args: unknown[]) => {
    console.log("[LOG]", ...args);
  },
  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
  },
  info: (...args: unknown[]) => {
    console.info("[INFO]", ...args);
  },
};
