import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildScrapedOfferLexiconExtraction, buildScrapedOfferPills } from './normalizers';

const offerUrl = 'https://www.pracuj.pl/praca/frontend-developer-wroclaw,oferta,1001';

describe('buildScrapedOfferPills', () => {
  it('keeps raw Pracuj technologies typed and drops provider/location noise', () => {
    const pills = buildScrapedOfferPills({
      provider: 'pracuj_pl',
      snapshot: {
        pills: [
          'React',
          'TypeScript',
          'Lower Silesia',
          'Asystent Pracuj.pl',
          'Pracuj.pl',
          'contract of employment',
        ],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
    });

    expect(pills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'technology', typeKey: 'technology', label: 'React' }),
        expect.objectContaining({
          category: 'technology',
          typeKey: 'technology',
          label: 'TypeScript',
        }),
        expect.objectContaining({
          category: 'contract_type',
          typeKey: 'contract_type',
          label: 'contract of employment',
        }),
      ])
    );
    expect(pills.some((pill) => pill.typeKey === 'other')).toBe(false);
    expect(pills.map((pill) => pill.label)).not.toEqual(
      expect.arrayContaining(['Lower Silesia', 'Asystent Pracuj.pl', 'Pracuj.pl'])
    );
  });

  it('splits raw technology pill groups into reusable technology terms', () => {
    const pills = buildScrapedOfferPills({
      provider: 'pracuj_pl',
      snapshot: {
        pills: ['React, TypeScript, Node.js'],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
    });

    expect(pills).toEqual([
      expect.objectContaining({ category: 'technology', label: 'React' }),
      expect.objectContaining({ category: 'technology', label: 'TypeScript' }),
      expect.objectContaining({ category: 'technology', label: 'Node.js' }),
    ]);
  });

  it('keeps unknown raw pills as unclassified candidates instead of Other lexicon terms', () => {
    const extraction = buildScrapedOfferLexiconExtraction({
      provider: 'pracuj_pl',
      snapshot: {
        pills: ['React', 'Trial day', 'Asystent Pracuj.pl'],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
    });

    expect(extraction.pills).toEqual([
      expect.objectContaining({ category: 'technology', label: 'React' }),
    ]);
    expect(extraction.unclassifiedPills).toEqual([
      expect.objectContaining({
        label: 'Trial day',
        reason: 'unclassified',
        sourceUrl: offerUrl,
      }),
    ]);
  });
});
