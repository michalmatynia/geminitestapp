import type { Page } from 'playwright';

import { withJobBoardScanActionRunSteps } from '@/features/playwright/scan-steps';
import { JOB_BOARD_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-board-runtime-constants';
import {
  JobBoardScrapeSequencer,
  type JobBoardScrapeInput,
} from '@/shared/lib/browser-execution/sequencers/JobBoardScrapeSequencer';

export { JOB_BOARD_SCRAPE_RUNTIME_KEY };

type ExecuteJobBoardScrapeRuntimeInput = {
  emit: (port: string, value: unknown) => void;
  helpers?: unknown;
  input: Record<string, unknown>;
  log: (...args: unknown[]) => void;
  page: Page;
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
    ? withJobBoardScanActionRunSteps(resultPayload)
    : {
        status: 'completed',
        message: 'Job board scrape completed without an explicit payload.',
      };
}
