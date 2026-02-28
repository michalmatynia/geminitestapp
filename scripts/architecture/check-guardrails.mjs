import fs from 'node:fs/promises';
import path from 'node:path';

import { collectMetrics } from './lib-metrics.mjs';

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const baselinePath = path.join(root, 'scripts', 'architecture', 'guardrails-baseline.json');

const toSnapshot = (metrics) => ({
  'source.filesOver1000': metrics.source.filesOver1000,
  'source.filesOver1500': metrics.source.filesOver1500,
  'source.useClientFiles': metrics.source.useClientFiles,
  'source.largestFileLines': metrics.source.largestFile?.lines ?? 0,
  'api.totalRoutes': metrics.api.totalRoutes,
  'api.delegatedServerRoutes': metrics.api.delegatedServerRoutes,
  'api.routesWithoutApiHandler': metrics.api.routesWithoutApiHandler,
  'api.routesWithoutExplicitCachePolicy': metrics.api.routesWithoutExplicitCachePolicy,
  'imports.appFeatureBarrelImports': metrics.imports.appFeatureBarrelImports,
  'imports.appFeatureDeepImports': metrics.imports.appFeatureDeepImports,
  'imports.sharedToFeaturesTotalImports': metrics.imports.sharedToFeaturesTotalImports,
  'architecture.crossFeatureEdgePairs': metrics.architecture.crossFeatureEdgePairs,
  'runtime.setIntervalOccurrences': metrics.runtime.setIntervalOccurrences,
});

const printRow = (label, current, max, status) => {
  const paddedLabel = label.padEnd(44, ' ');
  const currentText = String(current).padStart(8, ' ');
  const maxText = String(max).padStart(8, ' ');
  console.log(`${status.padEnd(6, ' ')} ${paddedLabel} current=${currentText} max=${maxText}`);
};

const informationalKeys = new Set(['api.delegatedServerRoutes']);

const readBaseline = async () => {
  const raw = await fs.readFile(baselinePath, 'utf8');
  return JSON.parse(raw);
};

const writeBaseline = async (snapshot) => {
  const payload = {
    generatedAt: new Date().toISOString(),
    hardLimits: {
      sourceLargestFileLines: 4000,
    },
    max: snapshot,
  };
  await fs.writeFile(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const run = async () => {
  const metrics = await collectMetrics({ root });
  const snapshot = toSnapshot(metrics);

  if (args.has('--update-baseline')) {
    await writeBaseline(snapshot);
    console.log(`Updated ${path.relative(root, baselinePath)}`);
    return;
  }

  let baseline;
  try {
    baseline = await readBaseline();
  } catch {
    console.error(
      'Guardrail baseline is missing. Run: node scripts/architecture/check-guardrails.mjs --update-baseline'
    );
    process.exit(1);
    return;
  }

  const maxByKey = baseline.max ?? {};
  let failed = false;

  console.log('Guardrail comparison against baseline');
  console.log(`Baseline generated at: ${baseline.generatedAt ?? 'unknown'}`);

  for (const key of Object.keys(maxByKey).sort()) {
    const current = snapshot[key] ?? 0;
    const max = maxByKey[key];
    if (typeof max !== 'number') {
      printRow(key, current, 'n/a', 'WARN');
      continue;
    }

    if (informationalKeys.has(key)) {
      printRow(key, current, max, 'INFO');
      continue;
    }

    if (current > max) {
      failed = true;
      printRow(key, current, max, 'FAIL');
    } else {
      printRow(key, current, max, 'OK');
    }
  }

  const hardMaxLargestFile = Number(baseline.hardLimits?.sourceLargestFileLines ?? 4000);
  const currentLargest = snapshot['source.largestFileLines'] ?? 0;
  if (currentLargest > hardMaxLargestFile) {
    failed = true;
    printRow('source.largestFileLines (hard limit)', currentLargest, hardMaxLargestFile, 'FAIL');
  } else {
    printRow('source.largestFileLines (hard limit)', currentLargest, hardMaxLargestFile, 'OK');
  }

  if (failed) {
    console.error('Guardrail check failed: one or more metrics exceeded baseline thresholds.');
    process.exit(1);
  }

  console.log('Guardrail check passed.');
};

run().catch((error) => {
  console.error('[guardrails] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
