import 'server-only';

import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import {
  getPlaywrightActionRunDetail,
  listPlaywrightActionRuns,
} from '@/shared/lib/playwright/action-run-history-repository';
import {
  getPlaywrightActionRunResultRecord,
  getPlaywrightActionRunScrapedItems,
} from '@/shared/lib/playwright/action-run-scrape-results';

import { runPlaywrightProgrammableImportForConnection } from './programmable';

export type PlaywrightProgrammableImportSourceMeta =
  | {
      type: 'script';
      actionId: string | null;
      runId: null;
    }
  | {
      type: 'retained_action_run';
      actionId: string;
      runId: string;
      failedStepId: string | null;
      failedStepRefId: string | null;
      failedStepLabel: string | null;
    };

export type PlaywrightProgrammableImportSourceResult = {
  products: Array<Record<string, unknown>>;
  rawResult: Record<string, unknown>;
  source: PlaywrightProgrammableImportSourceMeta;
};

const getNormalizedImportActionId = (
  connection: IntegrationConnectionRecord
): string | null => {
  const actionId = connection.playwrightImportActionId?.trim();
  return actionId && actionId.length > 0 ? actionId : null;
};

const getImportScript = (connection: IntegrationConnectionRecord): string | null => {
  const script = connection.playwrightImportScript?.trim();
  return script && script.length > 0 ? script : null;
};

const getFirstFailedRetainedRunStep = (
  steps: Array<{
    id?: unknown;
    refId?: unknown;
    label?: unknown;
    status?: unknown;
  }>
): {
  id: string | null;
  refId: string | null;
  label: string | null;
} => {
  const failedStep =
    steps.find((step) => step.status === 'failed' || step.status === 'error') ?? null;

  return {
    id: typeof failedStep?.id === 'string' && failedStep.id.trim().length > 0 ? failedStep.id : null,
    refId:
      typeof failedStep?.refId === 'string' && failedStep.refId.trim().length > 0
        ? failedStep.refId
        : null,
    label:
      typeof failedStep?.label === 'string' && failedStep.label.trim().length > 0
        ? failedStep.label
        : null,
  };
};

export const resolvePlaywrightProgrammableImportSource = async ({
  connection,
  input,
}: {
  connection: IntegrationConnectionRecord;
  input: Record<string, unknown>;
}): Promise<PlaywrightProgrammableImportSourceResult> => {
  const actionId = getNormalizedImportActionId(connection);

  if (getImportScript(connection) !== null) {
    const result = await runPlaywrightProgrammableImportForConnection({
      connection,
      input,
    });

    return {
      products: result.products,
      rawResult: result.rawResult,
      source: {
        type: 'script',
        actionId,
        runId: null,
      },
    };
  }

  if (actionId === null) {
    throw new Error(
      'This connection does not have a Playwright import script or import action configured.'
    );
  }

  const latestRunResponse = await listPlaywrightActionRuns({
    actionId,
    status: 'completed',
    limit: 1,
  });
  const latestRun = latestRunResponse.runs[0] ?? null;

  if (latestRun === null) {
    throw new Error(`No retained Playwright action run found for import action "${actionId}".`);
  }

  const detail = await getPlaywrightActionRunDetail(latestRun.runId);
  if (detail === null) {
    throw new Error(`Retained Playwright action run "${latestRun.runId}" could not be loaded.`);
  }

  const firstFailedStep = getFirstFailedRetainedRunStep(detail.steps);

  return {
    products:
      Array.isArray(detail.run.scrapedItems) && detail.run.scrapedItems.length > 0
        ? detail.run.scrapedItems
        : getPlaywrightActionRunScrapedItems(detail.run.result),
    rawResult: getPlaywrightActionRunResultRecord(detail.run.result) ?? {},
    source: {
      type: 'retained_action_run',
      actionId,
      runId: latestRun.runId,
      failedStepId: firstFailedStep.id,
      failedStepRefId: firstFailedStep.refId,
      failedStepLabel: firstFailedStep.label,
    },
  };
};
