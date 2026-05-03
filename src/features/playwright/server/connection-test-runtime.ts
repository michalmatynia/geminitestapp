import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import { resolvePlaywrightConnectionRuntime } from './connection-runtime';
import {
  pushPlaywrightStoredSessionLoadingSteps,
  type PlaywrightConnectionTestPushStep,
} from './connection-test-steps';

type PlaywrightConnectionTestFail = (
  step: string,
  detail: string,
  status?: number
) => Promise<never>;

export type ResolvePlaywrightConnectionTestRuntimeInput = {
  connection: IntegrationConnectionRecord;
  pushStep: PlaywrightConnectionTestPushStep;
  fail?: PlaywrightConnectionTestFail;
  settingsStep?: {
    pendingDetail: string;
    successDetail: string;
    failureDetail: string;
    stepName?: string;
  };
  storedSession?: {
    loadedDetail: string;
    missingDetail: string;
    missingStatus?: 'ok' | 'failed';
    stepName?: string;
    pendingDetail?: string;
  };
};

export const resolvePlaywrightConnectionTestRuntime = async (
  input: ResolvePlaywrightConnectionTestRuntimeInput
) => {
  const settingsStepName = input.settingsStep?.stepName ?? 'Loading Playwright settings';

  if (input.settingsStep) {
    input.pushStep(settingsStepName, 'pending', input.settingsStep.pendingDetail);
  }

  try {
    const runtime = await resolvePlaywrightConnectionRuntime(input.connection);

    if (input.storedSession) {
      pushPlaywrightStoredSessionLoadingSteps({
        hasStoredSession: Boolean(input.connection.playwrightStorageState),
        storageState: runtime.storageState,
        pushStep: input.pushStep,
        loadedDetail: input.storedSession.loadedDetail,
        missingDetail: input.storedSession.missingDetail,
        ...(input.storedSession.missingStatus
          ? { missingStatus: input.storedSession.missingStatus }
          : {}),
        ...(input.storedSession.stepName ? { stepName: input.storedSession.stepName } : {}),
        ...(input.storedSession.pendingDetail
          ? { pendingDetail: input.storedSession.pendingDetail }
          : {}),
      });
    }

    if (input.settingsStep) {
      input.pushStep(settingsStepName, 'ok', input.settingsStep.successDetail);
    }

    return runtime;
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (input.settingsStep && input.fail) {
      return input.fail(settingsStepName, input.settingsStep.failureDetail);
    }
    throw error;
  }
};
