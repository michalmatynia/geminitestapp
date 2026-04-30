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

const buildRuntimeOptions = (
  input: OpenPlaywrightConnectionTestSessionInput
): Partial<OpenPlaywrightConnectionPageSessionInput> => {
  const options: Partial<OpenPlaywrightConnectionPageSessionInput> = {};
  if (input.instance !== undefined && input.instance !== null) options.instance = input.instance;
  if (input.runtime !== undefined) options.runtime = input.runtime;
  if (input.runtimeActionKey !== undefined) options.runtimeActionKey = input.runtimeActionKey;
  if (input.browserPreference !== undefined) options.browserPreference = input.browserPreference;
  if (typeof input.headless === 'boolean') options.headless = input.headless;
  return options;
};

const buildLaunchOptions = (
  input: OpenPlaywrightConnectionTestSessionInput
): Partial<OpenPlaywrightConnectionPageSessionInput> => {
  const options: Partial<OpenPlaywrightConnectionPageSessionInput> = {};
  if (input.launchSettingsOverrides !== undefined) {
    options.launchSettingsOverrides = input.launchSettingsOverrides;
  }
  if (input.viewport !== undefined) options.viewport = input.viewport;
  return options;
};

const toOpenPlaywrightConnectionPageSessionInput = (
  input: OpenPlaywrightConnectionTestSessionInput
): OpenPlaywrightConnectionPageSessionInput => ({
  connection: input.connection,
  ...buildRuntimeOptions(input),
  ...buildLaunchOptions(input),
});

export const openPlaywrightConnectionTestSession = async (
  input: OpenPlaywrightConnectionTestSessionInput
): Promise<OpenPlaywrightConnectionPageSessionResult> => {
  if (input.launchStep !== undefined) {
    input.pushStep(
      input.launchStep.stepName,
      'pending',
      input.launchStep.pendingDetail
    );
  }

  const session = await openPlaywrightConnectionPageSession(
    toOpenPlaywrightConnectionPageSessionInput(input)
  );

  pushPlaywrightBrowserSelectionSteps({
    fallbackMessages: session.fallbackMessages,
    launchLabel: session.launchLabel,
    pushStep: input.pushStep,
    ...(input.browserSelectionStepName !== undefined
      ? { stepName: input.browserSelectionStepName }
      : {}),
  });

  if (input.launchStep?.successDetail !== undefined) {
    input.pushStep(input.launchStep.stepName, 'ok', input.launchStep.successDetail);
  }

  return session;
};
