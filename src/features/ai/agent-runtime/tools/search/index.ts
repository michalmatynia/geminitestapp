import { getSearchProviderSettings } from '@/shared/lib/search/search-settings';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const fetchDuckDuckGoResults = async (
  query: string
): Promise<Array<{ title: string; url: string; snippet?: string }>> => {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Search fetch failed (${response.status}).`);
  }
  const html = await response.text();
  const results: Array<{ title: string; url: string; snippet?: string }> = [];
  const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = resultRegex.exec(html))) {
    const rawUrl = match[1];
    const rawTitle = match[2];
    if (!rawUrl || !rawTitle) continue;
    const title = rawTitle.replace(/<[^>]+>/g, '').trim();
    const url = rawUrl.includes('duckduckgo.com/l/')
      ? decodeURIComponent(
        new URL(rawUrl, 'https://duckduckgo.com').searchParams.get('uddg') ?? rawUrl
      )
      : rawUrl;
    if (title && url) {
      results.push({ title, url });
    }
    if (results.length >= 6) break;
  }
  return results;
};

export const fetchSearchResults = async (
  query: string,
  provider: string,
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>
): Promise<Array<{ title: string; url: string }>> => {
  const normalizedProvider = provider.toLowerCase();
  const settings = await getSearchProviderSettings();

  if (normalizedProvider === 'brave') {
    try {
      if (!settings.brave.apiKey) {
        throw new Error('Brave search API key not configured.');
      }
      const url = new URL(settings.brave.apiUrl);
      url.searchParams.set('q', query);
      url.searchParams.set('count', '6');
      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': settings.brave.apiKey,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Search failed (${res.status}).`);
      }
      const data = (await res.json()) as {
        web?: { results?: Array<{ title?: string; url?: string }> };
      };
      return (
        data.web?.results
          ?.map((item: { title?: string; url?: string }) => ({
            title: item.title || 'Untitled',
            url: item.url || '',
          }))
          .filter((item: { url: string }) => item.url) || []
      );
    } catch (error) {
      logClientError(error);
      if (log) {
        await log('warning', 'Brave search failed; falling back to DuckDuckGo.', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return await fetchDuckDuckGoResults(query);
    }
  }

  if (normalizedProvider === 'google') {
    try {
      if (!settings.google.apiKey || !settings.google.engineId) {
        throw new Error('Google search API key/engine not configured.');
      }
      const url = new URL(settings.google.apiUrl);
      url.searchParams.set('key', settings.google.apiKey);
      url.searchParams.set('cx', settings.google.engineId);
      url.searchParams.set('q', query);
      url.searchParams.set('num', '6');
      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Search failed (${res.status}).`);
      }
      const data = (await res.json()) as {
        items?: Array<{ title?: string; link?: string }>;
      };
      return (
        data.items
          ?.map((item: { title?: string; link?: string }) => ({
            title: item.title || 'Untitled',
            url: item.link || '',
          }))
          .filter((item: { url: string }) => item.url) || []
      );
    } catch (error) {
      logClientError(error);
      if (log) {
        await log('warning', 'Google search failed; falling back to DuckDuckGo.', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return await fetchDuckDuckGoResults(query);
    }
  }

  if (normalizedProvider === 'serpapi') {
    try {
      if (!settings.serpapi.apiKey) {
        throw new Error('SerpApi key not configured.');
      }
      const url = new URL(settings.serpapi.apiUrl);
      url.searchParams.set('api_key', settings.serpapi.apiKey);
      url.searchParams.set('engine', 'google');
      url.searchParams.set('q', query);
      url.searchParams.set('num', '6');
      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Search failed (${res.status}).`);
      }
      const data = (await res.json()) as {
        organic_results?: Array<{ title?: string; link?: string }>;
      };
      return (
        data.organic_results
          ?.map((item: { title?: string; link?: string }) => ({
            title: item.title || 'Untitled',
            url: item.link || '',
          }))
          .filter((item: { url: string }) => item.url) || []
      );
    } catch (error) {
      logClientError(error);
      if (log) {
        await log('warning', 'SerpApi search failed; falling back to DuckDuckGo.', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return await fetchDuckDuckGoResults(query);
    }
  }

  if (log) {
    await log('warning', 'Unsupported search provider; falling back to DuckDuckGo.', {
      provider,
    });
  }
  return await fetchDuckDuckGoResults(query);
};
