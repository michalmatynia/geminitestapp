import vm from 'vm';

export const safeStringify = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return '[unserializable]';
  }
};

const buildBootstrap = (normalizedSource: string): string => `
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

const buildSandbox = (logs: string[]): Record<string, unknown> => ({
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
});

const toPlaywrightScriptParseError = (
  error: unknown,
  mode: 'direct' | 'wrapped'
): Error => {
  if (error instanceof SyntaxError) {
    const prefix =
      mode === 'wrapped'
        ? 'Invalid Playwright script syntax after function-body wrapping'
        : 'Invalid Playwright script syntax';
    const normalized = new SyntaxError(`${prefix}: ${error.message}`);
    normalized.stack = error.stack;
    return normalized;
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`Invalid Playwright script: ${safeStringify(error)}`);
};

export const validatePlaywrightNodeScript = (
  source: string
):
  | { ok: true; logs: string[] }
  | { ok: false; logs: string[]; error: Error } => {
  const logs: string[] = [];

  try {
    parseUserScript(source, logs);
    return {
      ok: true,
      logs,
    };
  } catch (error) {
    return {
      ok: false,
      logs,
      error: error instanceof Error ? error : new Error(safeStringify(error)),
    };
  }
};

export const parseUserScript = (
  source: string,
  logs: string[]
): ((context: Record<string, unknown>) => Promise<unknown>) => {
  const normalizedSource = source
    .replace(/^\s*export\s+default\s+/m, 'const defaultExport = ')
    .replace(/^\s*export\s+(?!default\b)/gm, '');
  const sandbox = buildSandbox(logs);

  // Try normal compilation first
  try {
    const script = new vm.Script(buildBootstrap(normalizedSource), {
      filename: 'ai-paths-playwright-node.user.js',
    });
    const resolved: unknown = script.runInNewContext(sandbox, { timeout: 250 });
    if (typeof resolved === 'function') {
      return resolved as (context: Record<string, unknown>) => Promise<unknown>;
    }
    // Script compiled and ran but didn't produce a function — not recoverable.
    throw new Error('Playwright script must export a default async function or define `run`.');
  } catch (error: unknown) {
    // If the script has a bare `return` (function body without wrapping function),
    // wrap it in an async function and retry.
    const isBareReturnError =
      error instanceof SyntaxError &&
      /(unexpected token ['"]?return['"]?|illegal return statement)/i.test(error.message);
    if (!isBareReturnError) {
      throw toPlaywrightScriptParseError(error, 'direct');
    }
    logs.push('[parser] Script contains bare return — wrapping in async function.');
  }

  // Retry: wrap the source in an async function (handles bare function bodies)
  const wrappedSource = `async function run(context) {\nconst { page, input, emit, artifacts, log, helpers, runtime } = context;\n${normalizedSource}\n}`;
  let resolved: unknown;
  try {
    const wrappedScript = new vm.Script(buildBootstrap(wrappedSource), {
      filename: 'ai-paths-playwright-node.user.js',
    });
    resolved = wrappedScript.runInNewContext(buildSandbox(logs), { timeout: 250 });
  } catch (error) {
    throw toPlaywrightScriptParseError(error, 'wrapped');
  }
  if (typeof resolved !== 'function') {
    throw new Error('Playwright script must export a default async function or define `run`.');
  }
  return resolved as (context: Record<string, unknown>) => Promise<unknown>;
};
