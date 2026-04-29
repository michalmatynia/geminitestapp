import { describe, expect, it } from 'vitest';

import { filemakerJobBoardScrapeRequestSchema } from '../filemaker-job-board-scrape-contracts';

describe('filemakerJobBoardScrapeRequestSchema', () => {
  it('normalizes deprecated organisation matcher fields to scraped-employer behavior', () => {
    const parsed = filemakerJobBoardScrapeRequestSchema.parse({
      importStrategy: 'matched_only',
      minimumMatchConfidence: 50,
      organizationScope: 'selected',
      selectedOrganizationIds: ['org-1', 'org-2'],
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    });

    expect(parsed.importStrategy).toBe('create_unmatched');
    expect(parsed.minimumMatchConfidence).toBe(85);
    expect(parsed.organizationScope).toBe('all');
    expect(parsed.selectedOrganizationIds).toEqual([]);
  });
});
