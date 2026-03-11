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

export interface ImprovementTrack {
  id: string;
  title: string;
  description: string;
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
          ],
        ),
      ],
      'dry-run': [],
      apply: [
        manualStep(
          'products-category-schema-apply',
          'Apply category/schema normalization only after explicit review',
          [
            'Fill suggestedFinalParameterId in the mapping packs or family mapping checklist.',
            'Build curated override files from those approved mappings.',
            'Apply the resulting curated overrides only after the category/schema decision is finalized.',
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

export const defaultImprovementTrackIds = improvementTracks.map((track) => track.id);

export function getImprovementTrack(trackId: string): ImprovementTrack | undefined {
  return improvementTracks.find((track) => track.id === trackId);
}

export function listImprovementTracks(): ImprovementTrack[] {
  return improvementTracks;
}
