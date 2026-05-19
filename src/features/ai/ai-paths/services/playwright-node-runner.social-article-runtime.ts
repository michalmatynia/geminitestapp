import type { Page } from 'playwright';

import { runSocialArticleSourceScripter } from '@/features/playwright/scripters/social-article-adapter';
import { withSocialArticleAggregatorScanActionRunSteps } from '@/features/playwright/scan-steps';
import { SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/social-article-aggregator-runtime-constants';
import {
  SocialArticleAggregatorSequencer,
  type SocialArticleAggregatorScrapeInput,
} from '@/shared/lib/browser-execution/sequencers/SocialArticleAggregatorSequencer';

export { SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY };

type ExecuteSocialArticleAggregatorScrapeRuntimeInput = {
  emit: (port: string, value: unknown) => void;
  input: Record<string, unknown>;
  log: (...args: unknown[]) => void;
  page: Page;
};

export async function executeSocialArticleAggregatorScrapeRuntime(
  input: ExecuteSocialArticleAggregatorScrapeRuntimeInput
): Promise<unknown> {
  let resultPayload: unknown = null;
  const sequencer = new SocialArticleAggregatorSequencer(
    {
      page: input.page,
      emit: (type, payload) => {
        if (type === 'result') resultPayload = payload;
        input.emit(type, payload);
      },
      log: (message, context) => input.log(message, context),
      runScripter: (source, options) =>
        runSocialArticleSourceScripter(input.page, source, options),
    },
    input.input as SocialArticleAggregatorScrapeInput
  );

  await sequencer.scan();

  return resultPayload !== null
    ? withSocialArticleAggregatorScanActionRunSteps(resultPayload)
    : {
        status: 'completed',
        message: 'Social article aggregator scrape completed without an explicit payload.',
      };
}
