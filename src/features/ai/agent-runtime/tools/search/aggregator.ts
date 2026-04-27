import { z } from 'zod';
import * as searchService from '@/features/ai/agent-runtime/tools/search/segments/search-service';
import { getSearchProviderSettings } from '@/shared/lib/search/search-settings';

export const searchAggregatorSchema = z.object({
  query: z.string(),
  providers: z.array(z.string()).optional(),
});

export type SearchAggregatorInput = z.infer<typeof searchAggregatorSchema>;

export const runAggregatedSearch = async (input: SearchAggregatorInput): Promise<Array<{ title: string; url: string }>> => {
  const settings = await getSearchProviderSettings();
  const enabledProviders = input.providers ?? Object.keys(settings).filter(p => p !== 'duckduckgo');
  
  const results = await Promise.all(
    enabledProviders.map(provider => 
      searchService.fetchSearchResults(input.query, provider).catch(() => [])
    )
  );

  const seen = new Set<string>();
  return results.flat().filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
};
