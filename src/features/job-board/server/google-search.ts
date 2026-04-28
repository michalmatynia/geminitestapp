import 'server-only';

import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type GoogleSearchHit = {
  title: string;
  url: string;
  snippet: string;
};

export type GoogleSearchResult = {
  hits: GoogleSearchHit[];
  query: string;
  error?: string;
};

const SEARCH_SCRIPT = `
  export default async ({ page, input }) => {
    const url = 'https://www.google.com/search?q=' + encodeURIComponent(input.query) + '&hl=pl';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}

    // Dismiss the consent dialog if present (varies by region).
    try {
      const consentButton = await page.$('button[aria-label*="Accept" i], button[aria-label*="Zgadzam" i], #L2AGLb');
      if (consentButton) {
        await consentButton.click({ timeout: 3000 });
        await page.waitForTimeout(800);
      }
    } catch {}

    const hits = await page.evaluate(() => {
      const results = [];
      const blocks = document.querySelectorAll('div.g, div.MjjYud');
      for (const block of blocks) {
        const link = block.querySelector('a[href^="http"]');
        const title = block.querySelector('h3');
        const snippet = block.querySelector('div[data-snc], div[data-sncf], span.VwiC3b');
        if (!link || !title) continue;
        const href = link.href || '';
        if (!href || href.startsWith('https://www.google.')) continue;
        results.push({
          url: href,
          title: title.textContent || '',
          snippet: snippet ? snippet.textContent || '' : '',
        });
        if (results.length >= 8) break;
      }
      return results;
    });

    return { hits };
  };
`;

const useSearch = (): boolean => {
  if (process.env['JOB_BOARD_USE_GOOGLE_SEARCH']?.toLowerCase() === 'true') return true;
  return false;
};

export const searchGoogle = async (query: string): Promise<GoogleSearchResult> => {
  if (!useSearch()) {
    return {
      hits: [],
      query,
      error: 'Google search disabled (set JOB_BOARD_USE_GOOGLE_SEARCH=true to enable).',
    };
  }

  try {
    const run = await runPlaywrightEngineTask({
      request: {
        script: SEARCH_SCRIPT,
        startUrl: 'https://www.google.com/',
        input: { query },
        timeoutMs: 45_000,
        browserEngine: 'chromium',
      },
      instance: {
        kind: 'custom',
        family: 'scrape',
        label: 'Job board company website search',
        tags: ['job-board', 'google-search'],
      },
    });

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled') {
      return { hits: [], query, error: run.error ?? `Search run status=${run.status}` };
    }

    const result = (run.result ?? {}) as { returnValue?: { hits?: GoogleSearchHit[] } };
    const hits = (result.returnValue?.hits ?? []).filter(
      (hit): hit is GoogleSearchHit =>
        typeof hit?.url === 'string' && typeof hit?.title === 'string'
    );
    return { hits, query };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.google-search',
      action: 'searchGoogle',
      query,
    });
    return {
      hits: [],
      query,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const SOCIAL_DOMAINS = [
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'pracuj.pl',
  'justjoin.it',
  'nofluffjobs.com',
  'goldenline.pl',
  'olx.pl',
];

const isCorporateUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return !SOCIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

export const findCompanyWebsite = async (input: {
  companyName: string;
  city?: string | null;
}): Promise<{ website: string | null; domain: string | null; error?: string }> => {
  const baseQuery = `${input.companyName}${input.city ? ` ${input.city}` : ''} oficjalna strona`;
  const result = await searchGoogle(baseQuery);
  if (result.error && result.hits.length === 0) {
    return { website: null, domain: null, error: result.error };
  }
  const corporate = result.hits.find((hit) => isCorporateUrl(hit.url));
  if (!corporate) return { website: null, domain: null };
  try {
    const url = new URL(corporate.url);
    return {
      website: `${url.protocol}//${url.hostname}`,
      domain: url.hostname.toLowerCase().replace(/^www\./, ''),
    };
  } catch {
    return { website: null, domain: null };
  }
};
