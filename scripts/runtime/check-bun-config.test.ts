import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'runtime', 'check-bun-config.cjs');

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bun-config-check-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root: string, relativePath: string, contents: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
};

const runScript = (cwd: string) =>
  spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });

describe('Bun config check', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes when bunfig.toml keeps the hoisted linker', () => {
    const root = createTempRoot();
    writeFile(root, 'bunfig.toml', '[install]\nlinker = "hoisted"\n');

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('bunfig.toml keeps Bun on the hoisted install layout');
  });

  it('passes when bunfig.toml uses single quotes for the hoisted linker', () => {
    const root = createTempRoot();
    writeFile(root, "bunfig.toml", "[install]\nlinker = 'hoisted'\n");

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('bunfig.toml keeps Bun on the hoisted install layout');
  });

  it('passes when the install section contains comments and extra settings', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'bunfig.toml',
      ['[install]', '# keep Bun aligned with npm-style hoisting', 'optional = true', 'linker = "hoisted"', ''].join(
        '\n'
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('bunfig.toml keeps Bun on the hoisted install layout');
  });

  it('passes when the install section is followed by another TOML section', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'bunfig.toml',
      ['[install]', 'linker = "hoisted"', '', '[workspace]', 'cache = true', ''].join('\n')
    );

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('bunfig.toml keeps Bun on the hoisted install layout');
  });

  it('passes when the install section appears after another TOML section', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'bunfig.toml',
      ['[workspace]', 'cache = true', '', '[install]', 'linker = "hoisted"', ''].join('\n')
    );

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('bunfig.toml keeps Bun on the hoisted install layout');
  });

  it('fails when bunfig.toml is missing', () => {
    const root = createTempRoot();

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required bunfig.toml');
  });

  it('fails when bunfig.toml does not declare an install section', () => {
    const root = createTempRoot();
    writeFile(root, 'bunfig.toml', '[workspace]\ncache = true\n');

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must declare an [install] section');
  });

  it('fails when the install linker is missing', () => {
    const root = createTempRoot();
    writeFile(root, 'bunfig.toml', '[install]\noptional = true\n');

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must declare linker = "hoisted"');
  });

  it('fails when linker = "hoisted" exists outside the install section', () => {
    const root = createTempRoot();
    writeFile(root, 'bunfig.toml', '[install]\noptional = true\n\n[workspace]\nlinker = "hoisted"\n');

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must declare linker = "hoisted"');
  });

  it('fails when the linker drifts from hoisted', () => {
    const root = createTempRoot();
    writeFile(root, 'bunfig.toml', '[install]\nlinker = "isolated"\n');

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must stay "hoisted"');
  });
});
