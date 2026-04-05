import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeExternalRuleParity } from './lib/check-external-rule-parity.mjs';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'external-rule-parity-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root: string, relativeFile: string, contents: string): void => {
  const absolutePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
};

const writeJson = (root: string, relativeFile: string, payload: unknown): void => {
  writeFile(root, relativeFile, `${JSON.stringify(payload, null, 2)}\n`);
};

describe('analyzeExternalRuleParity', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('translates implemented security-static rules through the normalization manifest', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'dangerouslysetinnerhtml-review',
          status: 'implemented',
          severity: 'warn',
          ownerScanner: 'quality/security-static',
          sourceScannerRuleId: 'dangerouslysetinnerhtml-review',
          externalRuleNames: [
            'Avoid Using dangerouslySetInnerHTML in React',
            'Detect usage of dangerouslySetInnerHTML with non-constant definitions',
          ],
          rationale: 'covered by security-static',
        },
        {
          normalizedRuleId: 'medium-cyclomatic-complexity',
          status: 'eslint',
          severity: 'warn',
          ownerScanner: 'eslint',
          sourceScannerRuleId: 'complexity',
          externalRuleNames: ['Enforce Medium Cyclomatic Complexity Threshold'],
          rationale: 'eslint native',
        },
        {
          normalizedRuleId: 'legacy-syntax-bans',
          status: 'waived',
          severity: 'info',
          ownerScanner: 'waiver',
          sourceScannerRuleId: null,
          externalRuleNames: [
            'Disallow async-await syntax',
            'Disallow async-await syntax',
          ],
          rationale: 'legacy rule',
        },
      ],
    });
    writeFile(
      root,
      'src/ui.tsx',
      'export function Html({ value }: { value: string }) { return <div dangerouslySetInnerHTML={{ __html: value }} />; }\n'
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.warningCount).toBe(1);
    expect(report.summary.implementedRuleCount).toBe(1);
    expect(report.summary.waivedRuleCount).toBe(1);
    expect(report.summary.normalizedRuleCount).toBe(3);
    expect(report.summary.externalRuleCount).toBe(5);
    expect(report.summary.duplicateExternalRuleNameCount).toBe(1);
    expect(report.manifest.statusCounts).toEqual(
      expect.objectContaining({
        implemented: 1,
        eslint: 1,
        scanner: 0,
        waived: 1,
      })
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'dangerouslysetinnerhtml-review',
          severity: 'warn',
          file: 'src/ui.tsx',
        }),
      ])
    );
    expect(report.analyzers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scannerId: 'quality/security-static',
          translatedIssueCount: 1,
        }),
      ])
    );
    expect(report.waivedCoverage).toEqual({
      waivedRuleCount: 1,
      rules: [
        expect.objectContaining({
          normalizedRuleId: 'legacy-syntax-bans',
          severity: 'info',
          rationale: 'legacy rule',
          externalRuleNames: [
            'Disallow async-await syntax',
            'Disallow async-await syntax',
          ],
        }),
      ],
    });
  });

  it('reports implemented rules that are not wired to a local analyzer', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'hardcoded-passwords',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/custom-passwords',
          sourceScannerRuleId: 'hardcoded-passwords',
          externalRuleNames: ['Avoid Hardcoded Passwords'],
          rationale: 'not wired yet',
        },
      ],
    });

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.total).toBe(0);
    expect(report.implementedCoverage.unwiredRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedRuleId: 'hardcoded-passwords',
          ownerScanner: 'quality/custom-passwords',
        }),
      ])
    );
  });

  it('supports local rule/path/severity filters for parity issues', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'weak-randomness',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'weak-rng',
          externalRuleNames: ['Avoid Use of Cryptographically Weak Random Number Generators'],
          rationale: 'custom parity detector',
        },
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
    });
    writeFile(
      root,
      'src/alpha.ts',
      [
        'export function unsafeRedirect(nextUrl: string) {',
        '  return Response.redirect(nextUrl);',
        '}',
        '',
      ].join('\n')
    );
    writeFile(
      root,
      'src/beta.ts',
      [
        'export function weak() {',
        '  return Math.random();',
        '}',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({
      root,
      env: {
        EXTERNAL_RULE_PARITY_RULES: 'open-redirects',
        EXTERNAL_RULE_PARITY_PATHS: 'src/alpha',
        EXTERNAL_RULE_PARITY_SEVERITIES: 'error',
      },
    });

    expect(report.filters).toEqual({
      rules: ['open-redirects'],
      externalRules: [],
      paths: ['src/alpha'],
      severities: ['error'],
    });
    expect(report.summary.total).toBe(1);
    expect(report.issues).toEqual([
      expect.objectContaining({
        ruleId: 'open-redirects',
        file: 'src/alpha.ts',
      }),
    ]);
    expect(report.analyzers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scannerId: 'quality/external-rule-parity',
          fileCount: 1,
        }),
      ])
    );
  });

  it('reports ESLint parity coverage for configured and pending manifest rules', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'medium-cyclomatic-complexity',
          status: 'eslint',
          severity: 'warn',
          ownerScanner: 'eslint',
          sourceScannerRuleId: 'complexity',
          externalRuleNames: ['Enforce Medium Cyclomatic Complexity Threshold'],
          rationale: 'eslint native',
        },
        {
          normalizedRuleId: 'no-top-level-await',
          status: 'eslint',
          severity: 'warn',
          ownerScanner: 'eslint',
          sourceScannerRuleId: 'no-top-level-await',
          externalRuleNames: ['Disallow Top-Level Await'],
          rationale: 'eslint native',
        },
        {
          normalizedRuleId: 'trailing-comma-ban',
          status: 'eslint',
          severity: 'warn',
          ownerScanner: 'eslint',
          sourceScannerRuleId: 'comma-dangle',
          externalRuleNames: ['Disallow Trailing Commas in Array and Object Literals'],
          rationale: 'eslint native',
        },
        {
          normalizedRuleId: 'no-sync-methods',
          status: 'eslint',
          severity: 'warn',
          ownerScanner: 'eslint',
          sourceScannerRuleId: 'no-sync',
          externalRuleNames: ['Disallow synchronous methods'],
          rationale: 'eslint native',
        },
      ],
    });

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.eslintRuleCount).toBe(4);
    expect(report.summary.coveredEslintRuleCount).toBe(4);
    expect(report.summary.pendingEslintRuleCount).toBe(0);
    expect(report.eslintCoverage.statusCounts).toEqual({
      configured: 2,
      'configured-via-alias': 2,
      pending: 0,
    });
    expect(report.eslintCoverage.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedRuleId: 'medium-cyclomatic-complexity',
          sourceRuleId: 'complexity',
          localStatus: 'configured',
          localRuleId: 'complexity',
        }),
        expect.objectContaining({
          normalizedRuleId: 'no-top-level-await',
          sourceRuleId: 'no-top-level-await',
          localStatus: 'configured-via-alias',
          localRuleId: 'no-restricted-syntax',
        }),
        expect.objectContaining({
          normalizedRuleId: 'trailing-comma-ban',
          sourceRuleId: 'comma-dangle',
          localStatus: 'configured',
          localRuleId: 'comma-dangle',
        }),
        expect.objectContaining({
          normalizedRuleId: 'no-sync-methods',
          sourceRuleId: 'no-sync',
          localStatus: 'configured-via-alias',
          localRuleId: 'no-restricted-syntax',
        }),
      ])
    );
  });

  it('detects scanner-only parity rules implemented locally', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'import-resolution',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'import-resolution',
          externalRuleNames: ['Enforce Import Resolution'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'filesystem-path-taint',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'filesystem-path-taint',
          externalRuleNames: ['Avoid Using Non-Literal User Input for File System Paths'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'hardcoded-passwords',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'hardcoded-passwords',
          externalRuleNames: ['Avoid Hardcoded Passwords'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'weak-randomness',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'weak-rng',
          externalRuleNames: ['Avoid Use of Cryptographically Weak Random Number Generators'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'nosql-findone-injection',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'nosql-findone-injection',
          externalRuleNames: ['Avoid NoSQL Injection via Untrusted Input in findOne()'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'html-and-innerhtml-xss-sinks',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'html-and-innerhtml-xss-sinks',
          externalRuleNames: ['Avoid assigning user-controlled data to innerHTML'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'ssrf-user-controlled-urls',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'ssrf-user-controlled-urls',
          externalRuleNames: ['Avoid Server-Side Request Forgery (SSRF) by Validating User-Controlled URLs'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'regex-safety-and-dynamic-input',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'regex-safety-and-dynamic-input',
          externalRuleNames: ['Avoid Using Non-Literal Values in RegExp Constructor'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'timing-attack-comparisons',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'timing-attack-comparisons',
          externalRuleNames: ['Avoid Timing Attack Vulnerabilities in String Comparisons'],
          rationale: 'custom parity detector',
        },
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
    });
    writeFile(
      root,
      'src/demo.ts',
      [
        'import { readFileSync } from \'node:fs\';',
        'import path from \'path\';',
        'import missing from \'./missing-module\';',
        '',
        'const adminPassword = \'supersecret42\';',
        'const userPath = inputPath;',
        'readFileSync(userPath, \'utf8\');',
        'Math.random();',
        'await fetch(webhookUrl);',
        'collection.findOne(makeQuery(id));',
        'new RegExp(userPattern, flags);',
        'if (expectedNonce !== statePayload.nonce) throw new Error(\'bad nonce\');',
        'window.location.assign(returnUrl);',
        'container.innerHTML = html;',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.errorCount).toBe(10);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'import-resolution', file: 'src/demo.ts' }),
        expect.objectContaining({ ruleId: 'filesystem-path-taint', file: 'src/demo.ts' }),
        expect.objectContaining({ ruleId: 'hardcoded-passwords', file: 'src/demo.ts' }),
        expect.objectContaining({ ruleId: 'weak-randomness', file: 'src/demo.ts' }),
        expect.objectContaining({ ruleId: 'nosql-findone-injection', file: 'src/demo.ts' }),
        expect.objectContaining({ ruleId: 'html-and-innerhtml-xss-sinks', file: 'src/demo.ts' }),
        expect.objectContaining({ ruleId: 'ssrf-user-controlled-urls', file: 'src/demo.ts' }),
        expect.objectContaining({ ruleId: 'regex-safety-and-dynamic-input', file: 'src/demo.ts' }),
        expect.objectContaining({ ruleId: 'timing-attack-comparisons', file: 'src/demo.ts' }),
        expect.objectContaining({ ruleId: 'open-redirects', file: 'src/demo.ts' }),
      ])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'import-resolution', snippet: 'path' }),
      ])
    );
    expect(report.analyzers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scannerId: 'quality/external-rule-parity',
          translatedIssueCount: 10,
        }),
      ])
    );
  });

  it('allows repo-style safe helper wrappers for urls and mongo filters', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'nosql-findone-injection',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'nosql-findone-injection',
          externalRuleNames: ['Avoid NoSQL Injection via Untrusted Input in findOne()'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'ssrf-user-controlled-urls',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'ssrf-user-controlled-urls',
          externalRuleNames: ['Avoid Server-Side Request Forgery (SSRF) by Validating User-Controlled URLs'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'regex-safety-and-dynamic-input',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'regex-safety-and-dynamic-input',
          externalRuleNames: ['Avoid Using Non-Literal Values in RegExp Constructor'],
          rationale: 'custom parity detector',
        },
        {
          normalizedRuleId: 'timing-attack-comparisons',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'timing-attack-comparisons',
          externalRuleNames: ['Avoid Timing Attack Vulnerabilities in String Comparisons'],
          rationale: 'custom parity detector',
        },
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
    });
    writeFile(
      root,
      'src/safe.ts',
      [
        'const API_BASE_URL = \'https://example.com\';',
        'const buildLookupFilter = (id: string) => ({ id });',
        'const resolveServiceUrl = (service: string) => `${API_BASE_URL}/${service}`;',
        'const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\\]\\\\]/g, \'\\\\$&\');',
        'const prepareLoginHref = (returnPath: string) => `/auth/signin?returnTo=${encodeURIComponent(returnPath)}`;',
        'const revealRequest = { nonce: \'a\' };',
        'const lastHandledRevealNonceRef = { current: \'b\' };',
        'async function run(collection: { findOne: (query: unknown) => Promise<unknown> }, service: string) {',
        '  await collection.findOne(buildLookupFilter(service));',
        '  await fetch(resolveServiceUrl(service));',
        '  if (revealRequest.nonce === lastHandledRevealNonceRef.current) return null;',
        '  window.location.assign(prepareLoginHref(`/${service}`));',
        '  return new RegExp(`^${escapeRegex(service)}$`, \'i\');',
        '}',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it('flags non-obvious redirect sinks but allows relative and helper-built redirects', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
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
    });
    writeFile(
      root,
      'src/redirects.ts',
      [
        'const toErrorRedirect = (origin: string, reason: string) => {',
        '  const url = new URL(\'/admin\', origin);',
        '  url.searchParams.set(\'reason\', reason);',
        '  return url.toString();',
        '};',
        'export function unsafeRedirect(nextUrl: string, returnUrl: string, requestUrl: URL) {',
        '  Response.redirect(nextUrl);',
        '  window.location.assign(returnUrl);',
        '  Response.redirect(new URL(\'/auth/signin\', requestUrl).toString());',
        '  return Response.redirect(toErrorRedirect(requestUrl.origin, \'denied\'));',
        '}',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.errorCount).toBe(2);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'open-redirects',
          file: 'src/redirects.ts',
          snippet: 'nextUrl',
        }),
        expect.objectContaining({
          ruleId: 'open-redirects',
          file: 'src/redirects.ts',
          snippet: 'returnUrl',
        }),
      ])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          snippet: 'new URL(\'/auth/signin\', requestUrl).toString()',
        }),
        expect.objectContaining({
          snippet: 'toErrorRedirect(requestUrl.origin, \'denied\')',
        }),
      ])
    );
  });

  it('flags direct equality on expected/provided secret-like values but ignores generic nonce comparisons', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'timing-attack-comparisons',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'timing-attack-comparisons',
          externalRuleNames: ['Avoid Timing Attack Vulnerabilities in String Comparisons'],
          rationale: 'custom parity detector',
        },
      ],
    });
    writeFile(
      root,
      'src/server.ts',
      [
        'export function verify(expectedNonce: string, statePayload: { nonce: string }, providedDigest: string, expectedDigest: string) {',
        '  if (expectedNonce !== statePayload.nonce) return false;',
        '  return providedDigest === expectedDigest;',
        '}',
        'const revealRequest = { nonce: \'a\' };',
        'const lastHandledRevealNonceRef = { current: \'b\' };',
        'if (revealRequest.nonce === lastHandledRevealNonceRef.current) {',
        '  console.log(\'ignore\');',
        '}',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.errorCount).toBe(2);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'timing-attack-comparisons',
          file: 'src/server.ts',
          snippet: 'expectedNonce !== statePayload.nonce',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              leftSensitiveNames: expect.arrayContaining(['expectedNonce']),
              rightSensitiveNames: expect.arrayContaining(['nonce']),
            }),
          }),
        }),
        expect.objectContaining({
          ruleId: 'timing-attack-comparisons',
          file: 'src/server.ts',
          snippet: 'providedDigest === expectedDigest',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              leftSensitiveNames: expect.arrayContaining(['providedDigest']),
              rightSensitiveNames: expect.arrayContaining(['expectedDigest']),
            }),
          }),
        }),
      ])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          snippet: 'revealRequest.nonce === lastHandledRevealNonceRef.current',
        }),
      ])
    );
  });

  it('flags non-atomic assignments that suspend across await', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'no-atomic-updates',
          status: 'implemented',
          severity: 'warn',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'no-atomic-updates',
          externalRuleNames: ['Require atomic updates'],
          rationale: 'custom parity detector',
        },
      ],
    });
    writeFile(
      root,
      'src/atomic.ts',
      [
        'async function loadIncrement() {',
        '  return 1;',
        '}',
        'async function readForm(req: { formData: () => Promise<unknown> }, formData: unknown) {',
        '  formData = await req.formData();',
        '  return formData;',
        '}',
        'export async function unsafeUpdates(state: { count: number }, total: number) {',
        '  total += await loadIncrement();',
        '  state.count = state.count + await loadIncrement();',
        '  const nextCount = state.count + (await loadIncrement());',
        '  state.count = nextCount;',
        '  return { state, total };',
        '}',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.warningCount).toBe(2);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'no-atomic-updates',
          file: 'src/atomic.ts',
          snippet: 'total += await loadIncrement()',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              mode: 'compound-assignment',
              target: 'total',
            }),
          }),
        }),
        expect.objectContaining({
          ruleId: 'no-atomic-updates',
          file: 'src/atomic.ts',
          snippet: 'state.count = state.count + await loadIncrement()',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              mode: 'simple-assignment',
              target: 'state.count',
            }),
          }),
        }),
      ])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          snippet: 'state.count = nextCount',
        }),
        expect.objectContaining({
          snippet: 'formData = await req.formData()',
        }),
      ])
    );
  });

  it('flags unsafe dynamic object writes and method calls but ignores guarded loop copies', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'unsafe-dynamic-object-access',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'unsafe-dynamic-object-access',
          externalRuleNames: [
            'Avoid Using Unsafe Dynamic Method Calls',
            'Detect Object Injection',
            'Detect Prototype Pollution via Loop',
          ],
          rationale: 'custom parity detector',
        },
      ],
    });
    writeFile(
      root,
      'src/dynamic.ts',
      [
        'export function unsafeAccess(target: Record<string, unknown>, source: Record<string, unknown>, methodName: string, fieldName: string) {',
        '  api[methodName]();',
        '  for (const key in source) {',
        '    Object.assign(target, { [key]: source[key] });',
        '  }',
        '}',
        'export function safeCopy(target: Record<string, unknown>, source: Record<string, unknown>) {',
        '  PAGE_CONTENT_FRAGMENT_BUILDERS[STATIC_PAGE_ID]();',
        '  for (const key in source) {',
        '    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;',
        '    target[key] = source[key];',
        '  }',
        '}',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.errorCount).toBe(2);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'unsafe-dynamic-object-access',
          file: 'src/dynamic.ts',
          snippet: 'api[methodName]()',
        }),
        expect.objectContaining({
          ruleId: 'unsafe-dynamic-object-access',
          file: 'src/dynamic.ts',
          snippet: 'Object.assign(target, { [key]: source[key] })',
        }),
      ])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          snippet: 'target[fieldName] = source[fieldName]',
        }),
        expect.objectContaining({
          snippet: 'PAGE_CONTENT_FRAGMENT_BUILDERS[STATIC_PAGE_ID]()',
        }),
        expect.objectContaining({
          snippet: 'target[key] = source[key]',
        }),
      ])
    );
  });

  it('flags restricted browser globals in non-client files but ignores guards and use-client files', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'browser-global-ssr-access',
          status: 'implemented',
          severity: 'error',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'browser-global-ssr-access',
          externalRuleNames: ['Disallow Access to Restricted Browser Globals During SSR'],
          rationale: 'custom parity detector',
        },
      ],
    });
    writeFile(
      root,
      'src/ssr.ts',
      [
        'export const initialUrl = window.location.href;',
        'export function runAxe(context: Element | Document = document.body) {',
        '  return context;',
        '}',
        'export const guardedUrl = typeof window === \'undefined\' ? null : window.location.href;',
        'export function guardedDocument() {',
        '  if (typeof document === \'undefined\') return null;',
        '  return document.body;',
        '}',
        '',
      ].join('\n')
    );
    writeFile(
      root,
      'src/client.tsx',
      [
        '\'use client\';',
        'export const clientUrl = window.location.href;',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.errorCount).toBe(2);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'browser-global-ssr-access',
          file: 'src/ssr.ts',
          snippet: 'window.location',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              accessKind: 'module',
              globalName: 'window',
            }),
          }),
        }),
        expect.objectContaining({
          ruleId: 'browser-global-ssr-access',
          file: 'src/ssr.ts',
          snippet: 'document.body',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              accessKind: 'default-parameter',
              globalName: 'document',
            }),
          }),
        }),
      ])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'src/ssr.ts',
          snippet: 'typeof window === \'undefined\' ? null : window.location.href',
        }),
        expect.objectContaining({
          file: 'src/client.tsx',
        }),
      ])
    );
  });

  it('flags duplicate static JSX headings but ignores dynamic heading text', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'duplicate-headings',
          status: 'implemented',
          severity: 'warn',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'duplicate-headings',
          externalRuleNames: ['Avoid Multiple Headings with the Same Content'],
          rationale: 'custom parity detector',
        },
      ],
    });
    writeFile(
      root,
      'src/headings.tsx',
      [
        'export function Page({ title }: { title: string }) {',
        '  return (',
        '    <main>',
        '      <h1>Overview</h1>',
        '      <section>',
        '        <h2><span>Details</span></h2>',
        '        <h2> Details </h2>',
        '        <h3>{title}</h3>',
        '        <h3>{title}</h3>',
        '      </section>',
        '    </main>',
        '  );',
        '}',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.warningCount).toBe(1);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'duplicate-headings',
          file: 'src/headings.tsx',
          snippet: 'Details',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              headingText: 'Details',
              firstOccurrenceLine: 6,
            }),
          }),
        }),
      ])
    );
  });

  it('flags third-party workflow actions not pinned to a full commit sha', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'github-actions-full-sha',
          status: 'implemented',
          severity: 'warn',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'github-actions-full-sha',
          externalRuleNames: ['Enforce Pinning of Third-Party GitHub Actions to Full Commit SHA'],
          rationale: 'custom parity detector',
        },
      ],
    });
    writeFile(
      root,
      '.github/workflows/ci.yml',
      [
        'name: CI',
        'on: push',
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - uses: actions/checkout@v4',
        '      - uses: github/codeql-action/init@v4',
        '      - uses: oven-sh/setup-bun@v2',
        '      - uses: owner/reusable-action@1234567890abcdef1234567890abcdef12345678',
        '      - uses: ./.github/actions/local-check',
        '      - uses: docker://alpine:3.20',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.warningCount).toBe(1);
    expect(report.issues).toEqual([
      expect.objectContaining({
        severity: 'warn',
        ruleId: 'github-actions-full-sha',
        file: '.github/workflows/ci.yml',
        line: 9,
        snippet: 'oven-sh/setup-bun@v2',
        context: expect.objectContaining({
          sourceContext: expect.objectContaining({
            actionRef: 'oven-sh/setup-bun',
            versionRef: 'v2',
          }),
        }),
      }),
    ]);
  });

  it('flags JSDoc imports for undeclared packages but ignores declared and local imports', async () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'parity-test',
      private: true,
      dependencies: {
        react: '^19.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    });
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'jsdoc-import-dependency-consistency',
          status: 'implemented',
          severity: 'warn',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'jsdoc-import-dependency-consistency',
          externalRuleNames: ['Enforce JSDoc imports correspond to listed dependencies'],
          rationale: 'custom parity detector',
        },
      ],
    });
    writeFile(
      root,
      'src/jsdoc.ts',
      [
        '/**',
        ' * @typedef {import(\'missing-package\').Widget} MissingWidget',
        ' * @typedef {import(\'react\').ReactNode} ReactNode',
        ' * @typedef {import(\'./local\').LocalThing} LocalThing',
        ' */',
        'export const value = 1;',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.warningCount).toBe(1);
    expect(report.issues).toEqual([
      expect.objectContaining({
        severity: 'warn',
        ruleId: 'jsdoc-import-dependency-consistency',
        file: 'src/jsdoc.ts',
        line: 2,
        snippet: 'import(\'missing-package\')',
        context: expect.objectContaining({
          sourceContext: expect.objectContaining({
            importSpecifier: 'missing-package',
            packageName: 'missing-package',
          }),
        }),
      }),
    ]);
  });

  it('flags obsolete presentation attributes on intrinsic JSX elements but ignores custom component props', async () => {
    const root = createTempRoot();
    writeJson(root, 'scripts/quality/config/external-rule-map.json', {
      version: 1,
      generatedAt: '2026-04-04',
      source: 'test manifest',
      statuses: ['implemented', 'eslint', 'scanner', 'waived'],
      rules: [
        {
          normalizedRuleId: 'css-scss-compatibility-rules',
          status: 'implemented',
          severity: 'warn',
          ownerScanner: 'quality/external-rule-parity',
          sourceScannerRuleId: 'css-scss-compatibility-rules',
          externalRuleNames: ['Disallow Use of Obsolete HTML Attributes'],
          rationale: 'custom parity detector',
        },
      ],
    });
    writeFile(
      root,
      'src/obsolete-html.tsx',
      [
        'function Box(props: { align: string }) {',
        '  return <section>{props.align}</section>;',
        '}',
        '',
        'export function Demo() {',
        '  return (',
        '    <div align="center">',
        '      <table cellPadding="0">',
        '        <tbody>',
        '          <tr valign="top"><td>Cell</td></tr>',
        '        </tbody>',
        '      </table>',
        '      <Box align="start" />',
        '    </div>',
        '  );',
        '}',
        '',
      ].join('\n')
    );

    const report = await analyzeExternalRuleParity({ root });

    expect(report.summary.warningCount).toBe(3);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'css-scss-compatibility-rules',
          file: 'src/obsolete-html.tsx',
          snippet: 'div[align]',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              attributeName: 'align',
              tagName: 'div',
            }),
          }),
        }),
        expect.objectContaining({
          ruleId: 'css-scss-compatibility-rules',
          file: 'src/obsolete-html.tsx',
          snippet: 'table[cellPadding]',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              attributeName: 'cellPadding',
              tagName: 'table',
            }),
          }),
        }),
        expect.objectContaining({
          ruleId: 'css-scss-compatibility-rules',
          file: 'src/obsolete-html.tsx',
          snippet: 'tr[valign]',
          context: expect.objectContaining({
            sourceContext: expect.objectContaining({
              attributeName: 'valign',
              tagName: 'tr',
            }),
          }),
        }),
      ])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          snippet: 'Box[align]',
        }),
      ])
    );
  });
});
