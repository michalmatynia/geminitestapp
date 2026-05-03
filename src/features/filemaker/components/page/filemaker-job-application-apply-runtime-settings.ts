import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { JOB_APPLICATION_APPLY_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-application-apply-runtime-constants';
import {
  getPlaywrightRuntimeActionSeed,
  mergeSeededPlaywrightActions,
} from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

const DEFAULT_JOB_APPLICATION_APPLY_HEADLESS = true;

export type JobApplicationApplyActionConnection = {
  browserModeLabel: 'Headed' | 'Headless' | 'Runtime default';
  description: string | null;
  enabledStepCount: number;
  id: string;
  isSeedFallback: boolean;
  name: string;
  runtimeKey: typeof JOB_APPLICATION_APPLY_RUNTIME_KEY;
  totalStepCount: number;
  updatedAt: string;
};

const resolveJobApplicationApplyAction = (
  actions: readonly PlaywrightAction[] | null | undefined
): PlaywrightAction | null => {
  const mergedActions = mergeSeededPlaywrightActions([...(actions ?? [])]);
  return (
    mergedActions.find((action) => action.runtimeKey === JOB_APPLICATION_APPLY_RUNTIME_KEY) ??
    getPlaywrightRuntimeActionSeed(JOB_APPLICATION_APPLY_RUNTIME_KEY)
  );
};

export const resolveJobApplicationApplyHeadless = (
  actions: readonly PlaywrightAction[] | null | undefined
): boolean =>
  resolveJobApplicationApplyAction(actions)?.executionSettings.headless ??
  DEFAULT_JOB_APPLICATION_APPLY_HEADLESS;

const formatBrowserModeLabel = (
  headless: boolean | null
): JobApplicationApplyActionConnection['browserModeLabel'] => {
  if (headless === null) return 'Runtime default';
  return headless ? 'Headless' : 'Headed';
};

export const resolveJobApplicationApplyActionConnection = (
  actions: readonly PlaywrightAction[] | null | undefined
): JobApplicationApplyActionConnection | null => {
  const action = resolveJobApplicationApplyAction(actions);
  if (action?.runtimeKey !== JOB_APPLICATION_APPLY_RUNTIME_KEY) {
    return null;
  }
  const hasStoredAction =
    actions?.some((entry) => entry.runtimeKey === JOB_APPLICATION_APPLY_RUNTIME_KEY) ?? false;
  const enabledStepCount = action.blocks.filter((block) => block.enabled !== false).length;

  return {
    browserModeLabel: formatBrowserModeLabel(action.executionSettings.headless),
    description: action.description,
    enabledStepCount,
    id: action.id,
    isSeedFallback: !hasStoredAction,
    name: action.name,
    runtimeKey: JOB_APPLICATION_APPLY_RUNTIME_KEY,
    totalStepCount: action.blocks.length,
    updatedAt: action.updatedAt,
  };
};

export const updateJobApplicationApplyHeadlessAction = ({
  actions,
  headless,
  updatedAt = new Date().toISOString(),
}: {
  actions: readonly PlaywrightAction[];
  headless: boolean;
  updatedAt?: string;
}): PlaywrightAction[] =>
  mergeSeededPlaywrightActions([...actions]).map((action) =>
    action.runtimeKey === JOB_APPLICATION_APPLY_RUNTIME_KEY
      ? normalizePlaywrightAction({
          ...action,
          executionSettings: {
            ...defaultPlaywrightActionExecutionSettings,
            ...action.executionSettings,
            headless,
          },
          updatedAt,
        })
      : action
  );
