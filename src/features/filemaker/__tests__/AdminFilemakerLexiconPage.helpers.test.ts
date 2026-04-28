import { describe, expect, it } from 'vitest';

import {
  createDefaultFilemakerDatabase,
  createFilemakerJobListing,
  createFilemakerJobListingLexiconLink,
  createFilemakerLexiconTerm,
} from '../settings';
import {
  buildFilemakerLexiconLinkedJobCounts,
  filterFilemakerLexiconTermRows,
  hasDuplicateFilemakerLexiconTerm,
  normalizeFilemakerLexiconKey,
  toFilemakerLexiconTermRows,
  upsertFilemakerLexiconTermInDatabase,
  withDeletedFilemakerLexiconTerm,
} from '../pages/AdminFilemakerLexiconPage.helpers';

describe('AdminFilemakerLexiconPage helpers', () => {
  it('normalizes labels into reusable search keys', () => {
    expect(normalizeFilemakerLexiconKey(' Puławska 180, Mokotów, Warszawa(Masovian) ')).toBe(
      'pulawska 180 mokotow warszawa masovian'
    );
  });

  it('counts linked jobs from explicit links and listing term ids without duplicates', () => {
    const database = createDefaultFilemakerDatabase();
    const term = createFilemakerLexiconTerm({
      id: 'term-1',
      label: 'full-time',
      normalizedLabel: 'full time',
      category: 'employment_type',
    });
    database.lexiconTerms = [term];
    database.jobListings = [
      createFilemakerJobListing({
        id: 'job-1',
        organizationId: 'org-1',
        title: 'Frontend Developer',
        lexiconTermIds: ['term-1'],
      }),
    ];
    database.jobListingLexiconLinks = [
      createFilemakerJobListingLexiconLink({
        id: 'link-1',
        jobListingId: 'job-1',
        lexiconTermId: 'term-1',
      }),
    ];

    expect(buildFilemakerLexiconLinkedJobCounts(database).get('term-1')).toBe(1);
  });

  it('filters rows by category and search text', () => {
    const database = createDefaultFilemakerDatabase();
    database.lexiconTerms = [
      createFilemakerLexiconTerm({
        id: 'term-1',
        label: 'B2B contract',
        normalizedLabel: 'b2b contract',
        category: 'contract_type',
      }),
      createFilemakerLexiconTerm({
        id: 'term-2',
        label: 'full office work',
        normalizedLabel: 'full office work',
        category: 'work_mode',
      }),
    ];

    const rows = filterFilemakerLexiconTermRows(toFilemakerLexiconTermRows(database), {
      category: 'contract_type',
      query: 'b2b',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.term.id).toBe('term-1');
  });

  it('upserts manual terms using normalized keys', () => {
    const database = createDefaultFilemakerDatabase();
    const nextDatabase = upsertFilemakerLexiconTermInDatabase({
      database,
      editing: null,
      fallbackId: 'term-1',
      form: { category: 'contract_type', label: ' B2B contract ' },
      now: '2026-04-28T10:00:00.000Z',
    });

    expect(nextDatabase.lexiconTerms).toHaveLength(1);
    expect(nextDatabase.lexiconTerms[0]?.normalizedLabel).toBe('b2b contract');
    expect(hasDuplicateFilemakerLexiconTerm(nextDatabase, null, {
      category: 'contract_type',
      label: 'b2b contract',
    })).toBe(true);
  });

  it('deletes lexicon terms from links and listing term ids', () => {
    const database = createDefaultFilemakerDatabase();
    const term = createFilemakerLexiconTerm({
      id: 'term-1',
      label: 'full office work',
      normalizedLabel: 'full office work',
      category: 'work_mode',
    });
    database.lexiconTerms = [term];
    database.jobListings = [
      createFilemakerJobListing({
        id: 'job-1',
        organizationId: 'org-1',
        title: 'Frontend Developer',
        lexiconTermIds: ['term-1'],
      }),
    ];
    database.jobListingLexiconLinks = [
      createFilemakerJobListingLexiconLink({
        id: 'link-1',
        jobListingId: 'job-1',
        lexiconTermId: 'term-1',
      }),
    ];

    const nextDatabase = withDeletedFilemakerLexiconTerm(database, term);

    expect(nextDatabase.lexiconTerms).toHaveLength(0);
    expect(nextDatabase.jobListingLexiconLinks).toHaveLength(0);
    expect(nextDatabase.jobListings[0]?.lexiconTermIds).toEqual([]);
  });
});
