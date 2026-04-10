import 'server-only';

import {
  openPlaywrightConnectionPageSession,
  type OpenPlaywrightConnectionPageSessionInput,
  type OpenPlaywrightConnectionPageSessionResult,
} from './browser-session';
import {
  pushPlaywrightBrowserSelectionSteps,
  type PlaywrightConnectionTestPushStep,
} from './connection-test-steps';

export type OpenPlaywrightConnectionTestSessionInput = Omit<
  OpenPlaywrightConnectionPageSessionInput,
  'connection'
> & {
  connection: OpenPlaywrightConnectionPageSessionInput['connection'];
  pushStep: PlaywrightConnectionTestPushStep;
  launchStep?: {
    stepName: string;
    pendingDetail: string;
    successDetail?: string;
  };
  browserSelectionStepName?: string;
};

export const openPlaywrightConnectionTestSession = async (
  input: OpenPlaywrightConnectionTestSessionInput
): Promise<OpenPlaywrightConnectionPageSessionResult> => {
  if (input.launchStep) {
    input.pushStep(
      input.launchStep.stepName,
      'pending',
      input.launchStep.pendingDetail
    );
  }

  const session = await openPlaywrightConnectionPageSession({
    connection: input.connection,
    ...(input.instance ? { instance: input.instance } : {}),
    ...(input.runtime ? { runtime: input.runtime } : {}),
    ...(input.browserPreference ? { browserPreference: input.browserPreference } : {}),
    ...(typeof input.headless === 'boolean' ? { headless: input.headless } : {}),
    ...(input.launchSettingsOverrides
      ? { launchSettingsOverrides: input.launchSettingsOverrides }
      : {}),
    ...(input.viewport ? { viewport: input.viewport } : {}),
  });

  pushPlaywrightBrowserSelectionSteps({
    fallbackMessages: session.fallbackMessages,
    launchLabel: session.launchLabel,
    pushStep: input.pushStep,
    ...(input.browserSelectionStepName
      ? { stepName: input.browserSelectionStepName }
      : {}),
  });

  if (input.launchStep?.successDetail) {
    input.pushStep(input.launchStep.stepName, 'ok', input.launchStep.successDetail);
  }

  return session;
};
