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

// ── Helpers ──────────────────────────────────────────────────────────────────

const resolveLabel = (id: string): string =>
  TRADERA_QUICKLIST_LABEL_OVERRIDES[id] ??
  STEP_REGISTRY[id as StepId]?.label ??
  id;

const stepEntry = (id: string): string =>
  `{ id: '${id}', label: '${resolveLabel(id)}', status: 'pending', info: null }`;

// ── Generator ────────────────────────────────────────────────────────────────

/**
 * Generates the JavaScript `const executionSteps = (...)()` initialisation
 * block embedded verbatim into the Tradera quicklist browser script template.
 *
 * The registry (`ACTION_SEQUENCES`) is the authoritative source for step IDs
 * and ordering.  The generated code references `listingAction` — a runtime
 * variable already in scope inside the browser script — to branch between the
 * sync path (uses `sync_check`) and the list/relist path (uses
 * `duplicate_check` … `image_cleanup`).
 *
 * Calling this at TypeScript module-load time means the browser script body
 * is computed once; the resulting string is a pure-JS snippet with no imports.
 */
export const generateTraderaQuicklistBrowserStepsInit = (): string => {
  const listSeq = ACTION_SEQUENCES.tradera_quicklist_list as readonly string[];
  const syncSeq = ACTION_SEQUENCES.tradera_quicklist_sync as readonly string[];
  const listSet = new Set(listSeq);
  const syncSet = new Set(syncSeq);

  const syncOnlyIds = syncSeq.filter((id) => !listSet.has(id));  // ['sync_check']
  const listOnlyIds = listSeq.filter((id) => !syncSet.has(id));  // duplicate … image_cleanup

  // Steps that appear in both sequences.  Split into:
  //   prefixIds  — come before the branching section
  //   suffixIds  — come after the branching section
  const branchSet = new Set([...syncOnlyIds, ...listOnlyIds]);
  const prefixIds: string[] = [];
  const suffixIds: string[] = [];
  let pastBranch = false;
  for (const id of listSeq) {
    if (branchSet.has(id)) { pastBranch = true; continue; }
    (pastBranch ? suffixIds : prefixIds).push(id);
  }

  const i1 = '  ';
  const i2 = '    ';
  const i3 = '      ';

  const { sync: syncPublish, relist: relistPublish, list: listPublish } =
    TRADERA_QUICKLIST_PUBLISH_LABELS;

  const lines: string[] = [
    '// --- Execution step tracking ---',
    '// Each step has: id, label, status (\'pending\'|\'running\'|\'success\'|\'skipped\'|\'error\'), info (null or object)',
    'const executionSteps = (() => {',
    `${i1}const steps = [`,
    ...prefixIds.map((id) => `${i2}${stepEntry(id)},`),
    `${i1}];`,
    `${i1}if (listingAction === 'sync') {`,
    `${i2}steps.push(`,
    ...syncOnlyIds.map((id, idx) =>
      `${i3}${stepEntry(id)}${idx < syncOnlyIds.length - 1 ? ',' : ''}`
    ),
    `${i2});`,
    `${i1}} else {`,
    `${i2}steps.push(`,
    ...listOnlyIds.map((id, idx) =>
      `${i3}${stepEntry(id)}${idx < listOnlyIds.length - 1 ? ',' : ''}`
    ),
    `${i2});`,
    `${i1}}`,
    `${i1}steps.push(`,
    ...suffixIds.map((id) => {
      if (id === 'publish') {
        return (
          `${i2}{ id: 'publish', ` +
          `label: listingAction === 'sync' ? '${syncPublish.publish}' ` +
          `: listingAction === 'relist' ? '${relistPublish.publish}' ` +
          `: '${listPublish.publish}', status: 'pending', info: null },`
        );
      }
      if (id === 'publish_verify') {
        return (
          `${i2}{ id: 'publish_verify', ` +
          `label: listingAction === 'sync' ? '${syncPublish.publish_verify}' ` +
          `: '${listPublish.publish_verify}', status: 'pending', info: null },`
        );
      }
      return `${i2}${stepEntry(id)},`;
    }),
    `${i1});`,
    `${i1}return steps;`,
    '})();',
  ];

  return lines.join('\n');
};
