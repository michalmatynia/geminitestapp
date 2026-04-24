import { validatePlaywrightEngineScript } from '@/features/playwright/server';
import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import { badRequestError } from '@/shared/errors/app-error';

export const assertValidTraderaPlaywrightListingScript = ({
  integrationSlug,
  traderaBrowserMode,
  playwrightListingScript,
}: {
  integrationSlug: string | null | undefined;
  traderaBrowserMode: 'builtin' | 'scripted' | null | undefined;
  playwrightListingScript: string | null | undefined;
}): void => {
  if (!isTraderaIntegrationSlug(integrationSlug)) {
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

  const validation = validatePlaywrightEngineScript(normalizedScript);
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
