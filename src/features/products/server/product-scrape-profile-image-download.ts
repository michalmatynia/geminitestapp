import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';
import { extractScrapeImageLinksFromSourceHtml } from './product-scrape-profile-image-sources';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

type SourcePageResult = {
  cookieHeader: string | null;
  html: string | null;
};

const buildImageDownloadHeaders = (
  candidate: ProductScrapeCandidate,
  cookieHeader: string | null = null
): HeadersInit => {
  const headers: Record<string, string> = {
    accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    referer: candidate.sourceUrl,
    'sec-fetch-dest': 'image',
    'sec-fetch-mode': 'no-cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': BROWSER_USER_AGENT,
  };
  if (cookieHeader !== null && cookieHeader.length > 0) headers['cookie'] = cookieHeader;
  return headers;
};

const buildSourcePageHeaders = (): HeadersInit => ({
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'upgrade-insecure-requests': '1',
  'user-agent': BROWSER_USER_AGENT,
});

const readSetCookieHeaders = (headers: Headers): string[] => {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies =
    typeof withGetSetCookie.getSetCookie === 'function'
      ? withGetSetCookie.getSetCookie()
      : [];
  const singleHeader = headers.get('set-cookie');
  return singleHeader === null ? setCookies : [...setCookies, singleHeader];
};

const toCookieHeader = (setCookieHeaders: string[]): string | null => {
  const cookiePairs = Array.from(
    new Set(
      setCookieHeaders
        .map((value) => value.split(';')[0]?.trim() ?? '')
        .filter((value) => value.length > 0)
    )
  );
  return cookiePairs.length > 0 ? cookiePairs.join('; ') : null;
};

const isHtmlResponse = (headers: Headers): boolean => {
  const contentType = headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.length === 0 || contentType.includes('text/html');
};

const fetchSourcePage = async (candidate: ProductScrapeCandidate): Promise<SourcePageResult> => {
  const response = await fetch(candidate.sourceUrl, {
    cache: 'no-store',
    headers: buildSourcePageHeaders(),
    redirect: 'follow',
  });
  return {
    cookieHeader: toCookieHeader(readSetCookieHeaders(response.headers)),
    html: response.ok && isHtmlResponse(response.headers) ? await response.text() : null,
  };
};

const fetchImageResponse = (
  candidate: ProductScrapeCandidate,
  imageUrl: string,
  cookieHeader: string | null = null
): Promise<Response> =>
  fetch(imageUrl, {
    cache: 'no-store',
    headers: buildImageDownloadHeaders(candidate, cookieHeader),
    redirect: 'follow',
  });

export const fetchScrapeImageResponse = async (
  candidate: ProductScrapeCandidate,
  imageUrl: string
): Promise<Response> => {
  const response = await fetchImageResponse(candidate, imageUrl);
  if (response.ok) return response;

  const { cookieHeader } = await fetchSourcePage(candidate);
  if (cookieHeader === null) return response;
  return fetchImageResponse(candidate, imageUrl, cookieHeader);
};

export const fetchSourcePageImageLinks = async (
  candidate: ProductScrapeCandidate
): Promise<string[]> => {
  try {
    const { html } = await fetchSourcePage(candidate);
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
