import type { MasterTreeNode } from '@/shared/contracts/master-folder-tree';
import type {
  PlaywrightActionRunDetailResponse,
  PlaywrightActionRunStepRecord,
  PlaywrightActionRunSummary,
} from '@/shared/contracts/playwright-action-runs';

const DATE_FOLDER_PREFIX = 'pw_run_date__';
const RUN_NODE_PREFIX = 'pw_run__';
const STEP_NODE_PREFIX = 'pw_run_step__';

export type PlaywrightActionRunTreeEntity = 'date' | 'run' | 'step';

export function encodePlaywrightActionRunDateNodeId(dateKey: string): string {
  return `${DATE_FOLDER_PREFIX}${dateKey}`;
}

export function encodePlaywrightActionRunNodeId(runId: string): string {
  return `${RUN_NODE_PREFIX}${runId}`;
}

export function encodePlaywrightActionRunStepNodeId(stepId: string): string {
  return `${STEP_NODE_PREFIX}${stepId}`;
}

export function decodePlaywrightActionRunNodeId(
  nodeId: string
): { entity: PlaywrightActionRunTreeEntity; id: string } | null {
  if (nodeId.startsWith(DATE_FOLDER_PREFIX)) {
    return { entity: 'date', id: nodeId.slice(DATE_FOLDER_PREFIX.length) };
  }
  if (nodeId.startsWith(RUN_NODE_PREFIX)) {
    return { entity: 'run', id: nodeId.slice(RUN_NODE_PREFIX.length) };
  }
  if (nodeId.startsWith(STEP_NODE_PREFIX)) {
    return { entity: 'step', id: nodeId.slice(STEP_NODE_PREFIX.length) };
  }
  return null;
}

const formatDateKey = (value: string | null | undefined): string => {
  if (!value) return 'unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'unknown';
  return parsed.toISOString().slice(0, 10);
};

const formatDateLabel = (dateKey: string): string => {
  if (dateKey === 'unknown') return 'Unknown date';
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(parsed);
};

const makeDateNode = (dateKey: string, sortOrder: number): MasterTreeNode => ({
  id: encodePlaywrightActionRunDateNodeId(dateKey),
  type: 'folder',
  kind: 'playwright_action_run_date',
  parentId: null,
  name: formatDateLabel(dateKey),
  path: dateKey,
  sortOrder,
  metadata: {
    dateKey,
  },
});

const makeRunNode = (
  run: PlaywrightActionRunSummary,
  parentDateKey: string,
  sortOrder: number
): MasterTreeNode => ({
  id: encodePlaywrightActionRunNodeId(run.runId),
  type: 'folder',
  kind: 'playwright_action_run',
  parentId: encodePlaywrightActionRunDateNodeId(parentDateKey),
  name: run.actionName,
  path: `${parentDateKey}/${run.actionName}`,
  sortOrder,
  metadata: {
    runId: run.runId,
    actionId: run.actionId,
    runtimeKey: run.runtimeKey,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.durationMs,
    selectorProfile: run.selectorProfile,
    instanceKind: run.instanceKind,
    instanceLabel: run.instanceLabel,
    stepCount: run.stepCount,
  },
});

const makeStepNode = (
  step: PlaywrightActionRunStepRecord,
  runId: string,
  sortOrder: number,
  hasChildSteps: boolean
): MasterTreeNode => ({
  id: encodePlaywrightActionRunStepNodeId(step.id),
  type: hasChildSteps ? 'folder' : 'file',
  kind: 'playwright_action_run_step',
  parentId: step.parentStepId
    ? encodePlaywrightActionRunStepNodeId(step.parentStepId)
    : encodePlaywrightActionRunNodeId(runId),
  name: step.label,
  path: `${runId}/${step.sequenceIndex + 1}-${step.label}`,
  sortOrder,
  metadata: {
    runId,
    stepId: step.id,
    refId: step.refId,
    status: step.status,
    kind: step.kind,
    stepType: step.stepType,
    selector: step.selector,
    selectorKey: step.selectorKey,
    selectorProfile: step.selectorProfile,
    startedAt: step.startedAt,
    completedAt: step.completedAt,
    durationMs: step.durationMs,
  },
});

export function buildPlaywrightActionRunMasterNodes(input: {
  runs: PlaywrightActionRunSummary[];
  selectedRunDetail?: PlaywrightActionRunDetailResponse | null;
}): MasterTreeNode[] {
  const nodes: MasterTreeNode[] = [];
  const dateKeys = Array.from(
    new Set(input.runs.map((run) => formatDateKey(run.startedAt ?? run.createdAt)))
  );

  dateKeys.forEach((dateKey, index) => {
    nodes.push(makeDateNode(dateKey, index));
  });

  input.runs.forEach((run, index) => {
    const dateKey = formatDateKey(run.startedAt ?? run.createdAt);
    nodes.push(makeRunNode(run, dateKey, index));
  });

  if (input.selectedRunDetail) {
    const parentStepIds = new Set(
      input.selectedRunDetail.steps
        .map((step) => step.parentStepId)
        .filter((stepId): stepId is string => typeof stepId === 'string' && stepId.length > 0)
    );
    input.selectedRunDetail.steps.forEach((step, index) => {
      nodes.push(
        makeStepNode(
          step,
          input.selectedRunDetail!.run.runId,
          index,
          parentStepIds.has(step.id)
        )
      );
    });
  }

  return nodes;
}
