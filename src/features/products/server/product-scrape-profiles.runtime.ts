import type { ProductScrapeProfileRunResponse } from '@/shared/contracts/products/scrape-profiles';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';

type RuntimeMetadata = NonNullable<ProductScrapeProfileRunResponse['runtime']>;
type RuntimeBrowserMode = RuntimeMetadata['browserMode'];

const resolveBrowserMode = (headless: boolean | null): RuntimeBrowserMode => {
  if (headless === null) return 'runtime_default';
  return headless ? 'headless' : 'headed';
};

export const buildRuntimeMetadata = (
  action: PlaywrightAction,
  options: { queueName?: string | null; runtimeActionKey: string }
): RuntimeMetadata => ({
  queueName: options.queueName ?? null,
  runtimeActionId: action.id,
  runtimeActionName: action.name,
  runtimeActionKey: action.runtimeKey ?? options.runtimeActionKey,
  browserMode: resolveBrowserMode(action.executionSettings.headless),
  enabledStepCount: action.blocks.filter((block) => block.enabled !== false).length,
  totalStepCount: action.blocks.length,
});
