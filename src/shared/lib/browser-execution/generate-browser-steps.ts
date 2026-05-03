import { ACTION_SEQUENCES } from './action-sequences';
import { STEP_REGISTRY, type StepId } from './step-registry';

/**
 * Tradera-specific label overrides.
 *
 * The registry uses short, generic labels (shared with Vinted).  Tradera
 * quicklist shows more descriptive labels that also match what the in-browser
 * script emits to the live-execution step panel.  Defining them here — once —
 * makes both the in-browser script generator and the server-side log
 * reconstructor (`tradera-execution-steps.ts`) use the same values.
 */
export const TRADERA_QUICKLIST_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  auth_check:            'Validate Tradera session',
  auth_manual:           'Complete manual Tradera login',
  sync_check:            'Load sync target listing',
  duplicate_check:       'Search for duplicate listings',
  deep_duplicate_check:  'Inspect duplicate candidates',
  image_upload:          'Upload listing images',
  listing_format_select: 'Choose listing format',
  attribute_select:      'Apply listing attributes',
};

/**
 * Action-contextual publish labels.  Both the generator and the reconstructor
 * share this mapping so the label shown during live execution matches the label
 * shown in the post-execution step timeline.
 */
export const TRADERA_QUICKLIST_PUBLISH_LABELS = {
  sync:   { publish: 'Save listing changes',  publish_verify: 'Verify saved listing' },
  relist: { publish: 'Relist',                publish_verify: 'Verify published listing' },
  list:   { publish: 'Publish listing',       publish_verify: 'Verify published listing' },
} as const;

type TraderaQuicklistStepSequenceOverrides = {
  listStepIds?: readonly string[];
  relistStepIds?: readonly string[];
  syncStepIds?: readonly string[];
};

type StepManifestEntry = {
  id: string;
  label: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const resolveLabel = (id: string): string => {
  const override = TRADERA_QUICKLIST_LABEL_OVERRIDES[id];
  if (override !== undefined) {
    return override;
  }

  if (id in STEP_REGISTRY) {
    return STEP_REGISTRY[id as StepId].label;
  }

  return id;
};

const buildQuicklistManifestEntry = (
  id: string,
  action: keyof typeof TRADERA_QUICKLIST_PUBLISH_LABELS
): string => {
  if (id === 'publish') {
    return `{ id: 'publish', label: '${TRADERA_QUICKLIST_PUBLISH_LABELS[action].publish}', status: 'pending', info: null }`;
  }

  if (id === 'publish_verify') {
    return `{ id: 'publish_verify', label: '${TRADERA_QUICKLIST_PUBLISH_LABELS[action].publish_verify}', status: 'pending', info: null }`;
  }

  return `{ id: '${id}', label: '${resolveLabel(id)}', status: 'pending', info: null }`;
};

const buildQuicklistManifestEntries = (
  stepIds: readonly string[],
  action: keyof typeof TRADERA_QUICKLIST_PUBLISH_LABELS
): string[] => stepIds.map((id) => buildQuicklistManifestEntry(id, action));

// ── Generator ────────────────────────────────────────────────────────────────

/**
 * Generates the JavaScript `const executionSteps = ...` initialization
 * block embedded verbatim into the Tradera quicklist browser script template.
 *
 * The registry (`ACTION_SEQUENCES`) is the authoritative source for step IDs
 * and ordering. The generated code materializes separate manifests for
 * `list`, `relist`, and `sync`, then selects the one matching the runtime
 * `listingAction` already in scope inside the browser script.
 *
 * Calling this at TypeScript module-load time means the browser script body
 * is computed once; the resulting string is a pure-JS snippet with no imports.
 */
export const generateTraderaQuicklistBrowserStepsInit = (
  options: TraderaQuicklistStepSequenceOverrides = {}
): string => {
  const listSeq = options.listStepIds ?? ACTION_SEQUENCES.tradera_quicklist_list;
  const relistSeq = options.relistStepIds ?? ACTION_SEQUENCES.tradera_quicklist_relist;
  const syncSeq = options.syncStepIds ?? ACTION_SEQUENCES.tradera_quicklist_sync;

  const i1 = '  ';
  const i2 = '    ';

  const lines: string[] = [
    '// --- Execution step tracking ---',
    '// Each step has: id, label, status (\'pending\'|\'running\'|\'success\'|\'skipped\'|\'error\'), info (null or object)',
    'const QUICKLIST_ACTION_EXECUTION_STEPS = {',
    `${i1}list: [`,
    ...buildQuicklistManifestEntries(listSeq, 'list').map((entry) => `${i2}${entry},`),
    `${i1}],`,
    `${i1}relist: [`,
    ...buildQuicklistManifestEntries(relistSeq, 'relist').map((entry) => `${i2}${entry},`),
    `${i1}],`,
    `${i1}sync: [`,
    ...buildQuicklistManifestEntries(syncSeq, 'sync').map((entry) => `${i2}${entry},`),
    `${i1}],`,
    '};',
    'const executionSteps = (',
    `${i1}Array.isArray(QUICKLIST_ACTION_EXECUTION_STEPS[listingAction])`,
    `${i1}  ? QUICKLIST_ACTION_EXECUTION_STEPS[listingAction]`,
    `${i1}  : QUICKLIST_ACTION_EXECUTION_STEPS.list`,
    `${i1}).map((step) => ({ ...step }));`,
  ];

  return lines.join('\n');
};

export const generateBrowserExecutionStepsInit = (
  manifest: readonly StepManifestEntry[]
): string =>
  `const executionSteps = ${JSON.stringify(
    manifest.map((step) => ({
      id: step.id,
      label: step.label,
      status: 'pending',
      message: null,
    })),
    null,
    2
  )};`;
