import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { agenticRepoRoot, type ImpactBundle } from './domain-manifests';
import type { AgenticBundlePlan } from './bundle-plan';
import type { AgenticHistorySnapshot } from './agent-history';

export interface AgenticBundleSelection {
  kind: 'agentic-bundle-selection';
  generatedAt: string;
  planPath: string;
  previousHistoryPath: string | null;
  selectedBundles: ImpactBundle[];
  skippedBundles: Array<{
    bundle: ImpactBundle;
    reason: 'unchanged';
  }>;
}

function dedupe<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function sameTargets(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const normalizedLeft = [...left].sort((a, b) => a.localeCompare(b));
  const normalizedRight = [...right].sort((a, b) => a.localeCompare(b));
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

export function buildAgenticBundleSelection(
  bundlePlan: AgenticBundlePlan,
  previousSnapshot: AgenticHistorySnapshot | null,
  planPath = 'artifacts/agent-bundle-plan.json',
  previousHistoryPath: string | null = null,
): AgenticBundleSelection {
  if (!previousSnapshot) {
    return {
      kind: 'agentic-bundle-selection',
      generatedAt: new Date().toISOString(),
      planPath,
      previousHistoryPath,
      selectedBundles: dedupe(bundlePlan.bundles.map((entry) => entry.bundle)),
      skippedBundles: [],
    };
  }

  const previousBundleMap = new Map(
    previousSnapshot.bundlePlan.map((entry) => [entry.bundle, entry]),
  );

  const selectedBundles: ImpactBundle[] = [];
  const skippedBundles: AgenticBundleSelection['skippedBundles'] = [];

  for (const bundleEntry of bundlePlan.bundles) {
    const previousEntry = previousBundleMap.get(bundleEntry.bundle);

    if (
      previousEntry &&
      previousEntry.priority === bundleEntry.priority &&
      sameTargets(previousEntry.targets, bundleEntry.targets)
    ) {
      skippedBundles.push({
        bundle: bundleEntry.bundle,
        reason: 'unchanged',
      });
      continue;
    }

    selectedBundles.push(bundleEntry.bundle);
  }

  return {
    kind: 'agentic-bundle-selection',
    generatedAt: new Date().toISOString(),
    planPath,
    previousHistoryPath,
    selectedBundles: dedupe(selectedBundles),
    skippedBundles,
  };
}

async function loadJson<T>(relativePath: string): Promise<T> {
  const rawJson = await fs.readFile(path.join(agenticRepoRoot, relativePath), 'utf8');
  return JSON.parse(rawJson) as T;
}

function parseArguments(argv: readonly string[]): {
  planPath: string;
  previousHistoryPath: string | null;
  outputPath: string;
} {
  let planPath = 'artifacts/agent-bundle-plan.json';
  let previousHistoryPath: string | null = null;
  let outputPath = 'artifacts/agent-bundle-selection.json';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--plan') {
      planPath = argv[index + 1] ?? planPath;
      index += 1;
      continue;
    }

    if (argument === '--previous') {
      previousHistoryPath = argv[index + 1] ?? previousHistoryPath;
      index += 1;
      continue;
    }

    if (argument === '--output') {
      outputPath = argv[index + 1] ?? outputPath;
      index += 1;
    }
  }

  return {
    planPath,
    previousHistoryPath,
    outputPath,
  };
}

async function main(): Promise<void> {
  const { planPath, previousHistoryPath, outputPath } = parseArguments(process.argv.slice(2));
  const bundlePlan = await loadJson<AgenticBundlePlan>(planPath);
  const previousSnapshot = previousHistoryPath
    ? await loadJson<AgenticHistorySnapshot>(previousHistoryPath)
    : null;
  const selection = buildAgenticBundleSelection(
    bundlePlan,
    previousSnapshot,
    planPath,
    previousHistoryPath,
  );

  const resolvedOutputPath = path.join(agenticRepoRoot, outputPath);
  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.writeFile(resolvedOutputPath, `${JSON.stringify(selection, null, 2)}\n`, 'utf8');

  process.stdout.write(`Agentic bundle selection wrote ${outputPath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
