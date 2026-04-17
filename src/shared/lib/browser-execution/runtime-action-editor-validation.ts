import type { PlaywrightActionBlock } from '@/shared/contracts/playwright-steps';

import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';
import { STEP_GROUPS } from './step-groups';
import { STEP_REGISTRY, type StepId } from './step-registry';

const TRADERA_QUICKLIST_RUNTIME_KEYS = new Set<ActionSequenceKey>([
  'tradera_quicklist_list',
  'tradera_quicklist_relist',
  'tradera_quicklist_sync',
]);

const TRADERA_QUICKLIST_FORM_STEP_IDS = new Set<StepId>(STEP_GROUPS.TRADERA_FORM);

const unique = (values: string[]): string[] => [...new Set(values)];

const findDuplicateStepIds = (stepIds: StepId[]): StepId[] => {
  const seen = new Set<StepId>();
  const duplicates = new Set<StepId>();

  for (const stepId of stepIds) {
    if (seen.has(stepId)) {
      duplicates.add(stepId);
      continue;
    }
    seen.add(stepId);
  }

  return [...duplicates];
};

const toKnownStepId = (value: string): StepId | null =>
  value in STEP_REGISTRY ? (value as StepId) : null;

const collectRuntimeActionShapeErrors = (
  blocks: PlaywrightActionBlock[],
  runtimeKey: ActionSequenceKey
): string[] => {
  const errors: string[] = [];

  const nonRuntimeBlockKinds = unique(
    blocks.filter((block) => block.kind !== 'runtime_step').map((block) => block.kind)
  );
  if (nonRuntimeBlockKinds.length > 0) {
    errors.push(
      `Runtime action "${runtimeKey}" only supports runtime_step blocks. Remove: ${nonRuntimeBlockKinds.join(', ')}.`
    );
  }

  const unknownRuntimeStepIds = unique(
    blocks
      .filter((block) => block.kind === 'runtime_step')
      .map((block) => block.refId)
      .filter((refId) => toKnownStepId(refId) === null)
  );
  if (unknownRuntimeStepIds.length > 0) {
    errors.push(
      `Runtime action "${runtimeKey}" contains unknown runtime steps: ${unknownRuntimeStepIds.join(', ')}.`
    );
  }

  return errors;
};

const getEnabledRuntimeStepIds = (blocks: PlaywrightActionBlock[]): StepId[] =>
  blocks
    .filter((block) => block.kind === 'runtime_step' && block.enabled !== false)
    .map((block) => toKnownStepId(block.refId))
    .filter((stepId): stepId is StepId => stepId !== null);

const collectRuntimeActionSequenceErrors = (
  stepIds: StepId[],
  runtimeKey: ActionSequenceKey
): string[] => {
  const errors: string[] = [];

  if (stepIds.length === 0) {
    errors.push(`Runtime action "${runtimeKey}" must keep at least one enabled runtime step.`);
    return errors;
  }

  const duplicateStepIds = findDuplicateStepIds(stepIds);
  if (duplicateStepIds.length > 0) {
    errors.push(
      `Runtime action "${runtimeKey}" cannot enable the same runtime step more than once: ${duplicateStepIds.join(', ')}.`
    );
  }

  const allowedStepIds = new Set<StepId>(ACTION_SEQUENCES[runtimeKey]);
  const disallowedStepIds = unique(
    stepIds.filter((stepId) => !allowedStepIds.has(stepId))
  );
  if (disallowedStepIds.length > 0) {
    errors.push(
      `Runtime action "${runtimeKey}" does not allow these steps: ${disallowedStepIds.join(', ')}.`
    );
  }

  return errors;
};

const collectTraderaQuicklistErrors = (
  stepIds: StepId[],
  runtimeKey: ActionSequenceKey
): string[] => {
  const errors: string[] = [];

  if (!TRADERA_QUICKLIST_RUNTIME_KEYS.has(runtimeKey)) {
    return errors;
  }

  errors.push(...collectTraderaQuicklistRequiredStepErrors(stepIds, runtimeKey));
  errors.push(...collectTraderaQuicklistPublishErrors(stepIds, runtimeKey));

  return errors;
};

const collectTraderaQuicklistRequiredStepErrors = (
  stepIds: StepId[],
  runtimeKey: ActionSequenceKey
): string[] => {
  if (runtimeKey === 'tradera_quicklist_sync') {
    return stepIds.includes('sync_check')
      ? []
      : [`Runtime action "${runtimeKey}" must include sync_check.`];
  }

  return stepIds.includes('sell_page_open')
    ? []
    : [`Runtime action "${runtimeKey}" must include sell_page_open.`];
};

const collectTraderaQuicklistPublishErrors = (
  stepIds: StepId[],
  runtimeKey: ActionSequenceKey
): string[] => {
  const errors: string[] = [];

  if (!stepIds.includes('publish') || !stepIds.includes('publish_verify')) {
    errors.push(`Runtime action "${runtimeKey}" must include publish and publish_verify.`);
    return errors;
  }

  const publishIndex = stepIds.indexOf('publish');
  const publishVerifyIndex = stepIds.indexOf('publish_verify');

  if (publishVerifyIndex < publishIndex) {
    errors.push(`Runtime action "${runtimeKey}" must place publish_verify after publish.`);
  }

  const formStepsAfterPublish = unique(
    stepIds.slice(publishIndex + 1).filter((stepId) => TRADERA_QUICKLIST_FORM_STEP_IDS.has(stepId))
  );
  if (formStepsAfterPublish.length > 0) {
    errors.push(
      `Runtime action "${runtimeKey}" cannot place form steps after publish: ${formStepsAfterPublish.join(', ')}.`
    );
  }

  return errors;
};

export function validateRuntimeActionEditorBlocks(input: {
  blocks: PlaywrightActionBlock[];
  runtimeKey: ActionSequenceKey;
}): string[] {
  const { blocks, runtimeKey } = input;
  const enabledRuntimeStepIds = getEnabledRuntimeStepIds(blocks);

  return [
    ...collectRuntimeActionShapeErrors(blocks, runtimeKey),
    ...collectRuntimeActionSequenceErrors(enabledRuntimeStepIds, runtimeKey),
    ...collectTraderaQuicklistErrors(enabledRuntimeStepIds, runtimeKey),
  ];
}
