export type PlaywrightScanActionRunStep = Record<string, unknown>;

export type PlaywrightScanStepMapper = (
  step: Record<string, unknown>,
  index: number
) => PlaywrightScanActionRunStep[];

type LifecycleTiming = 'start' | 'completed' | 'completedWithStartedFallback';

type PlaywrightScanLifecycleContext = {
  startedAt: string | null;
  completedAt: string | null;
  completedAtWithStartedFallback: string | null;
};

type PlaywrightScanLifecycleValue<T> =
  | T
  | ((payload: Record<string, unknown>, context: PlaywrightScanLifecycleContext) => T);

export type PlaywrightScanLifecycleStep = {
  key: string;
  label: string;
  message: PlaywrightScanLifecycleValue<string | null>;
  status?: PlaywrightScanLifecycleValue<string>;
  warning?: PlaywrightScanLifecycleValue<string | null>;
  output?: PlaywrightScanLifecycleValue<unknown>;
  url?: PlaywrightScanLifecycleValue<string | null>;
  startedTiming: LifecycleTiming;
  completedTiming: LifecycleTiming;
};

export type BuildPlaywrightScanActionRunStepsInput = {
  payload: unknown;
  mapStep: PlaywrightScanStepMapper;
  includeLifecycleWithoutMappedSteps?: boolean;
  preparation: PlaywrightScanLifecycleStep;
  open: PlaywrightScanLifecycleStep;
  finalize?: PlaywrightScanLifecycleStep | null;
  close: PlaywrightScanLifecycleStep;
};

export type WithPlaywrightScanActionRunStepsInput = Omit<
  BuildPlaywrightScanActionRunStepsInput,
  'payload'
>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const readFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const readArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export const mapPlaywrightScanStepStatus = (status: string | null): string => {
  if (
    status === 'completed' ||
    status === 'failed' ||
    status === 'skipped' ||
    status === 'running'
  ) {
    return status;
  }
  return 'pending';
};

export const buildScanStepActionRunStep = (input: {
  key: string;
  label: string;
  status: string | null;
  message: unknown;
  warning: unknown;
  details: unknown;
  url: unknown;
  startedAt: unknown;
  completedAt: unknown;
  durationMs: unknown;
  output: unknown;
}): PlaywrightScanActionRunStep => ({
  key: input.key,
  refId: input.key,
  kind: 'runtime_step',
  label: input.label,
  status: mapPlaywrightScanStepStatus(readString(input.status)),
  message: readString(input.message),
  warning: readString(input.warning),
  details: readArray(input.details),
  url: readString(input.url),
  startedAt: readString(input.startedAt),
  completedAt: readString(input.completedAt),
  durationMs: readFiniteNumber(input.durationMs),
  output: input.output,
});

const resolveLifecycleContext = (
  steps: readonly PlaywrightScanActionRunStep[]
): PlaywrightScanLifecycleContext => {
  const firstStep = steps[0] ?? null;
  const lastStep = steps[steps.length - 1] ?? null;
  const startedAt = readString(firstStep?.['startedAt']);
  const lastStartedAt = readString(lastStep?.['startedAt']);
  const completedAt = readString(lastStep?.['completedAt']);
  return {
    startedAt,
    completedAt,
    completedAtWithStartedFallback: completedAt ?? lastStartedAt,
  };
};

const resolveLifecycleValue = <T>(
  value: PlaywrightScanLifecycleValue<T> | undefined,
  payload: Record<string, unknown>,
  context: PlaywrightScanLifecycleContext,
  fallback: T
): T => {
  if (typeof value !== 'function') {
    return value ?? fallback;
  }
  return (value as (payload: Record<string, unknown>, context: PlaywrightScanLifecycleContext) => T)(
    payload,
    context
  );
};

const resolveTiming = (
  timing: LifecycleTiming,
  context: PlaywrightScanLifecycleContext
): string | null => {
  if (timing === 'start') return context.startedAt;
  if (timing === 'completedWithStartedFallback') return context.completedAtWithStartedFallback;
  return context.completedAt;
};

const buildLifecycleActionRunStep = (
  step: PlaywrightScanLifecycleStep,
  order: number,
  payload: Record<string, unknown>,
  context: PlaywrightScanLifecycleContext
): PlaywrightScanActionRunStep => ({
  key: step.key,
  refId: step.key,
  kind: 'runtime_step',
  order,
  label: step.label,
  status: resolveLifecycleValue(step.status, payload, context, 'completed'),
  message: resolveLifecycleValue(step.message, payload, context, null),
  warning: resolveLifecycleValue(step.warning, payload, context, null),
  details: [],
  url: resolveLifecycleValue(step.url, payload, context, null),
  startedAt: resolveTiming(step.startedTiming, context),
  completedAt: resolveTiming(step.completedTiming, context),
  durationMs: null,
  output: resolveLifecycleValue(step.output, payload, context, null),
});

const mapPayloadSteps = (
  payload: Record<string, unknown>,
  mapper: PlaywrightScanStepMapper
): PlaywrightScanActionRunStep[] =>
  readArray(payload['steps'])
    .flatMap((step, index) => (isRecord(step) ? mapper(step, index) : []))
    .map((step, index) => ({ ...step, order: index + 3 }));

export const buildPlaywrightScanActionRunSteps = (
  input: BuildPlaywrightScanActionRunStepsInput
): PlaywrightScanActionRunStep[] => {
  if (!isRecord(input.payload) || !Array.isArray(input.payload['steps'])) return [];

  const mappedSteps = mapPayloadSteps(input.payload, input.mapStep);
  if (mappedSteps.length === 0 && input.includeLifecycleWithoutMappedSteps !== true) {
    return [];
  }

  const context = resolveLifecycleContext(mappedSteps);
  const lifecycleStart = [
    buildLifecycleActionRunStep(input.preparation, 1, input.payload, context),
    buildLifecycleActionRunStep(input.open, 2, input.payload, context),
  ];
  const finalize =
    input.finalize === null || input.finalize === undefined
      ? []
      : [buildLifecycleActionRunStep(input.finalize, mappedSteps.length + 3, input.payload, context)];
  const closeOrder = mappedSteps.length + (finalize.length > 0 ? 4 : 3);

  return [
    ...lifecycleStart,
    ...mappedSteps,
    ...finalize,
    buildLifecycleActionRunStep(input.close, closeOrder, input.payload, context),
  ];
};

export const withPlaywrightScanActionRunSteps = (
  payload: unknown,
  input: WithPlaywrightScanActionRunStepsInput
): unknown => {
  if (!isRecord(payload)) return payload;
  const actionRunSteps = buildPlaywrightScanActionRunSteps({ ...input, payload });
  return actionRunSteps.length === 0 ? payload : { ...payload, actionRunSteps };
};
