/* eslint-disable max-lines-per-function */

import type { Page } from 'playwright';

import {
  JOB_BOARD_SCRAPE_RUNTIME_KEY,
  JOB_BOARD_SCRAPE_RUNTIME_STEPS,
} from '@/shared/lib/browser-execution/job-board-runtime-constants';
import {
  JobBoardScrapeSequencer,
  type JobBoardScrapeInput,
  type JobBoardScrapeStep,
} from '@/shared/lib/browser-execution/sequencers/JobBoardScrapeSequencer';

export { JOB_BOARD_SCRAPE_RUNTIME_KEY };

type ExecuteJobBoardScrapeRuntimeInput = {
  emit: (port: string, value: unknown) => void;
  helpers?: unknown;
  input: Record<string, unknown>;
  log: (...args: unknown[]) => void;
  page: Page;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const mapStepStatus = (status: string | null): string => {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'skipped') return 'skipped';
  if (status === 'running') return 'running';
  return 'pending';
};

const toActionRunStep = (step: JobBoardScrapeStep, index: number): Record<string, unknown> => ({
  key: step.key,
  refId: step.key,
  kind: 'runtime_step',
  order: index + 3,
  label: step.label,
  status: mapStepStatus(step.status),
  message: step.message,
  warning: step.warning,
  details: step.details,
  url: step.url,
  startedAt: step.startedAt,
  completedAt: step.completedAt,
  durationMs: step.durationMs,
  output: null,
});

const createJobBoardActionRunSteps = (payload: unknown): Array<Record<string, unknown>> => {
  if (!isRecord(payload) || !Array.isArray(payload['steps'])) return [];
  const mappedSteps = payload['steps']
    .filter((step): step is JobBoardScrapeStep => isRecord(step))
    .map(toActionRunStep);
  const firstStep = mappedSteps[0] ?? null;
  const lastStep = mappedSteps[mappedSteps.length - 1] ?? null;
  const lifecycleStartedAt = readString(firstStep?.['startedAt']);
  const lifecycleCompletedAt = readString(lastStep?.['completedAt']);

  return [
    {
      key: JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserPreparation,
      refId: JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserPreparation,
      kind: 'runtime_step',
      order: 1,
      label: 'Prepare browser runtime',
      status: 'completed',
      message: 'Browser runtime prepared for job board scraping.',
      warning: null,
      details: [],
      url: null,
      startedAt: lifecycleStartedAt,
      completedAt: lifecycleStartedAt,
      durationMs: null,
      output: null,
    },
    {
      key: JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserOpen,
      refId: JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserOpen,
      kind: 'runtime_step',
      order: 2,
      label: 'Open browser',
      status: 'completed',
      message: 'Browser page opened for job board scraping.',
      warning: null,
      details: [],
      url: readString(payload['currentUrl']),
      startedAt: lifecycleStartedAt,
      completedAt: lifecycleStartedAt,
      durationMs: null,
      output: null,
    },
    ...mappedSteps,
    {
      key: JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserClose,
      refId: JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserClose,
      kind: 'runtime_step',
      order: mappedSteps.length + 3,
      label: 'Close browser',
      status: 'completed',
      message: 'Browser runtime released after job board scraping.',
      warning: null,
      details: [],
      url: readString(payload['currentUrl']),
      startedAt: lifecycleCompletedAt,
      completedAt: lifecycleCompletedAt,
      durationMs: null,
      output: {
        status: readString(payload['status']),
        provider: readString(payload['provider']),
      },
    },
  ];
};

const withJobBoardActionRunSteps = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;
  const actionRunSteps = createJobBoardActionRunSteps(payload);
  return actionRunSteps.length === 0 ? payload : { ...payload, actionRunSteps };
};

export async function executeJobBoardScrapeRuntime(
  input: ExecuteJobBoardScrapeRuntimeInput
): Promise<unknown> {
  let resultPayload: unknown = null;
  const sequencer = new JobBoardScrapeSequencer(
    {
      page: input.page,
      helpers: input.helpers,
      emit: (type, payload) => {
        if (type === 'result') resultPayload = payload;
        input.emit(type, payload);
      },
      log: (message, context) => input.log(message, context),
    },
    input.input as JobBoardScrapeInput
  );

  await sequencer.scan();

  return resultPayload !== null
    ? withJobBoardActionRunSteps(resultPayload)
    : {
        status: 'completed',
        message: 'Job board scrape completed without an explicit payload.',
      };
}
