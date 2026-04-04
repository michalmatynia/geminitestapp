import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { agenticRepoRoot } from './domain-manifests';
import type { AgenticHistorySnapshot } from './agent-history';

export interface AgenticHistoryDiff {
  kind: 'agentic-history-diff';
  generatedAt: string;
  currentPath: string;
  previousPath: string;
  currentGeneratedAt: string;
  previousGeneratedAt: string;
  addedBundles: string[];
  removedBundles: string[];
  newlyHighRiskBundles: string[];
  newlyAttemptedHighRiskSuppressions: string[];
  riskEscalations: Array<{
    bundle: string;
    previousPriority: string;
    currentPriority: string;
  }>;
  selectionChanges: Array<{
    bundle: string;
    previousState: 'selected' | 'skipped' | 'missing';
    currentState: 'selected' | 'skipped' | 'missing';
  }>;
  bundlesWithRecommendationChanges: Array<{
    bundle: string;
    addedTargets: string[];
    removedTargets: string[];
  }>;
  bundlesWithExecutionChanges: Array<{
    bundle: string;
    addedTargets: string[];
    removedTargets: string[];
    statusChanges: Array<{
      target: string;
      previousStatus: 'passed' | 'failed';
      currentStatus: 'passed' | 'failed';
    }>;
  }>;
  validationDecisionChanged: {
    changed: boolean;
    previous: string | null;
    current: string | null;
  };
}

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function difference(left: readonly string[], right: readonly string[]): string[] {
  const rightSet = new Set(right);
  return dedupe(left.filter((value) => !rightSet.has(value)));
}

function recommendationMap(snapshot: AgenticHistorySnapshot): Map<string, string[]> {
  return new Map(
    snapshot.bundlePlan.map((entry) => [entry.bundle, dedupe(entry.targets)]),
  );
}

function priorityMap(snapshot: AgenticHistorySnapshot): Map<string, string> {
  return new Map(snapshot.bundlePlan.map((entry) => [entry.bundle, entry.priority]));
}

function executionMap(
  snapshot: AgenticHistorySnapshot,
): Map<string, Map<string, 'passed' | 'failed'>> {
  return new Map(
    snapshot.bundleReports.map((entry) => [
      entry.bundle,
      new Map(
        entry.executedTargets.map((target) => [target.target, target.status]),
      ),
    ]),
  );
}

function selectionStateMap(
  snapshot: AgenticHistorySnapshot,
): Map<string, 'selected' | 'skipped'> {
  if (!snapshot.bundleSelection) {
    return new Map(
      snapshot.bundlePlan.map(
        (entry): readonly [string, 'selected'] => [entry.bundle, 'selected'],
      ),
    );
  }

  return new Map<string, 'selected' | 'skipped'>([
    ...snapshot.bundleSelection.selectedBundles.map(
      (bundle): readonly [string, 'selected'] => [bundle, 'selected'],
    ),
    ...snapshot.bundleSelection.skippedBundles.map(
      (entry): readonly [string, 'skipped'] => [entry.bundle, 'skipped'],
    ),
  ]);
}

function attemptedSuppressionSet(snapshot: AgenticHistorySnapshot): Set<string> {
  return new Set(
    snapshot.bundleSelection?.attemptedSuppressions.map((entry) => entry.bundle) ?? [],
  );
}

const DIFF_HISTORY_DEFAULT_ARGUMENTS: {
  currentPath: string;
  previousPath: string;
  outputPath: string;
} = {
  currentPath: 'artifacts/agent-history/latest.json',
  previousPath: 'artifacts/agent-history/previous.json',
  outputPath: 'artifacts/agent-history/diff.json',
};

const filterBundlesByPriority = (
  bundles: readonly string[],
  priorities: Map<string, string>,
  priority: string,
): string[] => bundles.filter((bundle) => priorities.get(bundle) === priority);

const readCliOptionValue = (
  argv: readonly string[],
  index: number,
  fallback: string,
): string => argv[index + 1] ?? fallback;

export function diffAgenticHistorySnapshots(
  currentSnapshot: AgenticHistorySnapshot,
  previousSnapshot: AgenticHistorySnapshot,
  paths: {
    currentPath: string;
    previousPath: string;
  },
): AgenticHistoryDiff {
  const currentBundles = dedupe(currentSnapshot.bundlePlan.map((entry) => entry.bundle));
  const previousBundles = dedupe(previousSnapshot.bundlePlan.map((entry) => entry.bundle));
  const allBundles = dedupe([...currentBundles, ...previousBundles]);

  const currentRecommendationMap = recommendationMap(currentSnapshot);
  const previousRecommendationMap = recommendationMap(previousSnapshot);
  const currentPriorityMap = priorityMap(currentSnapshot);
  const previousPriorityMap = priorityMap(previousSnapshot);
  const currentSelectionMap = selectionStateMap(currentSnapshot);
  const previousSelectionMap = selectionStateMap(previousSnapshot);
  const currentAttemptedSuppressions = attemptedSuppressionSet(currentSnapshot);
  const previousAttemptedSuppressions = attemptedSuppressionSet(previousSnapshot);
  const currentExecutionMap = executionMap(currentSnapshot);
  const previousExecutionMap = executionMap(previousSnapshot);
  const addedBundles = difference(currentBundles, previousBundles);
  const removedBundles = difference(previousBundles, currentBundles);
  const newlyAttemptedSuppressions = difference(
    [...currentAttemptedSuppressions],
    [...previousAttemptedSuppressions],
  );

  return {
    kind: 'agentic-history-diff',
    generatedAt: new Date().toISOString(),
    currentPath: paths.currentPath,
    previousPath: paths.previousPath,
    currentGeneratedAt: currentSnapshot.generatedAt,
    previousGeneratedAt: previousSnapshot.generatedAt,
    addedBundles,
    removedBundles,
    newlyHighRiskBundles: filterBundlesByPriority(addedBundles, currentPriorityMap, 'high'),
    newlyAttemptedHighRiskSuppressions: filterBundlesByPriority(
      newlyAttemptedSuppressions,
      currentPriorityMap,
      'high',
    ),
    riskEscalations: allBundles
      .map((bundle) => {
        const currentPriority = currentPriorityMap.get(bundle);
        const previousPriority = previousPriorityMap.get(bundle);
        if (
          !currentPriority ||
          !previousPriority ||
          currentPriority === previousPriority ||
          (currentPriority !== 'medium' && currentPriority !== 'high')
        ) {
          return null;
        }

        const order = {
          low: 0,
          medium: 1,
          high: 2,
        } as const;

        if (order[currentPriority as keyof typeof order] <= order[previousPriority as keyof typeof order]) {
          return null;
        }

        return {
          bundle,
          previousPriority,
          currentPriority,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    selectionChanges: allBundles
      .map((bundle) => {
        const previousState: AgenticHistoryDiff['selectionChanges'][number]['previousState'] =
          previousSelectionMap.get(bundle) ?? 'missing';
        const currentState: AgenticHistoryDiff['selectionChanges'][number]['currentState'] =
          currentSelectionMap.get(bundle) ?? 'missing';
        if (previousState === currentState) {
          return null;
        }

        return {
          bundle,
          previousState,
          currentState,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    bundlesWithRecommendationChanges: allBundles
      .map((bundle) => {
        const currentTargets = currentRecommendationMap.get(bundle) ?? [];
        const previousTargets = previousRecommendationMap.get(bundle) ?? [];
        return {
          bundle,
          addedTargets: difference(currentTargets, previousTargets),
          removedTargets: difference(previousTargets, currentTargets),
        };
      })
      .filter((entry) => entry.addedTargets.length > 0 || entry.removedTargets.length > 0),
    bundlesWithExecutionChanges: allBundles
      .map((bundle) => {
        const currentTargets = currentExecutionMap.get(bundle) ?? new Map();
        const previousTargets = previousExecutionMap.get(bundle) ?? new Map();
        const currentTargetIds = [...currentTargets.keys()];
        const previousTargetIds = [...previousTargets.keys()];
        const allTargetIds = dedupe([...currentTargetIds, ...previousTargetIds]);

        return {
          bundle,
          addedTargets: difference(currentTargetIds, previousTargetIds),
          removedTargets: difference(previousTargetIds, currentTargetIds),
          statusChanges: allTargetIds
            .map((target) => {
              const currentStatus = currentTargets.get(target);
              const previousStatus = previousTargets.get(target);
              if (!currentStatus || !previousStatus || currentStatus === previousStatus) {
                return null;
              }
              return {
                target,
                previousStatus,
                currentStatus,
              };
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
        };
      })
      .filter(
        (entry) =>
          entry.addedTargets.length > 0 ||
          entry.removedTargets.length > 0 ||
          entry.statusChanges.length > 0,
      ),
    validationDecisionChanged: {
      changed:
        (previousSnapshot.executionReport?.validationDecision ?? null) !==
        (currentSnapshot.executionReport?.validationDecision ?? null),
      previous: previousSnapshot.executionReport?.validationDecision ?? null,
      current: currentSnapshot.executionReport?.validationDecision ?? null,
    },
  };
}

async function loadSnapshot(relativePath: string): Promise<AgenticHistorySnapshot> {
  const rawSnapshot = await fs.readFile(path.join(agenticRepoRoot, relativePath), 'utf8');
  return JSON.parse(rawSnapshot) as AgenticHistorySnapshot;
}

export function parseDiffHistoryArguments(argv: readonly string[]): {
  currentPath: string;
  previousPath: string;
  outputPath: string;
} {
  let currentPath = DIFF_HISTORY_DEFAULT_ARGUMENTS.currentPath;
  let previousPath = DIFF_HISTORY_DEFAULT_ARGUMENTS.previousPath;
  let outputPath = DIFF_HISTORY_DEFAULT_ARGUMENTS.outputPath;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--current') {
      currentPath = readCliOptionValue(argv, index, currentPath);
      index += 1;
      continue;
    }

    if (argument === '--previous') {
      previousPath = readCliOptionValue(argv, index, previousPath);
      index += 1;
      continue;
    }

    if (argument === '--output') {
      outputPath = readCliOptionValue(argv, index, outputPath);
      index += 1;
    }
  }

  return {
    currentPath,
    previousPath,
    outputPath,
  };
}

async function main(): Promise<void> {
  const { currentPath, previousPath, outputPath } = parseDiffHistoryArguments(process.argv.slice(2));
  const currentSnapshot = await loadSnapshot(currentPath);
  const previousSnapshot = await loadSnapshot(previousPath);
  const diff = diffAgenticHistorySnapshots(currentSnapshot, previousSnapshot, {
    currentPath,
    previousPath,
  });

  const resolvedOutputPath = path.join(agenticRepoRoot, outputPath);
  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.writeFile(resolvedOutputPath, `${JSON.stringify(diff, null, 2)}\n`, 'utf8');

  process.stdout.write(`Agentic history diff wrote ${outputPath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
