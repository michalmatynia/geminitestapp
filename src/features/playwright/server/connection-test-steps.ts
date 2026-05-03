import 'server-only';

import type { PersistedStorageState } from './settings';

export type PlaywrightConnectionTestPushStep = (
  step: string,
  status: 'pending' | 'ok' | 'failed',
  detail: string
) => void;

export const pushPlaywrightStoredSessionLoadingSteps = (input: {
  hasStoredSession: boolean;
  storageState: PersistedStorageState | null;
  pushStep: PlaywrightConnectionTestPushStep;
  loadedDetail: string;
  missingDetail: string;
  missingStatus?: 'ok' | 'failed';
  stepName?: string;
  pendingDetail?: string;
}): void => {
  if (!input.hasStoredSession) {
    return;
  }

  const stepName = input.stepName ?? 'Loading session';
  input.pushStep(
    stepName,
    'pending',
    input.pendingDetail ?? 'Loading stored Playwright session'
  );
  input.pushStep(
    stepName,
    input.storageState ? 'ok' : (input.missingStatus ?? 'failed'),
    input.storageState ? input.loadedDetail : input.missingDetail
  );
};

export const pushPlaywrightBrowserSelectionSteps = (input: {
  fallbackMessages: string[];
  launchLabel: string;
  pushStep: PlaywrightConnectionTestPushStep;
  stepName?: string;
}): void => {
  const stepName = input.stepName ?? 'Browser selection';
  for (const message of input.fallbackMessages) {
    input.pushStep(stepName, 'ok', message);
  }
  input.pushStep(stepName, 'ok', `Using ${input.launchLabel}.`);
};
