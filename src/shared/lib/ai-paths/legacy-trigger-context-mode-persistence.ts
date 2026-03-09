import type { PathConfig } from '@/shared/contracts/ai-paths';
import { PATH_CONFIG_PREFIX } from '@/shared/lib/ai-paths/core/constants';
import { findRemovedLegacyTriggerContextModesInDocument } from '@/shared/lib/ai-paths/core/utils/legacy-trigger-context-mode';
import { updateAiPathsSetting } from '@/shared/lib/ai-paths/settings-store-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const repairInflightByPathId = new Map<string, Promise<void>>();

const parseJsonSafe = (value: string): unknown | null => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

export const payloadContainsLegacyTriggerContextModes = (rawPayload: string): boolean => {
  const parsed = parseJsonSafe(rawPayload);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }
  return findRemovedLegacyTriggerContextModesInDocument(parsed).length > 0;
};

export const persistLegacyTriggerContextModeRepair = (args: {
  pathId: string;
  rawPayload: string;
  repairedConfig: PathConfig;
  source: string;
  action: string;
}): boolean => {
  if (!payloadContainsLegacyTriggerContextModes(args.rawPayload)) {
    return false;
  }

  const key = `${PATH_CONFIG_PREFIX}${args.pathId}`;
  const payload = JSON.stringify(args.repairedConfig);
  if (repairInflightByPathId.has(args.pathId)) {
    return true;
  }

  const task: Promise<void> = updateAiPathsSetting(key, payload)
    .then((): void => {
      // Write-through is best-effort; callers only need completion and in-flight dedupe.
    })
    .catch((error: unknown) => {
      logClientError(error, {
        context: {
          source: args.source,
          action: args.action,
          pathId: args.pathId,
          level: 'warn',
        },
      });
    })
    .finally(() => {
      repairInflightByPathId.delete(args.pathId);
    });

  repairInflightByPathId.set(args.pathId, task);
  void task;
  return true;
};
