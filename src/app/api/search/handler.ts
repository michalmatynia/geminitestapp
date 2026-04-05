import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  badRequestError,
  configurationError,
  externalServiceError,
} from '@/shared/errors/app-error';
import { getSearchProviderSettings } from '@/shared/lib/search/search-settings';

type BraveSearchResult = {
  title?: string;
  url?: string;
  description?: string;
};

type BraveResponse = {
  web?: {
    results?: BraveSearchResult[];
  };
};

type GoogleSearchItem = {
  title?: string;
  link?: string;
  snippet?: string;
};

type GoogleSearchResponse = {
  items?: GoogleSearchItem[];
};

const searchSchema = z.object({
  query: z.string().trim().optional(),
  limit: z.coerce.number().int().optional(),
  provider: z.string().trim().optional(),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, searchSchema, {
    logPrefix: 'search',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const query = parsed.data.query ?? '';
  const limit = Math.min(Math.max(parsed.data.limit ?? 5, 1), 10);
  const provider = parsed.data.provider?.toLowerCase() || 'brave';

  if (!query) {
    throw badRequestError('Query is required');
  }

  const settings = await getSearchProviderSettings();

  if (provider === 'brave') {
    if (!settings.brave.apiKey) {
      throw configurationError('Brave search API key not configured');
    }
    const url = new URL(settings.brave.apiUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': settings.brave.apiKey,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw externalServiceError(`Search provider error: ${errorText || res.statusText}`, {
        provider: 'brave',
        statusCode: res.status,
      });
    }

    const data = (await res.json()) as BraveResponse;
    const results =
      data.web?.results?.map((item) => ({
        title: item.title || 'Untitled',
        url: item.url || '',
        description: item.description || '',
      })) || [];

    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  if (provider === 'google') {
    if (!settings.google.apiKey) {
      throw configurationError('Google search API key not configured');
    }
    if (!settings.google.engineId) {
      throw configurationError('Google search engine ID not configured');
    }
    const url = new URL(settings.google.apiUrl);
    url.searchParams.set('key', settings.google.apiKey);
    url.searchParams.set('cx', settings.google.engineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(limit));

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errorText = await res.text();
      throw externalServiceError(`Search provider error: ${errorText || res.statusText}`, {
        provider: 'google',
        statusCode: res.status,
      });
    }

    const data = (await res.json()) as GoogleSearchResponse;
    const results =
      data.items?.map((item) => ({
        title: item.title || 'Untitled',
        url: item.link || '',
        description: item.snippet || '',
      })) || [];

    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  if (provider === 'serpapi') {
    if (!settings.serpapi.apiKey) {
      throw configurationError('SerpApi key not configured');
    }

    const url = new URL(settings.serpapi.apiUrl);
    url.searchParams.set('api_key', settings.serpapi.apiKey);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(limit));

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errorText = await res.text();
      throw externalServiceError(`Search provider error: ${errorText || res.statusText}`, {
        provider: 'serpapi',
        statusCode: res.status,
      });
    }

    const data = (await res.json()) as {
      organic_results?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
      }>;
    };

    const results =
      data.organic_results?.map((item) => ({
        title: item.title || 'Untitled',
        url: item.link || '',
        description: item.snippet || '',
      })) || [];

    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  throw badRequestError('Unsupported search provider', { provider });
}
