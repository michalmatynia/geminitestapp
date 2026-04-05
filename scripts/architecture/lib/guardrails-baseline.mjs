import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_GUARDRAIL_BASELINE_RELATIVE_PATH = path.join(
  'scripts',
  'architecture',
  'guardrails-baseline.json'
);
export const DEFAULT_GUARDRAIL_HARD_LIMITS = Object.freeze({
  sourceLargestFileLines: 4000,
  'imports.featuresToAppApiTotalImports': 0,
  // Files that use React/Next hooks but lack 'use client' will always break the build.
  // This hard limit of 0 ensures agents can never remove 'use client' from hook-using files.
  'source.hooksWithoutUseClient': 0,
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
  'source.hooksWithoutUseClient': metrics.source.hooksWithoutUseClient,
  'source.largestFileLines': metrics.source.largestFile?.lines ?? 0,
  'api.totalRoutes': metrics.api.totalRoutes,
  'api.delegatedServerRoutes': metrics.api.delegatedServerRoutes,
  'api.routesWithoutApiHandler': metrics.api.routesWithoutApiHandler,
  'api.routesWithoutExplicitCachePolicy': metrics.api.routesWithoutExplicitCachePolicy,
  'imports.appFeatureBarrelImports': metrics.imports.appFeatureBarrelImports,
  'imports.appFeatureDeepImports': metrics.imports.appFeatureDeepImports,
  'imports.featuresToSharedTotalImports': metrics.imports.featureToSharedTotalImports,
  'imports.featuresToAppApiTotalImports': metrics.imports.featureToAppApiTotalImports,
  'imports.sharedToFeaturesTotalImports': metrics.imports.sharedToFeaturesTotalImports,
  'architecture.crossFeatureEdgePairs': metrics.architecture.crossFeatureEdgePairs,
  'runtime.setIntervalOccurrences': metrics.runtime.setIntervalOccurrences,
  'codeHealth.highHookComplexity': metrics.codeHealth?.highComplexityHooksCount ?? 0,
  'propDrilling.depthGte4Chains': propDrilling.depthGte4Chains,
  'propDrilling.highPropCount': propDrilling.highPropCountComponentCount ?? 0,
  'propDrilling.passThroughHotspots': propDrilling.passThroughHotspotCount ?? 0,
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
    min = undefined,
  } = {}
) => {
  const baseline = {
    generatedAt,
    hardLimits: {
      ...DEFAULT_GUARDRAIL_HARD_LIMITS,
      ...(hardLimits ?? {}),
    },
    max: snapshot,
  };
  // Preserve min constraints if provided — these are floor guards that should
  // never be silently dropped by --update-baseline runs.
  if (min && Object.keys(min).length > 0) {
    baseline.min = min;
  }
  return baseline;
};

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
    min,
  } = {}
) => {
  const payload = createGuardrailBaseline(snapshot, {
    generatedAt,
    hardLimits,
    min,
  });
  await fs.mkdir(path.dirname(baselinePath), { recursive: true });
  await fs.writeFile(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
};

export const formatGuardrailRow = (label, current, limit, status, direction = 'max') => {
  const paddedLabel = label.padEnd(44, ' ');
  const currentText = String(current).padStart(8, ' ');
  const limitText = String(limit).padStart(8, ' ');
  return `${status.padEnd(6, ' ')} ${paddedLabel} current=${currentText} ${direction}=${limitText}`;
};

export const compareGuardrailSnapshotAgainstBaseline = (
  snapshot,
  baseline,
  {
    informationalKeys = DEFAULT_INFORMATIONAL_GUARDRAIL_KEYS,
  } = {}
) => {
  const maxByKey = baseline.max ?? {};
  const minByKey = baseline.min ?? {};
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

  // Min checks: prevent over-removal of metrics that have a safe floor.
  // If current < min the codebase has been changed in a way that is likely broken
  // (e.g. 'use client' directives stripped below the level where the build still works).
  // Rows use the same `max` field (holding the floor value) so the render loop in
  // check-guardrails.mjs works without modification; the `(min)` label suffix distinguishes them.
  for (const key of Object.keys(minByKey).sort()) {
    const current = snapshot[key] ?? 0;
    const min = minByKey[key];

    if (typeof min !== 'number') {
      rows.push({ label: `${key} (min)`, current, max: 'n/a', status: 'WARN' });
      continue;
    }

    if (current < min) {
      failed = true;
      rows.push({ label: `${key} (min)`, current, max: min, status: 'FAIL' });
      continue;
    }

    rows.push({ label: `${key} (min)`, current, max: min, status: 'OK' });
  }

  const hardLimits = {
    ...DEFAULT_GUARDRAIL_HARD_LIMITS,
    ...(baseline.hardLimits ?? {}),
  };
  for (const [hardLimitKey, hardLimitValue] of Object.entries(hardLimits).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const snapshotKey =
      hardLimitKey === 'sourceLargestFileLines' ? 'source.largestFileLines' : hardLimitKey;
    const label = `${snapshotKey} (hard limit)`;
    const max = Number(hardLimitValue);
    const current = Number(snapshot[snapshotKey] ?? 0);
    if (current > max) {
      failed = true;
      rows.push({
        label,
        current,
        max,
        status: 'FAIL',
      });
      continue;
    }

    rows.push({
      label,
      current,
      max,
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
