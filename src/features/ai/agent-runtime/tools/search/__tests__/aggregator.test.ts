import { describe, it, expect, vi } from 'vitest';
import * as aggregator from '../aggregator';
import * as searchService from '@/features/ai/agent-runtime/tools/search/segments/search-service';
import * as settingsService from '@/shared/lib/search/search-settings';

vi.mock('@/features/ai/agent-runtime/tools/search/segments/search-service', () => ({
  fetchSearchResults: vi.fn(),
}));

vi.mock('@/shared/lib/search/search-settings', () => ({
  getSearchProviderSettings: vi.fn(),
}));

describe('SearchAggregator', () => {
  it('should aggregate and deduplicate search results from multiple providers', async () => {
    vi.mocked(settingsService.getSearchProviderSettings).mockResolvedValue({
      brave: {},
      google: {},
    } as any);

    vi.mocked(searchService.fetchSearchResults)
      .mockResolvedValueOnce([{ title: 'Result 1', url: 'https://site1.com' }, { title: 'Result 2', url: 'https://site2.com' }])
      .mockResolvedValueOnce([{ title: 'Result 2', url: 'https://site2.com' }, { title: 'Result 3', url: 'https://site3.com' }]);

    const input = { query: 'test query' };
    const results = await aggregator.runAggregatedSearch(input);

    expect(results).toHaveLength(3);
    expect(results).toEqual([
      { title: 'Result 1', url: 'https://site1.com' },
      { title: 'Result 2', url: 'https://site2.com' },
      { title: 'Result 3', url: 'https://site3.com' },
    ]);
  });
});
