import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution';
import {
  getPlaywrightRuntimeActionSeed,
  mergeSeededPlaywrightActions,
} from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

const DEFAULT_ARTICLE_SCRAPE_HEADLESS = true;

export type ArticleScrapeActionConnection = {
  browserModeLabel: 'Headed' | 'Headless' | 'Runtime default';
  description: string | null;
  enabledStepCount: number;
  id: string;
  isSeedFallback: boolean;
  name: string;
  runtimeKey: typeof SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY;
  totalStepCount: number;
  updatedAt: string;
};

const resolveArticleScrapeAction = (
  actions: readonly PlaywrightAction[] | null | undefined
): PlaywrightAction | null => {
  const mergedActions = mergeSeededPlaywrightActions([...(actions ?? [])]);
  return (
    mergedActions.find(
      (action) => action.runtimeKey === SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY
    ) ?? getPlaywrightRuntimeActionSeed(SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY)
  );
};

export const resolveArticleScrapeHeadless = (
  actions: readonly PlaywrightAction[] | null | undefined
): boolean =>
  resolveArticleScrapeAction(actions)?.executionSettings.headless ?? DEFAULT_ARTICLE_SCRAPE_HEADLESS;

const formatBrowserModeLabel = (
  headless: boolean | null | undefined
): ArticleScrapeActionConnection['browserModeLabel'] => {
  if (headless == null) return 'Runtime default';
  return headless ? 'Headless' : 'Headed';
};

export const resolveArticleScrapeActionConnection = (
  actions: readonly PlaywrightAction[] | null | undefined
): ArticleScrapeActionConnection | null => {
  const action = resolveArticleScrapeAction(actions);
  if (action?.runtimeKey !== SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY) return null;
  const hasStoredAction =
    actions?.some(
      (entry) => entry.runtimeKey === SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY
    ) ?? false;
  const enabledStepCount = action.blocks.filter((block) => block.enabled !== false).length;
  return {
    browserModeLabel: formatBrowserModeLabel(action.executionSettings.headless),
    description: action.description,
    enabledStepCount,
    id: action.id,
    isSeedFallback: !hasStoredAction,
    name: action.name,
    runtimeKey: SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY,
    totalStepCount: action.blocks.length,
    updatedAt: action.updatedAt,
  };
};

export const updateArticleScrapeHeadlessAction = ({
  actions,
  headless,
  updatedAt = new Date().toISOString(),
}: {
  actions: readonly PlaywrightAction[];
  headless: boolean;
  updatedAt?: string;
}): PlaywrightAction[] =>
  mergeSeededPlaywrightActions([...actions]).map((action) =>
    action.runtimeKey === SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY
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
