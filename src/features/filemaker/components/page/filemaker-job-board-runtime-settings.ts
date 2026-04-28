import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { JOB_BOARD_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-board-runtime-constants';
import {
  getPlaywrightRuntimeActionSeed,
  mergeSeededPlaywrightActions,
} from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

const DEFAULT_JOB_BOARD_HEADLESS = true;

export type JobBoardScrapeActionConnection = {
  browserModeLabel: 'Headed' | 'Headless' | 'Runtime default';
  description: string | null;
  enabledStepCount: number;
  id: string;
  isSeedFallback: boolean;
  name: string;
  runtimeKey: typeof JOB_BOARD_SCRAPE_RUNTIME_KEY;
  totalStepCount: number;
  updatedAt: string;
};

const resolveJobBoardScrapeAction = (
  actions: readonly PlaywrightAction[] | null | undefined
): PlaywrightAction | null => {
  const mergedActions = mergeSeededPlaywrightActions([...(actions ?? [])]);
  return (
    mergedActions.find((action) => action.runtimeKey === JOB_BOARD_SCRAPE_RUNTIME_KEY) ??
    getPlaywrightRuntimeActionSeed(JOB_BOARD_SCRAPE_RUNTIME_KEY)
  );
};

export const resolveJobBoardScrapeHeadless = (
  actions: readonly PlaywrightAction[] | null | undefined
): boolean =>
  resolveJobBoardScrapeAction(actions)?.executionSettings.headless ??
  DEFAULT_JOB_BOARD_HEADLESS;

const formatBrowserModeLabel = (
  headless: boolean | null
): JobBoardScrapeActionConnection['browserModeLabel'] => {
  if (headless === null) return 'Runtime default';
  return headless ? 'Headless' : 'Headed';
};

export const resolveJobBoardScrapeActionConnection = (
  actions: readonly PlaywrightAction[] | null | undefined
): JobBoardScrapeActionConnection | null => {
  const action = resolveJobBoardScrapeAction(actions);
  if (action?.runtimeKey !== JOB_BOARD_SCRAPE_RUNTIME_KEY) {
    return null;
  }
  const hasStoredAction =
    actions?.some((entry) => entry.runtimeKey === JOB_BOARD_SCRAPE_RUNTIME_KEY) ?? false;
  const enabledStepCount = action.blocks.filter((block) => block.enabled !== false).length;

  return {
    browserModeLabel: formatBrowserModeLabel(action.executionSettings.headless),
    description: action.description,
    enabledStepCount,
    id: action.id,
    isSeedFallback: !hasStoredAction,
    name: action.name,
    runtimeKey: JOB_BOARD_SCRAPE_RUNTIME_KEY,
    totalStepCount: action.blocks.length,
    updatedAt: action.updatedAt,
  };
};

export const updateJobBoardScrapeHeadlessAction = ({
  actions,
  headless,
  updatedAt = new Date().toISOString(),
}: {
  actions: readonly PlaywrightAction[];
  headless: boolean;
  updatedAt?: string;
}): PlaywrightAction[] =>
  mergeSeededPlaywrightActions([...actions]).map((action) =>
    action.runtimeKey === JOB_BOARD_SCRAPE_RUNTIME_KEY
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
