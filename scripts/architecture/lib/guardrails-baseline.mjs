import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_GUARDRAIL_BASELINE_RELATIVE_PATH = path.join(
  'scripts',
  'architecture',
  'guardrails-baseline.json'
);
export const DEFAULT_GUARDRAIL_HARD_LIMITS = Object.freeze({
  sourceLargestFileLines: 4000,
});
export const DEFAULT_INFORMATIONAL_GUARDRAIL_KEYS = Object.freeze(['api.delegatedServerRoutes']);
export const UI_CONSOLIDATION_GUARDRAIL_RULES = Object.freeze([
  {
    key: 'propDrilling.componentsWithForwarding',
    label: 'prop forwarding components',
  },
  {
    key: 'propDrilling.depthGte4Chains',
    label: 'prop depth>=4 chains',
  },
  {
    key: 'uiConsolidation.totalOpportunities',
    label: 'UI consolidation opportunities',
  },
  {
    key: 'uiConsolidation.highPriorityOpportunities',
    label: 'high-priority UI opportunities',
  },
  {
    key: 'uiConsolidation.duplicateNameClusters',
    label: 'duplicate-name clusters',
  },
  {
    key: 'uiConsolidation.propSignatureClusters',
    label: 'prop-signature clusters',
  },
  {
    key: 'uiConsolidation.tokenSimilarityClusters',
    label: 'token-similarity clusters',
  },
]);

export const resolveGuardrailBaselinePath = (root = process.cwd()) =>
  path.join(root, DEFAULT_GUARDRAIL_BASELINE_RELATIVE_PATH);

export const buildArchitectureGuardrailSnapshot = (metrics, propDrilling, uiConsolidation) => ({
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
  'propDrilling.depthGte4Chains': propDrilling.depthGte4Chains,
  'propDrilling.componentsWithForwarding': propDrilling.componentsWithForwarding,
  'uiConsolidation.totalOpportunities': uiConsolidation.totalOpportunities,
  'uiConsolidation.highPriorityOpportunities': uiConsolidation.highPriorityOpportunities,
  'uiConsolidation.duplicateNameClusters': uiConsolidation.duplicateNameClusters,
  'uiConsolidation.propSignatureClusters': uiConsolidation.propSignatureClusters,
  'uiConsolidation.tokenSimilarityClusters': uiConsolidation.tokenSimilarityClusters,
});

export const buildUiConsolidationGuardrailSnapshot = (propDrilling, uiConsolidation) => ({
  'propDrilling.componentsWithForwarding': propDrilling.componentsWithForwarding,
  'propDrilling.depthGte4Chains': propDrilling.highPriorityChainCount,
  'uiConsolidation.totalOpportunities': uiConsolidation.totalOpportunities,
  'uiConsolidation.highPriorityOpportunities': uiConsolidation.highPriorityCount,
  'uiConsolidation.duplicateNameClusters': uiConsolidation.duplicateNameClusterCount,
  'uiConsolidation.propSignatureClusters': uiConsolidation.propSignatureClusterCount,
  'uiConsolidation.tokenSimilarityClusters': uiConsolidation.tokenSimilarityClusterCount,
});

export const createGuardrailBaseline = (
  snapshot,
  {
    generatedAt = new Date().toISOString(),
    hardLimits = DEFAULT_GUARDRAIL_HARD_LIMITS,
  } = {}
) => ({
  generatedAt,
  hardLimits: {
    ...DEFAULT_GUARDRAIL_HARD_LIMITS,
    ...(hardLimits ?? {}),
  },
  max: snapshot,
});

export const readGuardrailBaseline = async ({
  root = process.cwd(),
  baselinePath = resolveGuardrailBaselinePath(root),
} = {}) => {
  const raw = await fs.readFile(baselinePath, 'utf8');
  return JSON.parse(raw);
};

export const writeGuardrailBaseline = async (
  snapshot,
  {
    root = process.cwd(),
    baselinePath = resolveGuardrailBaselinePath(root),
    generatedAt,
    hardLimits,
  } = {}
) => {
  const payload = createGuardrailBaseline(snapshot, {
    generatedAt,
    hardLimits,
  });
  await fs.mkdir(path.dirname(baselinePath), { recursive: true });
  await fs.writeFile(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
};

export const formatGuardrailRow = (label, current, max, status) => {
  const paddedLabel = label.padEnd(44, ' ');
  const currentText = String(current).padStart(8, ' ');
  const maxText = String(max).padStart(8, ' ');
  return `${status.padEnd(6, ' ')} ${paddedLabel} current=${currentText} max=${maxText}`;
};

export const compareGuardrailSnapshotAgainstBaseline = (
  snapshot,
  baseline,
  {
    informationalKeys = DEFAULT_INFORMATIONAL_GUARDRAIL_KEYS,
  } = {}
) => {
  const maxByKey = baseline.max ?? {};
  const informationalKeySet = new Set(informationalKeys);
  const rows = [];
  let failed = false;

  for (const key of Object.keys(maxByKey).sort()) {
    const current = snapshot[key] ?? 0;
    const max = maxByKey[key];

    if (typeof max !== 'number') {
      rows.push({ label: key, current, max: 'n/a', status: 'WARN' });
      continue;
    }

    if (informationalKeySet.has(key)) {
      rows.push({ label: key, current, max, status: 'INFO' });
      continue;
    }

    if (current > max) {
      failed = true;
      rows.push({ label: key, current, max, status: 'FAIL' });
      continue;
    }

    rows.push({ label: key, current, max, status: 'OK' });
  }

  const hardMaxLargestFile = Number(
    baseline.hardLimits?.sourceLargestFileLines ?? DEFAULT_GUARDRAIL_HARD_LIMITS.sourceLargestFileLines
  );
  const currentLargest = snapshot['source.largestFileLines'] ?? 0;
  if (currentLargest > hardMaxLargestFile) {
    failed = true;
    rows.push({
      label: 'source.largestFileLines (hard limit)',
      current: currentLargest,
      max: hardMaxLargestFile,
      status: 'FAIL',
    });
  } else {
    rows.push({
      label: 'source.largestFileLines (hard limit)',
      current: currentLargest,
      max: hardMaxLargestFile,
      status: 'OK',
    });
  }

  return {
    rows,
    failed,
  };
};

export const collectGuardrailThresholdFailures = (snapshot, baseline, rules) => {
  const maxByKey = baseline.max ?? {};

  return rules.flatMap(({ key, label }) => {
    const current = Number(snapshot[key] ?? 0);
    const max = Number(maxByKey[key] ?? 0);
    if (current <= max) {
      return [];
    }

    return [`Expected ${label} <= ${max}, got ${current}.`];
  });
};
