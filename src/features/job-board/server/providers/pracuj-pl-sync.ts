import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type PracujPageFetchResult = {
  ok: boolean;
  status: number;
  html: string;
  finalUrl: string;
  error?: string;
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Fetches a pracuj.pl job offer page.
 *
 * NOTE: Skeleton implementation using plain fetch. Pracuj.pl frequently serves a JS-rendered shell
 * and rate-limits aggressive crawlers, so for production reliability this should be swapped for the
 * existing Playwright engine (`startPlaywrightEngineTask` in
 * `@/features/playwright/server/runtime`) so the AI evaluator receives the post-render DOM.
 */
export const fetchPracujPage = async (sourceUrl: string): Promise<PracujPageFetchResult> => {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.5',
      },
      redirect: 'follow',
    });
    const html = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      html,
      finalUrl: response.url || sourceUrl,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.pracuj-pl',
      action: 'fetchPracujPage',
      sourceUrl,
    });
    return {
      ok: false,
      status: 0,
      html: '',
      finalUrl: sourceUrl,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Strips boilerplate <script>/<style> tags and collapses whitespace so the AI evaluator gets a
 * cheaper, denser input. Keeps DOM structure approximate (tag names + text), good enough for an LLM.
 */
export const reducePracujHtml = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
