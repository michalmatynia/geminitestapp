import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseScanOutput } from './lib/scan-output.mjs';

const tempRoots: string[] = [];

const repoRoot = process.cwd();
const propDrillingScriptPath = path.join(repoRoot, 'scripts', 'architecture', 'scan-prop-drilling.mjs');
const uiConsolidationScriptPath = path.join(
  repoRoot,
  'scripts',
  'architecture',
  'scan-ui-consolidation.mjs'
);
const observabilityScriptPath = path.join(
  repoRoot,
  'scripts',
  'observability',
  'check-observability.mjs'
);

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-envelope-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root: string, relativePath: string, contents: string): void => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
};

const seedArchitectureSources = (root: string): void => {
  writeFile(
    root,
    'src/features/demo/Parent.tsx',
    'export function Parent({ value }: { value: string }) { return <Middle value={value} />; }\nfunction Middle({ value }: { value: string }) { return <Leaf value={value} />; }\nfunction Leaf({ value }: { value: string }) { return <div>{value}</div>; }\n'
  );
  writeFile(
    root,
    'src/features/products/SettingsPanel.tsx',
    'export function ProductSettingsPanel({ title }: { title: string }) { return <section>{title}</section>; }\n'
  );
  writeFile(
    root,
    'src/features/orders/SettingsPanel.tsx',
    'export function OrderSettingsPanel({ title }: { title: string }) { return <section>{title}</section>; }\n'
  );
};

const seedObservabilitySources = (root: string): void => {
  writeFile(
    root,
    'src/good-log.ts',
    'import { logger } from \'@/shared/utils/logger\';\nlogger.info(\'[observability.check] startup complete\');\n'
  );
};

const runSummaryJson = (
  root: string,
  scriptPath: string,
  args: string[]
) => parseScanOutput(
  execFileSync('node', [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  }),
  path.basename(scriptPath)
);

describe('scanner summary-json envelope', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('keeps architecture scanners partitioned into summary, details, paths, filters, and notes', () => {
    const root = createTempRoot();
    seedArchitectureSources(root);

    const propDrilling = runSummaryJson(root, propDrillingScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);
    const uiConsolidation = runSummaryJson(root, uiConsolidationScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);

    expect(propDrilling.scanner).toMatchObject({
      name: 'scan-prop-drilling',
      version: '1.0.0',
    });
    expect(propDrilling.summary).toMatchObject({
      componentCount: expect.any(Number),
    });
    expect(propDrilling.details).toMatchObject({
      backlog: expect.any(Array),
      transitionBacklog: expect.any(Array),
      componentBacklog: expect.any(Array),
      forwardingComponentBacklog: expect.any(Array),
      chains: expect.any(Array),
    });
    expect(propDrilling.paths).toBeNull();
    expect(propDrilling.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
    });
    expect(propDrilling.notes).toContain('prop-drilling scan result');

    expect(uiConsolidation.scanner).toMatchObject({
      name: 'scan-ui-consolidation',
      version: '1.0.0',
    });
    expect(uiConsolidation.summary).toMatchObject({
      scannedFileCount: expect.any(Number),
    });
    expect(uiConsolidation.details).toMatchObject({
      candidates: expect.any(Array),
      opportunities: expect.any(Array),
      clusterDiagnostics: expect.any(Object),
    });
    expect(uiConsolidation.paths).toBeNull();
    expect(uiConsolidation.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
    });
    expect(uiConsolidation.notes).toContain('ui consolidation scan result');
  });

  it('wraps observability summary-json output in the shared scan envelope', () => {
    const root = createTempRoot();
    seedObservabilitySources(root);

    const observability = runSummaryJson(root, observabilityScriptPath, [
      '--mode=check',
      '--allow-partial',
      '--no-runtime-log-scan',
      '--no-ci-annotations',
      '--summary-json',
    ]);

    expect(observability.scanner).toMatchObject({
      name: 'observability-check',
      version: '2',
    });
    expect(observability.status).toBe('ok');
    expect(observability.summary).toMatchObject({
      mode: 'check',
      loggerViolations: 0,
      runtimeErrors: 0,
    });
    expect(observability.details).toMatchObject({
      context: expect.any(Object),
      routeCoverage: expect.any(Object),
      violations: expect.any(Object),
      runtime: expect.objectContaining({
        disabled: true,
      }),
    });
    expect(observability.paths).toMatchObject({
      checkLog: expect.any(String),
      errorLog: null,
    });
    expect(observability.filters).toMatchObject({
      mode: 'check',
      allowPartial: true,
      scanRuntimeLogs: false,
      emitCiAnnotations: false,
    });
    expect(observability.notes).toContain('observability check scan envelope');

    const checkLogPath = path.join(root, String(observability.paths?.checkLog ?? ''));
    expect(fs.existsSync(checkLogPath)).toBe(true);
  });
});
