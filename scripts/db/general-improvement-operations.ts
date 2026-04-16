export type ImprovementPhase = 'audit' | 'classify' | 'plan' | 'dry-run' | 'apply';

type ScriptStepBody = {
  kind: 'script';
  script: string;
};

type ManualStepBody = {
  kind: 'manual';
  instructions: string[];
};

export interface ImprovementStep {
  id: string;
  title: string;
  mode: 'automatic' | 'manual';
  writes: boolean;
  outputs: string[];
  body: ScriptStepBody | ManualStepBody;
}

export interface ImprovementTrackDocs {
  category: 'ui' | 'performance' | 'quality' | 'testing' | 'data';
  defaultSelected?: boolean;
  commands: string[];
  relatedDocs: string[];
  generatedArtifacts: string[];
}

export interface ImprovementTrack {
  id: string;
  title: string;
  description: string;
  docs: ImprovementTrackDocs;
  phases: Record<ImprovementPhase, ImprovementStep[]>;
}

function scriptStep(
  id: string,
  title: string,
  script: string,
  options?: {
    writes?: boolean;
    outputs?: string[];
  },
): ImprovementStep {
  return {
    id,
    title,
    mode: 'automatic',
    writes: options?.writes ?? false,
    outputs: options?.outputs ?? [],
    body: {
      kind: 'script',
      script,
    },
  };
}

function manualStep(
  id: string,
  title: string,
  instructions: string[],
  options?: {
    writes?: boolean;
    outputs?: string[];
  },
): ImprovementStep {
  return {
    id,
    title,
    mode: 'manual',
    writes: options?.writes ?? false,
    outputs: options?.outputs ?? [],
    body: {
      kind: 'manual',
      instructions,
    },
  };
}

const improvementTracks: ImprovementTrack[] = [
  {
    id: 'products-parameter-integrity',
    title: 'Products parameter integrity',
    description:
      'Audits missing product parameters, refreshes recovery classification, and rebuilds the remaining source-recovery workspace.',
    docs: {
      category: 'data',
      defaultSelected: true,
      commands: [
        'npm run improvements:audit -- --track products-parameter-integrity',
        'npm run improvements:classify -- --track products-parameter-integrity',
        'npm run improvements:plan -- --track products-parameter-integrity',
      ],
      relatedDocs: [
        'docs/build/general-improvements.md',
      ],
      generatedArtifacts: [
        '/tmp/product-missing-parameters-audit-latest.json',
        '/tmp/product-parameter-recovery-classification-latest.json',
        '/tmp/product-parameter-source-recovery-summary-latest.json',
        '/tmp/product-parameter-source-recovery-batches/family-mapping-index-checklist.md',
      ],
    },
    phases: {
      audit: [
        scriptStep(
          'products-parameter-audit',
          'Audit products with missing parameters',
          'products:audit:missing-parameters',
          {
            outputs: [
              '/tmp/product-missing-parameters-audit-*.json',
              '/tmp/product-missing-parameters-audit-latest.json',
            ],
          },
        ),
      ],
      classify: [
        scriptStep(
          'products-parameter-recovery-classification',
          'Classify product parameter recovery state',
          'products:classify:parameter-recovery',
          {
            outputs: [
              '/tmp/product-parameter-recovery-classification-*.json',
              '/tmp/product-parameter-recovery-classification-latest.json',
            ],
          },
        ),
        scriptStep(
          'products-parameter-source-report',
          'Refresh source-recovery report for unresolved products',
          'products:report:parameter-source-recovery',
          {
            outputs: [
              '/tmp/product-parameter-source-recovery-*.json',
              '/tmp/product-parameter-source-recovery-latest.json',
            ],
          },
        ),
        scriptStep(
          'products-parameter-source-summary',
          'Summarize unresolved source-recovery products',
          'products:summarize:parameter-source-recovery',
          {
            outputs: [
              '/tmp/product-parameter-source-recovery-summary-*.json',
              '/tmp/product-parameter-source-recovery-summary-latest.json',
            ],
          },
        ),
        scriptStep(
          'products-parameter-source-template',
          'Generate source-recovery template for unresolved products',
          'products:generate:parameter-source-recovery-template',
          {
            outputs: [
              '/tmp/product-parameter-source-recovery-template-*.json',
              '/tmp/product-parameter-source-recovery-template-latest.json',
            ],
          },
        ),
        scriptStep(
          'products-parameter-source-batch-split',
          'Split source-recovery template into family batches',
          'products:split:parameter-source-recovery-template',
          {
            outputs: [
              '/tmp/product-parameter-source-recovery-batches/manifest.json',
            ],
          },
        ),
        scriptStep(
          'products-parameter-family-mapping-packs',
          'Generate family mapping packs from the latest source-recovery batches',
          'products:generate:parameter-family-mapping-pack',
          {
            outputs: ['/tmp/product-parameter-source-recovery-batches/*-mapping-pack.json'],
          },
        ),
        scriptStep(
          'products-parameter-family-mapping-index',
          'Build family mapping index for unresolved products',
          'products:build:parameter-family-mapping-index',
          {
            outputs: ['/tmp/product-parameter-source-recovery-batches/family-mapping-index.json'],
          },
        ),
        scriptStep(
          'products-parameter-family-mapping-checklist',
          'Render family mapping checklist for manual curation',
          'products:render:parameter-family-mapping-checklist',
          {
            outputs: [
              '/tmp/product-parameter-source-recovery-batches/family-mapping-index-checklist.md',
            ],
          },
        ),
      ],
      plan: [
        manualStep(
          'products-parameter-integrity-plan-review',
          'Review the refreshed parameter recovery workspace',
          [
            'Confirm the latest unresolved count from /tmp/product-parameter-source-recovery-summary-latest.json.',
            'Review the generated batch manifest and family mapping checklist before any write-side recovery step.',
          ],
        ),
      ],
      'dry-run': [
        scriptStep(
          'products-parameter-recovery-classification',
          'Classify product parameter recovery state',
          'products:classify:parameter-recovery',
          {
            outputs: [
              '/tmp/product-parameter-recovery-classification-*.json',
              '/tmp/product-parameter-recovery-classification-latest.json',
            ],
          },
        ),
        scriptStep(
          'products-parameter-source-report',
          'Refresh source-recovery report for unresolved products',
          'products:report:parameter-source-recovery',
          {
            outputs: [
              '/tmp/product-parameter-source-recovery-*.json',
              '/tmp/product-parameter-source-recovery-latest.json',
            ],
          },
        ),
        scriptStep(
          'products-parameter-source-summary',
          'Summarize unresolved source-recovery products',
          'products:summarize:parameter-source-recovery',
          {
            outputs: [
              '/tmp/product-parameter-source-recovery-summary-*.json',
              '/tmp/product-parameter-source-recovery-summary-latest.json',
            ],
          },
        ),
      ],
      apply: [
        manualStep(
          'products-parameter-integrity-apply',
          'Apply curated parameter recovery only after review',
          [
            'Build curated override files from the reviewed batch mapping packs.',
            'Apply overrides with npm run products:apply:parameter-curated-overrides only after the parameter ids are finalized.',
          ],
          { writes: true },
        ),
      ],
    },
  },
  {
    id: 'products-category-schema-normalization',
    title: 'Products category and schema normalization',
    description:
      'Surfaces the remaining category and parameter-schema decisions that cannot be auto-repaired safely from current live product data.',
    docs: {
      category: 'data',
      defaultSelected: true,
      commands: [
        'npm run improvements:classify -- --track products-category-schema-normalization',
        'npm run improvements:dry-run -- --track products-category-schema-normalization',
        'npm run improvements:apply -- --track products-category-schema-normalization',
      ],
      relatedDocs: [
        'docs/build/general-improvements.md',
      ],
      generatedArtifacts: [
        '/tmp/product-parameter-manual-remediation-latest.json',
        '/tmp/product-parameter-curated-build-latest.json',
        '/tmp/product-parameter-curated-overrides-latest.json',
      ],
    },
    phases: {
      audit: [],
      classify: [
        scriptStep(
          'products-category-manual-remediation-report',
          'Report products requiring manual category or schema remediation',
          'products:report:parameter-remediation',
          {
            outputs: [
              '/tmp/product-parameter-manual-remediation-*.json',
              '/tmp/product-parameter-manual-remediation-latest.json',
            ],
          },
        ),
      ],
      plan: [
        manualStep(
          'products-category-schema-plan',
          'Plan category and schema normalization decisions',
          [
            'Assign missing categories only when a defensible family/category match exists.',
            'Choose final parameter ids for the unresolved families before generating any curated override file.',
            'Treat FIGANI, FOASW, and SPEFA as source/manual recovery until a real category/schema mapping is approved.',
            'Use /tmp/product-parameter-source-recovery-batches/*-mapping-pack.json as the curation source of truth.',
            'Use /tmp/product-parameter-curated-build-latest.json to see which family packs are actually ready for apply.',
          ],
        ),
      ],
      'dry-run': [
        manualStep(
          'products-category-schema-curate-family-mappings',
          'Fill final parameter ids in the latest family mapping packs',
          [
            'Review /tmp/product-parameter-source-recovery-batches/family-mapping-index-checklist.md.',
            'Fill suggestedFinalParameterId in each *-mapping-pack.json only when the final category/schema mapping is approved.',
          ],
        ),
        scriptStep(
          'products-category-schema-build-ready-curated-overrides',
          'Build ready curated override bundle from completed family mapping packs',
          'products:build:ready-parameter-curated-overrides',
          {
            outputs: [
              '/tmp/product-parameter-curated-build-latest.json',
              '/tmp/product-parameter-curated-overrides-latest.json',
            ],
          },
        ),
        scriptStep(
          'products-category-schema-preview-ready-curated-overrides',
          'Preview the latest curated override bundle without applying writes',
          'products:apply:parameter-curated-overrides',
          {
            outputs: ['/tmp/product-parameter-curated-apply-*.json'],
          },
        ),
      ],
      apply: [
        manualStep(
          'products-category-schema-apply',
          'Apply category/schema normalization only after explicit review',
          [
            'Confirm /tmp/product-parameter-curated-build-latest.json shows only the approved family packs as ready.',
            'Apply the resulting curated overrides only after the category/schema decision is finalized.',
          ],
          { writes: true },
        ),
        scriptStep(
          'products-category-schema-build-ready-curated-overrides',
          'Build ready curated override bundle from completed family mapping packs',
          'products:build:ready-parameter-curated-overrides',
          {
            outputs: [
              '/tmp/product-parameter-curated-build-latest.json',
              '/tmp/product-parameter-curated-overrides-latest.json',
            ],
          },
        ),
        scriptStep(
          'products-category-schema-apply-ready-curated-overrides',
          'Apply the latest ready curated override bundle',
          'products:apply:ready-parameter-curated-overrides',
          {
            writes: true,
            outputs: ['/tmp/product-parameter-curated-apply-*.json'],
          },
        ),
      ],
    },
  },
  {
    id: 'ui-consolidation',
    title: 'UI consolidation',
    description:
      'Runs the shared UI consolidation guardrail so broad improvement sweeps account for cross-feature component convergence, not only data and repo baselines.',
    docs: {
      category: 'ui',
      defaultSelected: true,
      commands: [
        'npm run improvements:audit -- --track ui-consolidation',
        'npm run check:ui-consolidation',
        'bun run bun:check:ui-consolidation',
      ],
      relatedDocs: [
        'docs/ui-consolidation/README.md',
        'docs/platform/component-patterns.md',
      ],
      generatedArtifacts: [
        'docs/ui-consolidation/scan-latest.md',
        'docs/ui-consolidation/scan-latest.json',
        'docs/ui-consolidation/inventory-latest.csv',
      ],
    },
    phases: {
      audit: [
        scriptStep(
          'ui-consolidation-guardrail',
          'Run UI consolidation guardrail',
          'check:ui-consolidation',
          {
            outputs: [
              'docs/ui-consolidation/scan-latest.md',
              'docs/ui-consolidation/scan-latest.json',
              'docs/ui-consolidation/inventory-latest.csv',
            ],
          },
        ),
      ],
      classify: [],
      plan: [
        manualStep(
          'ui-consolidation-plan',
          'Review the latest shared UI convergence surface',
          [
            'Use docs/ui-consolidation/scan-latest.md as the current shared backlog.',
            'Prefer migrating to existing shared templates before inventing a new abstraction.',
            'Keep follow-up migrations inside the owning feature docs once the work stops being cross-feature.',
          ],
        ),
      ],
      'dry-run': [
        scriptStep(
          'ui-consolidation-guardrail',
          'Run UI consolidation guardrail',
          'check:ui-consolidation',
          {
            outputs: [
              'docs/ui-consolidation/scan-latest.md',
              'docs/ui-consolidation/scan-latest.json',
              'docs/ui-consolidation/inventory-latest.csv',
            ],
          },
        ),
      ],
      apply: [
        manualStep(
          'ui-consolidation-apply',
          'Apply UI consolidation changes through targeted feature migrations',
          [
            'This track intentionally stops at the shared backlog and guardrail surface.',
            'Implement migrations in the owning feature areas instead of using the improvement runner for blind UI rewrites.',
          ],
          { writes: true },
        ),
      ],
    },
  },
  {
    id: 'application-performance',
    title: 'Application performance',
    description:
      'Adds app-level performance regression checks to the improvement portfolio so broad sweeps cover runtime health alongside UI, quality, and data recovery.',
    docs: {
      category: 'performance',
      defaultSelected: true,
      commands: [
        'npm run improvements:audit -- --track application-performance',
        'npm run improvements:classify -- --track application-performance',
        'npm run perf:ops:baseline',
      ],
      relatedDocs: [
        'docs/runbooks/application-performance-operations.md',
        'docs/metrics/README.md',
      ],
      generatedArtifacts: [
        'docs/metrics/critical-path-performance-latest.md',
        'docs/metrics/critical-flow-tests-latest.md',
        'docs/metrics/unit-domain-timings-latest.md',
        'docs/metrics/route-hotspots.md',
      ],
    },
    phases: {
      audit: [
        scriptStep(
          'application-performance-fast-gate',
          'Run the fast performance operations gate',
          'perf:ops:fast',
        ),
      ],
      classify: [
        scriptStep(
          'application-performance-baseline',
          'Run the performance baseline pass',
          'perf:ops:baseline',
          {
            outputs: [
              'docs/metrics/critical-path-performance-latest.md',
              'docs/metrics/critical-path-performance-latest.json',
              'docs/metrics/critical-flow-tests-latest.md',
              'docs/metrics/critical-flow-tests-latest.json',
              'docs/metrics/unit-domain-timings-latest.md',
              'docs/metrics/unit-domain-timings-latest.json',
              'docs/metrics/route-hotspots.md',
            ],
          },
        ),
      ],
      plan: [
        manualStep(
          'application-performance-plan',
          'Review the latest performance baseline outputs before optimization work',
          [
            'Use docs/metrics/critical-path-performance-latest.md and docs/metrics/critical-flow-tests-latest.md as the default review surfaces.',
            'Treat docs/metrics/route-hotspots.md as the next-level investigation when baseline output suggests route-level regressions.',
            'Use the weekly lane only when you need trend context, not for every local improvement pass.',
          ],
        ),
      ],
      'dry-run': [
        scriptStep(
          'application-performance-fast-gate',
          'Run the fast performance operations gate',
          'perf:ops:fast',
        ),
      ],
      apply: [
        manualStep(
          'application-performance-apply',
          'Apply performance fixes through targeted implementation work',
          [
            'This track is read-only and should guide optimization work rather than attempt blind fixes.',
            'Implement the chosen remediation in the owning code and then re-run the fast gate or baseline lane.',
          ],
          { writes: true },
        ),
      ],
    },
  },
  {
    id: 'testing-quality-baseline',
    title: 'Testing quality baseline',
    description:
      'Tracks the testing inventory and quality snapshot so broader improvement work stays anchored to the current test-system health.',
    docs: {
      category: 'testing',
      defaultSelected: false,
      commands: [
        'npm run improvements:audit -- --track testing-quality-baseline',
        'npm run improvements:classify -- --track testing-quality-baseline',
        'npm run metrics:test-suite-inventory',
      ],
      relatedDocs: [
        'docs/runbooks/testing-operations.md',
        'docs/platform/testing-policy.md',
      ],
      generatedArtifacts: [
        'docs/metrics/testing-suite-inventory-latest.md',
        'docs/metrics/testing-quality-snapshot-latest.md',
        'docs/metrics/testing-run-ledger-latest.md',
      ],
    },
    phases: {
      audit: [
        scriptStep(
          'testing-quality-suite-inventory',
          'Refresh the testing suite inventory',
          'metrics:test-suite-inventory',
          {
            outputs: [
              'docs/metrics/testing-suite-inventory-latest.md',
              'docs/metrics/testing-suite-inventory-latest.json',
            ],
          },
        ),
      ],
      classify: [
        scriptStep(
          'testing-quality-snapshot',
          'Collect the testing quality snapshot',
          'check:test-quality',
        ),
      ],
      plan: [
        manualStep(
          'testing-quality-plan',
          'Review testing quality drift before changing validation scope',
          [
            'Use docs/metrics/testing-suite-inventory-latest.md to confirm lane and suite ownership.',
            'Use docs/metrics/testing-quality-snapshot-latest.md to identify inventory, quality, or ledger follow-up work.',
            'Escalate to canonical lanes from docs/runbooks/testing-operations.md when a broad validation pass is required.',
          ],
        ),
      ],
      'dry-run': [
        scriptStep(
          'testing-quality-suite-inventory',
          'Refresh the testing suite inventory',
          'metrics:test-suite-inventory',
          {
            outputs: [
              'docs/metrics/testing-suite-inventory-latest.md',
              'docs/metrics/testing-suite-inventory-latest.json',
            ],
          },
        ),
      ],
      apply: [
        manualStep(
          'testing-quality-apply',
          'Apply testing-system fixes through targeted suite or policy updates',
          [
            'This track is read-only by default.',
            'Apply test or lane changes through the owning scripts and policies, then refresh the inventory and quality snapshot.',
          ],
          { writes: true },
        ),
      ],
    },
  },
  {
    id: 'repo-quality-baseline',
    title: 'Repository quality baseline',
    description:
      'Runs the core read-only quality checks that establish the current repository baseline.',
    docs: {
      category: 'quality',
      defaultSelected: true,
      commands: [
        'npm run improvements:audit -- --track repo-quality-baseline',
        'npm run improvements:classify -- --track repo-quality-baseline',
        'npm run improvements:plan -- --track repo-quality-baseline',
      ],
      relatedDocs: [
        'docs/build/general-improvements.md',
        'docs/metrics/README.md',
      ],
      generatedArtifacts: [
        'docs/metrics/api-error-sources-latest.md',
        'docs/metrics/api-error-sources-latest.json',
      ],
    },
    phases: {
      audit: [
        scriptStep(
          'repo-quality-api-error-sources',
          'Check API error source coverage',
          'check:api-error-sources',
          {
            outputs: ['docs/metrics/api-error-sources-latest.json', 'docs/metrics/api-error-sources-latest.md'],
          },
        ),
        scriptStep(
          'repo-quality-canonical-sitewide',
          'Check canonical sitewide coverage',
          'canonical:check:sitewide',
        ),
      ],
      classify: [
        scriptStep(
          'repo-quality-lint',
          'Run source lint baseline',
          'quality:baseline:lint',
        ),
        scriptStep(
          'repo-quality-typecheck',
          'Run typecheck baseline',
          'quality:baseline:typecheck',
        ),
      ],
      plan: [
        manualStep(
          'repo-quality-baseline-plan',
          'Review baseline results and decide follow-up validation',
          [
            'Use the lint and typecheck outputs to decide whether a wider repo quality sweep is needed.',
            'Escalate to bazel:smoke or bazel:ci only when the baseline checks indicate broader instability.',
          ],
        ),
      ],
      'dry-run': [
        scriptStep(
          'repo-quality-api-error-sources',
          'Check API error source coverage',
          'check:api-error-sources',
          {
            outputs: ['docs/metrics/api-error-sources-latest.json', 'docs/metrics/api-error-sources-latest.md'],
          },
        ),
        scriptStep(
          'repo-quality-canonical-sitewide',
          'Check canonical sitewide coverage',
          'canonical:check:sitewide',
        ),
      ],
      apply: [
        manualStep(
          'repo-quality-baseline-apply',
          'Apply repo-wide quality fixes manually',
          [
            'This track is read-only by default.',
            'Run targeted fix commands explicitly instead of using the improvement runner for blind write-side quality changes.',
          ],
          { writes: true },
        ),
      ],
    },
  },
];

export const defaultImprovementTrackIds = improvementTracks
  .filter((track) => track.docs.defaultSelected !== false)
  .map((track) => track.id);

export function getImprovementTrack(trackId: string): ImprovementTrack | undefined {
  return improvementTracks.find((track) => track.id === trackId);
}

export function listImprovementTracks(): ImprovementTrack[] {
  return improvementTracks;
}
