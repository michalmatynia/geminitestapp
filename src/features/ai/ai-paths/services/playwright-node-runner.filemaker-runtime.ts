/* eslint-disable max-lines-per-function */

import type { Page } from 'playwright';

import {
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS,
} from '@/shared/lib/browser-execution/filemaker-organization-presence-runtime-constants';
import {
  FilemakerOrganizationPresenceSequencer,
  type FilemakerOrganizationPresenceScrapeInput,
  type FilemakerOrganizationPresenceStep,
} from '@/shared/lib/browser-execution/sequencers/FilemakerOrganizationPresenceSequencer';

export { FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY };

type ExecuteFilemakerOrganizationPresenceScrapeRuntimeInput = {
  emit: (port: string, value: unknown) => void;
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

const toActionRunStep = (
  step: FilemakerOrganizationPresenceStep,
  index: number
): Record<string, unknown> => ({
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

const createFilemakerOrganizationPresenceActionRunSteps = (
  payload: unknown
): Array<Record<string, unknown>> => {
  if (!isRecord(payload) || !Array.isArray(payload['steps'])) return [];
  const mappedSteps = payload['steps']
    .filter((step): step is FilemakerOrganizationPresenceStep => isRecord(step))
    .map(toActionRunStep);
  const firstStep = mappedSteps[0] ?? null;
  const lastStep = mappedSteps[mappedSteps.length - 1] ?? null;
  const lifecycleStartedAt = readString(firstStep?.['startedAt']);
  const lifecycleCompletedAt = readString(lastStep?.['completedAt']);

  return [
    {
      key: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserPreparation,
      refId: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserPreparation,
      kind: 'runtime_step',
      order: 1,
      label: 'Prepare browser runtime',
      status: 'completed',
      message: 'Browser runtime prepared for FileMaker organisation discovery.',
      warning: null,
      details: [],
      url: null,
      startedAt: lifecycleStartedAt,
      completedAt: lifecycleStartedAt,
      durationMs: null,
      output: null,
    },
    {
      key: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserOpen,
      refId: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserOpen,
      kind: 'runtime_step',
      order: 2,
      label: 'Open browser',
      status: 'completed',
      message: 'Browser page opened for FileMaker organisation discovery.',
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
      key: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserClose,
      refId: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserClose,
      kind: 'runtime_step',
      order: mappedSteps.length + 3,
      label: 'Close browser',
      status: 'completed',
      message: 'Browser runtime released after FileMaker organisation discovery.',
      warning: null,
      details: [],
      url: readString(payload['currentUrl']),
      startedAt: lifecycleCompletedAt,
      completedAt: lifecycleCompletedAt,
      durationMs: null,
      output: {
        status: readString(payload['status']),
      },
    },
  ];
};

const withFilemakerOrganizationPresenceActionRunSteps = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;
  const actionRunSteps = createFilemakerOrganizationPresenceActionRunSteps(payload);
  return actionRunSteps.length === 0 ? payload : { ...payload, actionRunSteps };
};

export async function executeFilemakerOrganizationPresenceScrapeRuntime(
  input: ExecuteFilemakerOrganizationPresenceScrapeRuntimeInput
): Promise<unknown> {
  let resultPayload: unknown = null;
  const sequencer = new FilemakerOrganizationPresenceSequencer(
    {
      page: input.page,
      emit: (type, payload) => {
        if (type === 'result') resultPayload = payload;
        input.emit(type, payload);
      },
      log: (message, context) => input.log(message, context),
    },
    input.input as FilemakerOrganizationPresenceScrapeInput
  );

  await sequencer.scan();

  return resultPayload !== null
    ? withFilemakerOrganizationPresenceActionRunSteps(resultPayload)
    : {
        status: 'completed',
        message: 'FileMaker organisation discovery completed without an explicit payload.',
      };
}
