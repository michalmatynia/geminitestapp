import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const parityScript = path.join(repoRoot, 'scripts', 'quality', 'check-external-rule-parity.mjs');

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'external-rule-parity-cli-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root: string, relativeFile: string, contents: string): void => {
  const absolutePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
};

describe('check-external-rule-parity CLI', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('prints usage information with --help', () => {
    const root = createTempRoot();

    const result = spawnSync(process.execPath, [parityScript, '--help'], {
      cwd: root,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('External Rule Parity');
    expect(result.stdout).toContain('--rule=<normalized-rule-id>');
    expect(result.stdout).toContain('--external-rule=<name-fragment>');
    expect(result.stdout).toContain('--list-rules');
  });

  it('prints the normalized rule catalog with --list-rules', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'scripts/quality/config/external-rule-map.json',
      `${JSON.stringify(
        {
          version: 1,
          generatedAt: '2026-04-04',
          source: 'test manifest',
          statuses: ['implemented', 'eslint', 'scanner', 'waived'],
          rules: [
            {
              normalizedRuleId: 'open-redirects',
              status: 'implemented',
              severity: 'error',
              ownerScanner: 'quality/external-rule-parity',
              sourceScannerRuleId: 'open-redirects',
              externalRuleNames: ['Avoid Open Redirect Vulnerabilities in Express Redirects'],
              rationale: 'custom parity detector',
            },
            {
              normalizedRuleId: 'legacy-syntax-bans',
              status: 'waived',
              severity: 'info',
              ownerScanner: 'waiver',
              sourceScannerRuleId: null,
              externalRuleNames: ['Disallow async-await syntax'],
              rationale: 'legacy rule',
            },
          ],
        },
        null,
        2
      )}\n`
    );

    const result = spawnSync(process.execPath, [parityScript, '--list-rules'], {
      cwd: root,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('External Rule Parity Rule Catalog');
    expect(result.stdout).toContain('| open-redirects | implemented | error | quality/external-rule-parity | open-redirects | Avoid Open Redirect Vulnerabilities in Express Redirects |');
    expect(result.stdout).toContain('| legacy-syntax-bans | waived | info | waiver | - | Disallow async-await syntax |');
    expect(result.stdout).toContain('Use `--rule=<normalized-rule-id>` or `--external-rule=<name-fragment>`');
  });

  it('filters the rule catalog by manifest status', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'scripts/quality/config/external-rule-map.json',
      `${JSON.stringify(
        {
          version: 1,
          generatedAt: '2026-04-04',
          source: 'test manifest',
          statuses: ['implemented', 'eslint', 'scanner', 'waived'],
          rules: [
            {
              normalizedRuleId: 'open-redirects',
              status: 'implemented',
              severity: 'error',
              ownerScanner: 'quality/external-rule-parity',
              sourceScannerRuleId: 'open-redirects',
              externalRuleNames: ['Avoid Open Redirect Vulnerabilities in Express Redirects'],
              rationale: 'custom parity detector',
            },
            {
              normalizedRuleId: 'legacy-syntax-bans',
              status: 'waived',
              severity: 'info',
              ownerScanner: 'waiver',
              sourceScannerRuleId: null,
              externalRuleNames: ['Disallow async-await syntax'],
              rationale: 'legacy rule',
            },
          ],
        },
        null,
        2
      )}\n`
    );

    const result = spawnSync(
      process.execPath,
      [parityScript, '--list-rules', '--catalog-status=implemented'],
      {
        cwd: root,
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Catalog status filters: implemented');
    expect(result.stdout).toContain('| open-redirects | implemented | error | quality/external-rule-parity | open-redirects |');
    expect(result.stdout).not.toContain('legacy-syntax-bans');
  });

  it('resolves external rule name filters into normalized local rule ids', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'scripts/quality/config/external-rule-map.json',
      `${JSON.stringify(
        {
          version: 1,
          generatedAt: '2026-04-04',
          source: 'test manifest',
          statuses: ['implemented', 'eslint', 'scanner', 'waived'],
          rules: [
            {
              normalizedRuleId: 'open-redirects',
              status: 'implemented',
              severity: 'error',
              ownerScanner: 'quality/external-rule-parity',
              sourceScannerRuleId: 'open-redirects',
              externalRuleNames: ['Avoid Open Redirect Vulnerabilities in Express Redirects'],
              rationale: 'custom parity detector',
            },
          ],
        },
        null,
        2
      )}\n`
    );
    writeFile(
      root,
      'src/redirects.ts',
      [
        'export function unsafeRedirect(nextUrl: string) {',
        '  return Response.redirect(nextUrl);',
        '}',
        '',
      ].join('\n')
    );

    const result = spawnSync(
      process.execPath,
      [
        parityScript,
        '--summary-json',
        '--no-write',
        '--external-rule=Open Redirect',
      ],
      {
        cwd: root,
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary.total).toBe(1);
    expect(payload.details.filters).toEqual({
      rules: ['open-redirects'],
      externalRules: ['Open Redirect'],
      paths: [],
      severities: [],
    });
    expect(payload.details.externalRuleResolution).toEqual([
      expect.objectContaining({
        filter: 'Open Redirect',
        matchCount: 1,
        matches: [
          expect.objectContaining({
            normalizedRuleId: 'open-redirects',
            status: 'implemented',
            sourceRuleId: 'open-redirects',
          }),
        ],
      }),
    ]);
    expect(payload.details.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'open-redirects',
          file: 'src/redirects.ts',
        }),
      ])
    );
  });

  it('reports waived matches when an external rule filter resolves to a waived rule family', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'scripts/quality/config/external-rule-map.json',
      `${JSON.stringify(
        {
          version: 1,
          generatedAt: '2026-04-04',
          source: 'test manifest',
          statuses: ['implemented', 'eslint', 'scanner', 'waived'],
          rules: [
            {
              normalizedRuleId: 'legacy-syntax-bans',
              status: 'waived',
              severity: 'info',
              ownerScanner: 'waiver',
              sourceScannerRuleId: null,
              externalRuleNames: ['Disallow async-await syntax'],
              rationale: 'legacy rule',
            },
          ],
        },
        null,
        2
      )}\n`
    );

    const result = spawnSync(
      process.execPath,
      [
        parityScript,
        '--summary-json',
        '--no-write',
        '--external-rule=async-await',
      ],
      {
        cwd: root,
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary.total).toBe(0);
    expect(payload.details.filters).toEqual({
      rules: ['legacy-syntax-bans'],
      externalRules: ['async-await'],
      paths: [],
      severities: [],
    });
    expect(payload.details.externalRuleResolution).toEqual([
      expect.objectContaining({
        filter: 'async-await',
        matchCount: 1,
        matches: [
          expect.objectContaining({
            normalizedRuleId: 'legacy-syntax-bans',
            status: 'waived',
            sourceRuleId: null,
          }),
        ],
      }),
    ]);
  });

  it('suggests nearby external rule names for unmatched external filters', () => {
    const root = createTempRoot();
    writeFile(
      root,
      'scripts/quality/config/external-rule-map.json',
      `${JSON.stringify(
        {
          version: 1,
          generatedAt: '2026-04-04',
          source: 'test manifest',
          statuses: ['implemented', 'eslint', 'scanner', 'waived'],
          rules: [
            {
              normalizedRuleId: 'open-redirects',
              status: 'implemented',
              severity: 'error',
              ownerScanner: 'quality/external-rule-parity',
              sourceScannerRuleId: 'open-redirects',
              externalRuleNames: ['Avoid Open Redirect Vulnerabilities in Express Redirects'],
              rationale: 'custom parity detector',
            },
          ],
        },
        null,
        2
      )}\n`
    );

    const result = spawnSync(
      process.execPath,
      [parityScript, '--external-rule=Open Redirects'],
      {
        cwd: root,
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unmatched external rule filters:');
    expect(result.stderr).toContain('- Open Redirects');
    expect(result.stderr).toContain('Avoid Open Redirect Vulnerabilities in Express Redirects');
  });
});
