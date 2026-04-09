import { validatePlaywrightNodeScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';
import {
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { badRequestError } from '@/shared/errors/app-error';

const isTraderaBrowserIntegrationSlug = (slug: string | null | undefined): boolean =>
  isTraderaIntegrationSlug(slug) && !isTraderaApiIntegrationSlug(slug);

export const assertValidTraderaPlaywrightListingScript = ({
  integrationSlug,
  traderaBrowserMode,
  playwrightListingScript,
}: {
  integrationSlug: string | null | undefined;
  traderaBrowserMode: 'builtin' | 'scripted' | null | undefined;
  playwrightListingScript: string | null | undefined;
}): void => {
  if (!isTraderaBrowserIntegrationSlug(integrationSlug)) {
    return;
  }

  if (traderaBrowserMode !== 'scripted') {
    return;
  }

  const normalizedScript =
    typeof playwrightListingScript === 'string' ? playwrightListingScript.trim() : '';
  if (!normalizedScript) {
    return;
  }

  const validation = validatePlaywrightNodeScript(normalizedScript);
  if (validation.ok) {
    return;
  }

  throw badRequestError(
    'Invalid Tradera Playwright listing script. Reset to the managed default or fix the syntax.',
    {
      integrationSlug,
      parserError: validation.error.message,
      parserLogs: validation.logs,
    }
  );
};
