import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'runtime', 'check-node-version.cjs');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');
const expectedNodeVersion = fs.readFileSync(path.join(repoRoot, '.nvmrc'), 'utf8').trim();
const nonLtsNodeVersionMajor = expectedNodeVersion === '23' ? '21' : '23';

class ExitSignal extends Error {
  code: number;

  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

const runScript = ({
  nodeVersion,
  processVersion,
  nvmrc = `${expectedNodeVersion}\n`,
  env = {},
}: {
  nodeVersion: string;
  processVersion: string;
  nvmrc?: string | null;
  env?: Record<string, string>;
}) => {
  const errors: string[] = [];
  const warns: string[] = [];

  const context = {
    __dirname: path.dirname(scriptPath),
    console: {
      error: (...args: unknown[]) => errors.push(args.join(' ')),
      warn: (...args: unknown[]) => warns.push(args.join(' ')),
    },
    process: {
      env,
      exit: (code: number) => {
        throw new ExitSignal(code);
      },
      version: processVersion,
      versions: {
        node: nodeVersion,
      },
    },
    require: (moduleId: string) => {
      if (moduleId === 'node:fs') {
        return {
          readFileSync: (filePath: string, encoding: BufferEncoding) => {
            if (path.basename(filePath) === '.nvmrc') {
              if (nvmrc === null) {
                throw new Error('missing .nvmrc');
              }

              return nvmrc;
            }

            return fs.readFileSync(filePath, encoding);
          },
        };
      }

      if (moduleId === 'node:path') {
        return path;
      }

      throw new Error(`Unexpected require: ${moduleId}`);
    },
  };

  try {
    vm.runInNewContext(scriptSource, context, { filename: scriptPath });
    return { exitCode: 0, errors, warns };
  } catch (error) {
    if (error instanceof ExitSignal) {
      return { exitCode: error.code, errors, warns };
    }

    throw error;
  }
};

describe('Node version preflight', () => {
  it('rejects Node releases older than the supported baseline', () => {
    const result = runScript({
      nodeVersion: '19.9.0',
      processVersion: 'v19.9.0',
    });

    expect(result.exitCode).toBe(1);
    expect(result.errors[0]).toContain('is too old. Use Node 20.9+');
    expect(result.errors[0]).toContain(`recommended: Node ${expectedNodeVersion} LTS`);
  });

  it('falls back to a generic repo-pinned label for too-old Node when .nvmrc cannot be read', () => {
    const result = runScript({
      nodeVersion: '19.9.0',
      processVersion: 'v19.9.0',
      nvmrc: null,
    });

    expect(result.exitCode).toBe(1);
    expect(result.errors[0]).toContain('is too old. Use Node 20.9+');
    expect(result.errors[0]).toContain('recommended: the repo-pinned Node LTS release');
  });

  it('uses the pinned .nvmrc major in the unsupported-node error', () => {
    const result = runScript({
      nodeVersion: '24.1.0',
      processVersion: 'v24.1.0',
      nvmrc: `${expectedNodeVersion}\n`,
    });

    expect(result.exitCode).toBe(1);
    expect(result.errors[0]).toContain(`Switch to Node ${expectedNodeVersion} LTS`);
    expect(result.errors[0]).toContain(`nvm use ${expectedNodeVersion}`);
  });

  it('accepts a leading "v" in .nvmrc when building the preferred Node hint', () => {
    const result = runScript({
      nodeVersion: '24.1.0',
      processVersion: 'v24.1.0',
      nvmrc: `v${expectedNodeVersion}\n`,
    });

    expect(result.exitCode).toBe(1);
    expect(result.errors[0]).toContain(`Switch to Node ${expectedNodeVersion} LTS`);
    expect(result.errors[0]).toContain(`nvm use ${expectedNodeVersion}`);
  });

  it('allows unsupported Node in dev mode when explicitly overridden', () => {
    const result = runScript({
      nodeVersion: '24.1.0',
      processVersion: 'v24.1.0',
      env: {
        ALLOW_UNSUPPORTED_NODE_DEV: '1',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.warns[0]).toContain(`Switch to Node ${expectedNodeVersion} LTS`);
    expect(result.warns[0]).toContain('Continuing because ALLOW_UNSUPPORTED_NODE_DEV=1');
  });

  it('uses the pinned .nvmrc major in the non-LTS warning', () => {
    const result = runScript({
      nodeVersion: `${nonLtsNodeVersionMajor}.5.0`,
      processVersion: `v${nonLtsNodeVersionMajor}.5.0`,
      nvmrc: `${expectedNodeVersion}\n`,
    });

    expect(result.exitCode).toBe(0);
    expect(result.warns[0]).toContain(`For better stability use Node ${expectedNodeVersion} LTS`);
  });

  it('does not warn for a non-LTS Node version when it matches the pinned major', () => {
    const result = runScript({
      nodeVersion: `${nonLtsNodeVersionMajor}.5.0`,
      processVersion: `v${nonLtsNodeVersionMajor}.5.0`,
      nvmrc: `${nonLtsNodeVersionMajor}\n`,
    });

    expect(result.exitCode).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.warns).toEqual([]);
  });

  it('falls back to a generic repo-pinned message when .nvmrc cannot be read', () => {
    const result = runScript({
      nodeVersion: '24.1.0',
      processVersion: 'v24.1.0',
      nvmrc: null,
    });

    expect(result.exitCode).toBe(1);
    expect(result.errors[0]).toContain('Switch to the repo-pinned Node LTS release.');
  });

  it('falls back to a generic repo-pinned message when .nvmrc is invalid', () => {
    const result = runScript({
      nodeVersion: '24.1.0',
      processVersion: 'v24.1.0',
      nvmrc: 'lts/*\n',
    });

    expect(result.exitCode).toBe(1);
    expect(result.errors[0]).toContain('Switch to the repo-pinned Node LTS release.');
  });

  it('fails fast when process.versions.node cannot be parsed', () => {
    const result = runScript({
      nodeVersion: 'invalid',
      processVersion: 'vinvalid',
    });

    expect(result.exitCode).toBe(1);
    expect(result.errors[0]).toContain('Unable to parse Node version');
  });
});
