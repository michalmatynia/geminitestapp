import { type Browser, type BrowserContext } from 'playwright';
import { initializeBrowserAndContext } from '@/features/ai/agent-runtime/core/engine-utils';

export interface BrowserSession {
  browser: Browser | null;
  context: BrowserContext | null;
}

export async function getBrowserSession(
  browserType: string | null | undefined,
  runHeadless: boolean | null | undefined,
  runId: string
): Promise<BrowserSession> {
  const result = await initializeBrowserAndContext(browserType ?? null, runHeadless ?? null, runId);
  return {
    browser: result.browser,
    context: result.context,
  };
}
