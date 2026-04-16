import 'server-only';

import type { Page } from 'playwright';

import type { IntegrationRepository } from '@/shared/contracts/integrations/repositories';
import {
  persistPlaywrightConnectionStorageState,
} from './storage-state';
import type { PlaywrightConnectionTestPushStep } from './connection-test-steps';

export type PersistPlaywrightConnectionTestSessionInput = {
  connectionId: string;
  page: Page;
  repo: Pick<IntegrationRepository, 'updateConnection'>;
  pushStep: PlaywrightConnectionTestPushStep;
  stepName?: string;
  pendingDetail: string;
  successDetail: string;
  failureDetail: string;
  throwOnFailure?: boolean;
};

export const persistPlaywrightConnectionTestSession = async (
  input: PersistPlaywrightConnectionTestSessionInput
): Promise<boolean> => {
  const stepName = input.stepName ?? 'Saving session';
  input.pushStep(stepName, 'pending', input.pendingDetail);

  try {
    const storageState = await input.page.context().storageState();
    await persistPlaywrightConnectionStorageState({
      connectionId: input.connectionId,
      storageState,
      updatedAt: new Date().toISOString(),
      repo: input.repo,
    });
    input.pushStep(stepName, 'ok', input.successDetail);
    return true;
  } catch (error) {
    input.pushStep(stepName, 'failed', input.failureDetail);
    if (input.throwOnFailure ?? true) {
      throw error;
    }
    return false;
  }
};
