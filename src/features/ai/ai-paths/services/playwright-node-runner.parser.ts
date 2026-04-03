import vm from 'vm';

export const safeStringify = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch (error) {
    return '[unserializable]';
  }
};

export const parseUserScript = (
  source: string,
  logs: string[]
): ((context: Record<string, unknown>) => Promise<unknown>) => {
  const normalizedSource = source.replace(/^\s*export\s+default\s+/m, 'const defaultExport = ');
  const bootstrap = `
    "use strict";
    let __playwrightNodeFn = null;
    const module = { exports: {} };
    const exports = module.exports;
    ${normalizedSource}
    if (typeof run === 'function') __playwrightNodeFn = run;
    if (!__playwrightNodeFn && typeof defaultExport === 'function') __playwrightNodeFn = defaultExport;
    if (!__playwrightNodeFn && typeof module.exports === 'function') __playwrightNodeFn = module.exports;
    if (!__playwrightNodeFn && module.exports && typeof module.exports.default === 'function') __playwrightNodeFn = module.exports.default;
    if (!__playwrightNodeFn && exports && typeof exports.default === 'function') __playwrightNodeFn = exports.default;
    __playwrightNodeFn;
  `;
  const script = new vm.Script(bootstrap, {
    filename: 'ai-paths-playwright-node.user.js',
  });
  const sandbox = {
    console: {
      log: (...args: unknown[]) => logs.push(`[console.log] ${args.map(safeStringify).join(' ')}`),
      info: (...args: unknown[]) =>
        logs.push(`[console.info] ${args.map(safeStringify).join(' ')}`),
      warn: (...args: unknown[]) =>
        logs.push(`[console.warn] ${args.map(safeStringify).join(' ')}`),
      error: (...args: unknown[]) =>
        logs.push(`[console.error] ${args.map(safeStringify).join(' ')}`),
    },
    setTimeout,
    clearTimeout,
    URL,
    TextEncoder,
    TextDecoder,
  };
  const resolved: unknown = script.runInNewContext(sandbox, { timeout: 250 });
  if (typeof resolved !== 'function') {
    throw new Error('Playwright script must export a default async function or define `run`.');
  }
  return resolved as (context: Record<string, unknown>) => Promise<unknown>;
};

