import type { Page } from 'playwright';

import { withFilemakerOrganizationPresenceScanActionRunSteps } from '@/features/playwright/scan-steps';
import { FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/filemaker-organization-presence-runtime-constants';
import {
  FilemakerOrganizationPresenceSequencer,
  type FilemakerOrganizationPresenceScrapeInput,
} from '@/shared/lib/browser-execution/sequencers/FilemakerOrganizationPresenceSequencer';

export { FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY };

type ExecuteFilemakerOrganizationPresenceScrapeRuntimeInput = {
  emit: (port: string, value: unknown) => void;
  input: Record<string, unknown>;
  log: (...args: unknown[]) => void;
  page: Page;
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
    ? withFilemakerOrganizationPresenceScanActionRunSteps(resultPayload)
    : {
        status: 'completed',
        message: 'FileMaker organisation discovery completed without an explicit payload.',
      };
}
