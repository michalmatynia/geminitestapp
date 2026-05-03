import { describe, expect, it } from 'vitest';

import {
  createFilemakerJobListing,
  createFilemakerJobListingLexiconLink,
  createFilemakerLexiconTerm,
} from '../../filemaker-settings.entities';
import { createDefaultFilemakerDatabase } from '../../filemaker-settings.database';
import type { FilemakerDatabase, FilemakerLexiconTerm } from '../../types';
import { repairFilemakerJobBoardLexicon } from './lexicon-cleanup';

const makeTerm = (
  id: string,
  label: string,
  typeKey: FilemakerLexiconTerm['typeKey'],
  sourceSite = 'pracuj.pl'
): FilemakerLexiconTerm =>
  createFilemakerLexiconTerm({
    id,
    label,
    normalizedLabel: label.toLowerCase(),
    typeKey,
    category: typeKey,
    sourceSite,
    sourceProvider: sourceSite,
    occurrenceCount: 1,
  });

const makeLink = (listingId: string, term: FilemakerLexiconTerm, position: number) =>
  createFilemakerJobListingLexiconLink({
    id: `link-${listingId}-${term.id}`,
    jobListingId: listingId,
    lexiconTermId: term.id,
    sourceSite: term.sourceSite,
    sourceUrl: 'https://www.pracuj.pl/praca/frontend-developer,oferta,1001',
    sourceValue: term.label,
    typeKey: term.typeKey,
    category: term.typeKey,
    position,
  });

describe('repairFilemakerJobBoardLexicon', () => {
  it('promotes known technologies and removes Pracuj location/provider noise from Other', () => {
    const database = createDefaultFilemakerDatabase();
    const techReact = makeTerm('term-technology-react', 'React', 'technology');
    const otherReact = makeTerm('term-other-react', 'React', 'other');
    const otherDocker = makeTerm('term-other-docker', 'Docker', 'other');
    const lowerSilesia = makeTerm('term-lower-silesia', 'Lower Silesia', 'other');
    const assistant = makeTerm('term-assistant-pracuj', 'Asystent Pracuj.pl', 'other');
    const payroll = makeTerm('term-payroll', 'Payroll', 'other');

    database.lexiconTerms = [
      techReact,
      otherReact,
      otherDocker,
      lowerSilesia,
      assistant,
      payroll,
    ];
    database.jobListings = [
      createFilemakerJobListing({
        id: 'listing-1',
        organizationId: 'organization-1',
        title: 'Frontend Developer',
        description: '',
        status: 'open',
        lexiconTermIds: database.lexiconTerms.map((term) => term.id),
      }),
    ];
    database.jobListingLexiconLinks = database.lexiconTerms.map((term, index) =>
      makeLink('listing-1', term, index)
    );

    const result = repairFilemakerJobBoardLexicon(database);

    expect(result.changed).toBe(true);
    expect(result.summary).toEqual(
      expect.objectContaining({
        promotedTechnologyTerms: 1,
        mergedTechnologyTerms: 1,
        removedNoiseTerms: 2,
        updatedListings: 1,
      })
    );

    const labelsById = new Map(result.database.lexiconTerms.map((term) => [term.id, term.label]));
    expect(labelsById.has('term-lower-silesia')).toBe(false);
    expect(labelsById.has('term-assistant-pracuj')).toBe(false);
    expect(result.database.lexiconTerms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'term-technology-react',
          label: 'React',
          typeKey: 'technology',
        }),
        expect.objectContaining({
          id: 'term-other-docker',
          label: 'Docker',
          typeKey: 'technology',
        }),
        expect.objectContaining({
          id: 'term-payroll',
          label: 'Payroll',
          typeKey: 'other',
        }),
      ])
    );
    expect(result.database.jobListingLexiconLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lexiconTermId: 'term-technology-react',
          typeKey: 'technology',
        }),
        expect.objectContaining({
          lexiconTermId: 'term-other-docker',
          typeKey: 'technology',
        }),
      ])
    );
    expect(result.database.jobListingLexiconLinks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lexiconTermId: 'term-lower-silesia' }),
        expect.objectContaining({ lexiconTermId: 'term-assistant-pracuj' }),
        expect.objectContaining({ lexiconTermId: 'term-other-react' }),
      ])
    );
    expect(result.database.jobListings[0]?.lexiconTermIds).toEqual([
      'term-technology-react',
      'term-other-docker',
      'term-payroll',
    ]);
  });

  it('leaves non-Pracuj location-like Other terms untouched', () => {
    const database: FilemakerDatabase = createDefaultFilemakerDatabase();
    const term = makeTerm('term-lower-silesia', 'Lower Silesia', 'other', 'manual');
    database.lexiconTerms = [term];

    const result = repairFilemakerJobBoardLexicon(database);

    expect(result.changed).toBe(false);
    expect(result.database.lexiconTerms).toEqual([term]);
  });
});
