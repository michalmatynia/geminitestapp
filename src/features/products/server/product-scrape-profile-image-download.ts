import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';
import { extractScrapeImageLinksFromSourceHtml } from './product-scrape-profile-image-sources';
import { fetchRemoteProductSourcePage } from './product-remote-image-download';
import { throwIfProductScrapeAborted } from './product-scrape-profile-abort';

export const fetchSourcePageImageLinks = async (
  candidate: ProductScrapeCandidate,
  signal?: AbortSignal
): Promise<string[]> => {
  try {
    throwIfProductScrapeAborted(signal);
    const { html } = await fetchRemoteProductSourcePage(candidate.sourceUrl, { signal });
    throwIfProductScrapeAborted(signal);
    if (html === null) return [];
    return extractScrapeImageLinksFromSourceHtml(html, candidate.sourceUrl);
  } catch (error) {
    throwIfProductScrapeAborted(signal);
    await ErrorSystem.captureException(error, {
      service: 'product-scrape-profiles',
      action: 'fetchSourcePageImageLinks',
      sku: candidate.sku,
      sourceUrl: candidate.sourceUrl,
    });
    return [];
  }
};
