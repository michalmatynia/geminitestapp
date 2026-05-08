import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';
import { extractScrapeImageLinksFromSourceHtml } from './product-scrape-profile-image-sources';
import { fetchRemoteProductSourcePage } from './product-remote-image-download';

export const fetchSourcePageImageLinks = async (
  candidate: ProductScrapeCandidate
): Promise<string[]> => {
  try {
    const { html } = await fetchRemoteProductSourcePage(candidate.sourceUrl);
    if (html === null) return [];
    return extractScrapeImageLinksFromSourceHtml(html, candidate.sourceUrl);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scrape-profiles',
      action: 'fetchSourcePageImageLinks',
      sku: candidate.sku,
      sourceUrl: candidate.sourceUrl,
    });
    return [];
  }
};
