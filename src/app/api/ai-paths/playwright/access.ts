import type { AiPathsAccessContext } from '@/features/ai/ai-paths/server';
import type { PlaywrightEngineRunRecord } from '@/features/playwright/server';
import { forbiddenError } from '@/shared/errors/app-error';

type AssertPlaywrightRunAccessInput = {
  run: PlaywrightEngineRunRecord;
  access: AiPathsAccessContext;
  isInternal: boolean;
};

export const assertPlaywrightRunAccess = ({
  run,
  access,
  isInternal,
}: AssertPlaywrightRunAccessInput): void => {
  if (isInternal) return;
  if (access.isElevated) return;
  const ownerUserId = run.ownerUserId?.trim() ?? '';
  if (!ownerUserId || ownerUserId !== access.userId) {
    throw forbiddenError('Playwright run access denied.');
  }
};
