import 'server-only';

import type {
  PlaywrightActionRunArtifact,
  PlaywrightActionRunCodeSnapshot,
  PlaywrightActionRunRecord,
  PlaywrightActionRunRequestSummary,
  PlaywrightActionRunStatus,
  PlaywrightActionRunStepRecord,
  PlaywrightActionRunStepStatus,
} from '@/shared/contracts/playwright-action-runs';
import type { PlaywrightStepInputBinding } from '@/shared/contracts/playwright-steps';
import { getPlaywrightActionRunScrapedItems } from '@/shared/lib/playwright/action-run-scrape-results';
import { upsertPlaywrightActionRunHistory } from '@/shared/lib/playwright/action-run-history-repository';
import {
  createRuntimeStepSemanticSnippet,
  getRuntimeStepInputBindings,
} from '@/shared/lib/playwright/product-scan-runtime-step-snippets';
import {
  createPlaywrightStepCodeSnapshot,
  getPlaywrightStepInputBindings,
} from '@/shared/lib/playwright/step-code-preview';
import { isObjectRecord } from '@/shared/utils/object-utils';

type EngineRunLike = {
  runId: string;
  ownerUserId: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string | null;
  instance?: {
    kind?: string | null;
    family?: string | null;
    label?: string | null;
    connectionId?: string | null;
    integrationId?: string | null;
    listingId?: string | null;
    nodeId?: string | null;
    tags?: string[] | null;
  } | null;
  artifacts: PlaywrightActionRunArtifact[];
  logs: string[];
  requestSummary?: PlaywrightActionRunRequestSummary | null;
};

const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const toNumberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toPositiveIntOrNull = (value: unknown): number | null => {
  const numeric = toNumberOrNull(value);
  return numeric !== null && numeric > 0 ? Math.trunc(numeric) : null;
};

const toStatus = (value: string): PlaywrightActionRunStatus => {
  if (
    value === 'queued' ||
    value === 'running' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'cancelled'
  ) {
    return value;
  }
  return value === 'canceled' ? 'cancelled' : 'failed';
};

const toStepStatus = (value: unknown): PlaywrightActionRunStepStatus => {
  if (
    value === 'pending' ||
    value === 'running' ||
    value === 'success' ||
    value === 'error' ||
    value === 'skipped' ||
    value === 'completed' ||
    value === 'failed'
  ) {
    return value;
  }
  return 'pending';
};

const durationBetween = (startedAt: string | null, completedAt: string | null): number | null => {
  if (!startedAt || !completedAt) return null;
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  if (!Number.isFinite(started) || !Number.isFinite(completed)) return null;
  return Math.max(0, completed - started);
};

const readRecord = (value: unknown, key: string): Record<string, unknown> | null => {
  if (!isObjectRecord(value)) return null;
  const nested = value[key];
  return isObjectRecord(nested) ? nested : null;
};

const resolveResultValue = (result: unknown): Record<string, unknown> => {
  if (!isObjectRecord(result)) return {};
  const outputs = readRecord(result, 'outputs') ?? result;
  return readRecord(outputs, 'result') ?? outputs;
};

const resolveStepsPayload = (result: unknown): unknown[] => {
  const resultValue = resolveResultValue(result);
  const candidates: unknown[] = [
    resultValue['actionRunSteps'],
    readRecord(resultValue, 'result')?.['actionRunSteps'],
    isObjectRecord(result) ? result['actionRunSteps'] : null,
    readRecord(result, 'outputs')?.['actionRunSteps'],
    resultValue['steps'],
    readRecord(resultValue, 'result')?.['steps'],
    isObjectRecord(result) ? result['steps'] : null,
    readRecord(result, 'outputs')?.['steps'],
  ];
  const match = candidates.find((candidate) => Array.isArray(candidate));
  return Array.isArray(match) ? match : [];
};

const readInputArray = (
  summary: PlaywrightActionRunRequestSummary | null | undefined,
  key: string
): unknown[] => {
  const input = summary?.input;
  if (!input || !isObjectRecord(input)) return [];
  const value = input[key];
  return Array.isArray(value) ? value : [];
};

const readInputRecord = (
  summary: PlaywrightActionRunRequestSummary | null | undefined,
  key: string
): Record<string, unknown> | null => {
  const input = summary?.input;
  if (!input || !isObjectRecord(input)) return null;
  const value = input[key];
  return isObjectRecord(value) ? value : null;
};

const readInputString = (
  summary: PlaywrightActionRunRequestSummary | null | undefined,
  key: string
): string | null => {
  const input = summary?.input;
  if (!input || !isObjectRecord(input)) return null;
  return toStringOrNull(input[key]);
};

const normalizeDetails = (
  value: unknown
): Array<{ label: string; value?: string | null }> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): { label: string; value?: string | null } | null => {
      if (!isObjectRecord(entry)) return null;
      const label = toStringOrNull(entry['label']);
      if (!label) return null;
      const detailValue = toStringOrNull(entry['value']);
      return detailValue ? { label, value: detailValue } : { label, value: null };
    })
    .filter((entry): entry is { label: string; value?: string | null } => entry !== null)
    .slice(0, 20);
};

const normalizeArtifacts = (value: unknown): PlaywrightActionRunArtifact[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): PlaywrightActionRunArtifact | null => {
      if (!isObjectRecord(entry)) return null;
      const name = toStringOrNull(entry['name']);
      const path = toStringOrNull(entry['path']);
      if (!name || !path) return null;
      return {
        name,
        path,
        kind: toStringOrNull(entry['kind']),
        mimeType: toStringOrNull(entry['mimeType']),
      };
    })
    .filter((entry): entry is PlaywrightActionRunArtifact => entry !== null);
};

const normalizeInputBindings = (
  value: unknown
): Record<string, PlaywrightStepInputBinding> | undefined => {
  if (!isObjectRecord(value)) return undefined;
  const entries = Object.entries(value)
    .map(([key, rawBinding]): [string, PlaywrightStepInputBinding] | null => {
      if (!isObjectRecord(rawBinding)) return null;
      const mode = rawBinding['mode'];
      if (
        mode !== 'literal' &&
        mode !== 'selectorRegistry' &&
        mode !== 'runtimeVariable' &&
        mode !== 'computed' &&
        mode !== 'disabled'
      ) {
        return null;
      }

      return [
        key,
        {
          mode,
          ...(rawBinding['value'] !== undefined ? { value: rawBinding['value'] } : {}),
          selectorNamespace: toStringOrNull(rawBinding['selectorNamespace']),
          selectorKey: toStringOrNull(rawBinding['selectorKey']),
          selectorProfile: toStringOrNull(rawBinding['selectorProfile']),
          selectorRole: toStringOrNull(rawBinding['selectorRole']) as
            | PlaywrightStepInputBinding['selectorRole']
            | null,
          fallbackSelector: toStringOrNull(rawBinding['fallbackSelector']),
          variableKey: toStringOrNull(rawBinding['variableKey']),
          expression: toStringOrNull(rawBinding['expression']),
          disabledReason: toStringOrNull(rawBinding['disabledReason']),
        },
      ];
    })
    .filter((entry): entry is [string, PlaywrightStepInputBinding] => entry !== null);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const findById = (items: unknown[], id: string | null): Record<string, unknown> | null => {
  if (!id) return null;
  for (const item of items) {
    if (!isObjectRecord(item)) continue;
    if (toStringOrNull(item['id']) === id) return item;
  }
  return null;
};

const buildPlannedStepRecords = (
  run: EngineRunLike,
  request: PlaywrightActionRunRequestSummary | null
): PlaywrightActionRunStepRecord[] => {
  const action = readInputRecord(request, 'action');
  const blocks = Array.isArray(action?.['blocks'])
    ? (action['blocks'] as unknown[])
    : [
        ...readInputArray(request, 'blocks'),
        ...readInputArray(request, 'actionBlocks'),
      ];
  const stepSets = readInputArray(request, 'stepSets');
  const steps = readInputArray(request, 'steps');
  const records: PlaywrightActionRunStepRecord[] = [];
  const now = run.updatedAt;

  const createRecord = (input: {
    id: string;
    parentStepId: string | null;
    sequenceIndex: number;
    depth: number;
    kind: string;
    refId: string | null;
    label: string;
    stepType?: string | null;
    selector?: string | null;
    selectorKey?: string | null;
    selectorProfile?: string | null;
    value?: string | null;
    url?: string | null;
    key?: string | null;
    timeout?: number | null;
    script?: string | null;
    inputBindings?: Record<string, PlaywrightStepInputBinding>;
  }): PlaywrightActionRunStepRecord => {
    const selectorProfile = input.selectorProfile ?? readInputString(request, 'selectorProfile');
    const previewStep = {
      name: input.label,
      type: input.stepType,
      selector: input.selector,
      selectorKey: input.selectorKey,
      selectorProfile,
      value: input.value,
      url: input.url,
      key: input.key,
      timeout: input.timeout,
      script:
        input.script ??
        (input.kind === 'runtime_step' && input.refId
          ? createRuntimeStepSemanticSnippet(input.refId)
          : null),
      inputBindings:
        input.inputBindings ??
        (input.kind === 'runtime_step'
          ? getRuntimeStepInputBindings(input.refId, selectorProfile)
          : undefined),
    };
    const inputBindings = getPlaywrightStepInputBindings(previewStep);
    const codeSnapshot = createPlaywrightStepCodeSnapshot({
      ...previewStep,
      inputBindings,
    });

    return {
      id: input.id,
      runId: run.runId,
      parentStepId: input.parentStepId,
      sequenceIndex: input.sequenceIndex,
      depth: input.depth,
      kind: input.kind,
      refId: input.refId,
      label: input.label,
      stepType: input.stepType ?? null,
      selector: input.selector ?? null,
      selectorKey: input.selectorKey ?? null,
      selectorProfile,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      durationMs: null,
      attempt: null,
      message: null,
      warning: null,
      details: input.value ? [{ label: 'Value', value: input.value }] : [],
      codeSnapshot,
      inputBindings,
      selectorResolution: codeSnapshot.selectorBindings,
      artifacts: [],
      createdAt: run.createdAt,
      updatedAt: now,
    };
  };

  blocks.forEach((block, blockIndex) => {
    if (!isObjectRecord(block)) return;
    const blockKind = toStringOrNull(block['kind']) ?? 'block';
    const blockRefId = toStringOrNull(block['refId']);
    const blockLabel = toStringOrNull(block['label']);
    const blockId = `${run.runId}:planned-block:${blockIndex}:${blockRefId ?? blockKind}`;

    if (blockKind === 'step_set') {
      const stepSet = findById(stepSets, blockRefId);
      const stepSetName = toStringOrNull(stepSet?.['name']) ?? blockLabel ?? blockRefId ?? 'Step set';
      records.push(
        createRecord({
          id: blockId,
          parentStepId: null,
          sequenceIndex: records.length,
          depth: 0,
          kind: 'step_set',
          refId: blockRefId,
          label: stepSetName,
        })
      );

      const rawStepIds = stepSet ? stepSet['stepIds'] : null;
      const stepIds = Array.isArray(rawStepIds) ? rawStepIds : [];
      stepIds.forEach((rawStepId, stepIndex) => {
        const stepId = toStringOrNull(rawStepId);
        const step = findById(steps, stepId);
        records.push(
          createRecord({
            id: `${blockId}:step:${stepIndex}:${stepId ?? 'unknown'}`,
            parentStepId: blockId,
            sequenceIndex: records.length,
            depth: 1,
            kind: 'step',
            refId: stepId,
            label: toStringOrNull(step?.['name']) ?? stepId ?? 'Step',
            stepType: toStringOrNull(step?.['type']),
            selector: toStringOrNull(step?.['selector']),
            selectorKey: toStringOrNull(step?.['selectorKey']),
            selectorProfile: toStringOrNull(step?.['selectorProfile']),
            value: toStringOrNull(step?.['value']),
            url: toStringOrNull(step?.['url']),
            key: toStringOrNull(step?.['key']),
            timeout: toNumberOrNull(step?.['timeout']),
            script: toStringOrNull(step?.['script']),
            inputBindings: normalizeInputBindings(step?.['inputBindings']),
          })
        );
      });
      return;
    }

    if (blockKind === 'step') {
      const step = findById(steps, blockRefId);
      records.push(
        createRecord({
          id: blockId,
          parentStepId: null,
          sequenceIndex: records.length,
          depth: 0,
          kind: 'step',
          refId: blockRefId,
        label: toStringOrNull(step?.['name']) ?? blockLabel ?? blockRefId ?? 'Step',
        stepType: toStringOrNull(step?.['type']),
        selector: toStringOrNull(step?.['selector']),
        selectorKey: toStringOrNull(step?.['selectorKey']),
        selectorProfile: toStringOrNull(step?.['selectorProfile']),
        value: toStringOrNull(step?.['value']),
        url: toStringOrNull(step?.['url']),
        key: toStringOrNull(step?.['key']),
        timeout: toNumberOrNull(step?.['timeout']),
        script: toStringOrNull(step?.['script']),
        inputBindings: normalizeInputBindings(step?.['inputBindings']),
      })
    );
      return;
    }

    records.push(
      createRecord({
        id: blockId,
        parentStepId: null,
        sequenceIndex: records.length,
        depth: 0,
        kind: blockKind,
        refId: blockRefId,
        label: blockLabel ?? blockRefId ?? blockKind,
      })
    );
  });

  if (records.length > 0) return records;

  return steps
    .map((step, index): PlaywrightActionRunStepRecord | null => {
      if (!isObjectRecord(step)) return null;
      const stepId = toStringOrNull(step['id']) ?? `step-${index + 1}`;
      return createRecord({
        id: `${run.runId}:planned-step:${index}:${stepId}`,
        parentStepId: null,
        sequenceIndex: index,
        depth: 0,
        kind: 'step',
        refId: stepId,
        label: toStringOrNull(step['name']) ?? stepId,
        stepType: toStringOrNull(step['type']),
        selector: toStringOrNull(step['selector']),
        selectorKey: toStringOrNull(step['selectorKey']),
        selectorProfile: toStringOrNull(step['selectorProfile']),
        value: toStringOrNull(step['value']),
        url: toStringOrNull(step['url']),
        key: toStringOrNull(step['key']),
        timeout: toNumberOrNull(step['timeout']),
        script: toStringOrNull(step['script']),
        inputBindings: normalizeInputBindings(step['inputBindings']),
      });
    })
    .filter((entry): entry is PlaywrightActionRunStepRecord => entry !== null);
};

const buildStepRecords = (
  run: EngineRunLike,
  request: PlaywrightActionRunRequestSummary | null
): PlaywrightActionRunStepRecord[] => {
  const now = run.updatedAt;
  const rawSteps = resolveStepsPayload(run.result);
  const plannedSteps = readInputArray(request, 'steps');
  return rawSteps
    .map((entry, index): PlaywrightActionRunStepRecord | null => {
      if (!isObjectRecord(entry)) return null;
      const key =
        toStringOrNull(entry['key']) ??
        toStringOrNull(entry['id']) ??
        toStringOrNull(entry['refId']) ??
        `step-${index + 1}`;
      const plannedStep =
        findById(plannedSteps, key) ??
        findById(plannedSteps, toStringOrNull(entry['refId'])) ??
        findById(plannedSteps, toStringOrNull(entry['id']));
      const label =
        toStringOrNull(entry['label']) ??
        toStringOrNull(entry['name']) ??
        toStringOrNull(plannedStep?.['name']) ??
        key;
      const startedAt = toStringOrNull(entry['startedAt']);
      const completedAt = toStringOrNull(entry['completedAt']);
      const durationMs = toPositiveIntOrNull(entry['durationMs']) ?? durationBetween(startedAt, completedAt);
      const selector =
        toStringOrNull(entry['selector']) ??
        toStringOrNull(entry['matchedSelector']) ??
        toStringOrNull(plannedStep?.['selector']);
      const selectorKey =
        toStringOrNull(entry['selectorKey']) ??
        toStringOrNull(plannedStep?.['selectorKey']);
      const selectorProfile =
        toStringOrNull(entry['selectorProfile']) ??
        toStringOrNull(plannedStep?.['selectorProfile']) ??
        readInputString(request, 'selectorProfile');
      const stepType = toStringOrNull(entry['type']) ?? toStringOrNull(plannedStep?.['type']);
      const value = toStringOrNull(entry['value']) ?? toStringOrNull(plannedStep?.['value']);
      const url = toStringOrNull(entry['url']) ?? toStringOrNull(plannedStep?.['url']);
      const keyInput = toStringOrNull(entry['key']) ?? toStringOrNull(plannedStep?.['key']);
      const timeout =
        toNumberOrNull(entry['timeout']) ??
        toNumberOrNull(plannedStep?.['timeout']);
      const script =
        toStringOrNull(entry['script']) ??
        toStringOrNull(plannedStep?.['script']) ??
        (stepType ? null : createRuntimeStepSemanticSnippet(key));
      const normalizedInputBindings =
        normalizeInputBindings(entry['inputBindings']) ??
        normalizeInputBindings(plannedStep?.['inputBindings']) ??
        getRuntimeStepInputBindings(key, selectorProfile);
      const inputBindings = getPlaywrightStepInputBindings({
        name: label,
        type: stepType ?? 'custom_script',
        selector,
        selectorKey,
        selectorProfile,
        value,
        url,
        key: keyInput,
        timeout,
        script,
        inputBindings: normalizedInputBindings,
      });
      const codeSnapshot = createPlaywrightStepCodeSnapshot({
        name: label,
        type: stepType ?? 'custom_script',
        selector,
        selectorKey,
        selectorProfile,
        value,
        url,
        key: keyInput,
        timeout,
        script,
        inputBindings,
      });

      return {
        id: `${run.runId}:${index}:${key}`,
        runId: run.runId,
        parentStepId: toStringOrNull(entry['parentStepId']),
        sequenceIndex: index,
        depth: Math.max(0, Math.trunc(toNumberOrNull(entry['depth']) ?? 0)),
        kind: toStringOrNull(entry['kind']) ?? toStringOrNull(entry['group']) ?? 'step',
        refId: key,
        label,
        stepType,
        selector,
        selectorKey,
        selectorProfile,
        status: toStepStatus(entry['status']),
        startedAt,
        completedAt,
        durationMs,
        attempt: toPositiveIntOrNull(entry['attempt']),
        message: toStringOrNull(entry['message']),
        warning: toStringOrNull(entry['warning']),
        details: normalizeDetails(entry['details']),
        codeSnapshot,
        inputBindings,
        selectorResolution: codeSnapshot.selectorBindings,
        ...(entry['input'] !== undefined ? { input: entry['input'] } : {}),
        ...(entry['output'] !== undefined ? { output: entry['output'] } : {}),
        artifacts: normalizeArtifacts(entry['artifacts']),
        createdAt: run.createdAt,
        updatedAt: now,
      };
    })
    .filter((entry): entry is PlaywrightActionRunStepRecord => entry !== null);
};

const buildActionCodeSnapshot = (
  steps: PlaywrightActionRunStepRecord[],
  generatedAt: string
): PlaywrightActionRunCodeSnapshot | null => {
  const rows = steps.filter((step) => step.codeSnapshot);
  if (rows.length === 0) return null;

  return {
    language: 'playwright-ts',
    semanticSnippet: rows
      .map(
        (step, index) =>
          `// ${index + 1}. ${step.label}\n${step.codeSnapshot?.semanticSnippet ?? ''}`
      )
      .join('\n\n'),
    resolvedSnippet: rows
      .map(
        (step, index) =>
          `// ${index + 1}. ${step.label}\n${step.codeSnapshot?.resolvedSnippet ?? ''}`
      )
      .join('\n\n'),
    unresolvedBindings: Array.from(
      new Set(
        rows.flatMap((step) =>
          (step.codeSnapshot?.unresolvedBindings ?? []).map(
            (binding) => `${step.label}: ${binding}`
          )
        )
      )
    ),
    generatedAt,
  };
};

const sanitizeRequestSummary = (
  value: PlaywrightActionRunRequestSummary | null | undefined
): PlaywrightActionRunRequestSummary | null => {
  if (!value) return null;
  return {
    startUrl: value.startUrl ?? null,
    browserEngine: value.browserEngine ?? null,
    timeoutMs: value.timeoutMs ?? null,
    runtimeKey: value.runtimeKey ?? null,
    actionId: value.actionId ?? null,
    actionName: value.actionName ?? null,
    selectorProfile: value.selectorProfile ?? null,
    input: value.input ?? null,
    capture: value.capture ?? null,
  };
};

export async function recordPlaywrightActionRunSnapshot(run: EngineRunLike): Promise<void> {
  const request = sanitizeRequestSummary(run.requestSummary);
  const resultValue = resolveResultValue(run.result);
  const action = readInputRecord(request, 'action');
  const actionId =
    request?.actionId ??
    readInputString(request, 'actionId') ??
    toStringOrNull(action?.['id']) ??
    readInputString(request, 'id');
  const runtimeKey =
    request?.runtimeKey ??
    readInputString(request, 'runtimeKey') ??
    toStringOrNull(action?.['runtimeKey']) ??
    readInputString(request, 'actionKey') ??
    readInputString(request, 'sequenceKey') ??
    toStringOrNull(resultValue['actionKey']) ??
    toStringOrNull(resultValue['sequenceKey']);
  const actionName =
    request?.actionName ??
    readInputString(request, 'actionName') ??
    toStringOrNull(action?.['name']) ??
    toStringOrNull(resultValue['actionName']) ??
    run.instance?.label ??
    runtimeKey ??
    'Playwright action run';
  const startedAt = run.startedAt;
  const completedAt = run.completedAt;
  const actualSteps = buildStepRecords(run, request);
  const plannedSteps = actualSteps.length === 0 ? buildPlannedStepRecords(run, request) : [];
  const steps = actualSteps.length > 0 ? actualSteps : plannedSteps;
  const codeSnapshot = buildActionCodeSnapshot(steps, run.updatedAt);
  const scrapedItems = getPlaywrightActionRunScrapedItems(run.result);
  const selectorProfile =
    request?.selectorProfile ??
    readInputString(request, 'selectorProfile') ??
    toStringOrNull(resultValue['selectorProfile']);

  const record: PlaywrightActionRunRecord = {
    runId: run.runId,
    ownerUserId: run.ownerUserId,
    actionId,
    actionName,
    runtimeKey,
    personaId: readInputString(request, 'personaId'),
    status: toStatus(run.status),
    startedAt,
    completedAt,
    durationMs: durationBetween(startedAt, completedAt),
    selectorProfile,
    websiteId: readInputString(request, 'websiteId'),
    flowId: readInputString(request, 'flowId'),
    connectionId: run.instance?.connectionId ?? null,
    integrationId: run.instance?.integrationId ?? null,
    listingId: run.instance?.listingId ?? null,
    instanceKind: run.instance?.kind ?? null,
    instanceFamily: run.instance?.family ?? null,
    instanceLabel: run.instance?.label ?? null,
    tags: Array.isArray(run.instance?.tags) ? run.instance.tags.filter(Boolean) : [],
    request,
    codeSnapshot,
    ...(scrapedItems.length > 0 ? { scrapedItems } : {}),
    ...(run.result !== undefined ? { result: run.result } : {}),
    error: run.error ?? null,
    artifacts: normalizeArtifacts(run.artifacts),
    logs: Array.isArray(run.logs) ? run.logs : [],
    stepCount: steps.length,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };

  await upsertPlaywrightActionRunHistory({ run: record, steps });
}
