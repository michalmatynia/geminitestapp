import { describe, expect, it, vi } from 'vitest';

import {
  syncCountries,
  syncCountriesPrismaToMongo,
  syncCurrencies,
  syncCurrenciesPrismaToMongo,
  syncLanguages,
  syncLanguagesPrismaToMongo,
} from '@/shared/lib/db/services/sync/geo-sync';

const createMongo = (docsByCollection: Record<string, unknown[]>) => {
  const collections = new Map<
    string,
    {
      find: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      insertMany: ReturnType<typeof vi.fn>;
    }
  >();

  const collection = vi.fn((name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(docsByCollection[name] ?? []),
        }),
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 2 }),
        insertMany: vi.fn().mockResolvedValue({ insertedCount: (docsByCollection[name] ?? []).length }),
      });
    }
    return collections.get(name)!;
  });

  return {
    mongo: { collection } as unknown as Parameters<typeof syncCurrencies>[0]['mongo'],
    collections,
  };
};

const baseContext = {
  normalizeId: (doc: Record<string, unknown>): string =>
    typeof doc._id === 'string' ? doc._id : typeof doc.id === 'string' ? doc.id : '',
  toDate: (value: unknown): Date | null => (value ? new Date(value as string | Date) : null),
  toObjectIdMaybe: (value: string) => value,
  toJsonValue: (value: unknown) => value,
  currencyCodes: new Set<string>(),
  countryCodes: new Set<string>(),
};

describe('geo-sync', () => {
  it('syncs currencies from Mongo to Prisma and reports skipped codes', async () => {
    const createdAt = new Date('2026-03-25T13:00:00.000Z');
    const { mongo } = createMongo({
      currencies: [
        {
          id: 'USD',
          code: 'usd',
          name: 'US Dollar',
          symbol: '$',
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: 'ZZZ',
          code: 'zzz',
          name: 'Unknown',
        },
      ],
    });

    const prisma = {
      product: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      priceGroup: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      currency: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as Parameters<typeof syncCurrencies>[0]['prisma'];

    const result = await syncCurrencies({
      mongo,
      prisma,
      ...baseContext,
      currencyCodes: new Set(['USD']),
    });

    expect(result).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
      warnings: ['Skipped currency code: ZZZ'],
    });
    expect(prisma.product.deleteMany).toHaveBeenCalledWith();
    expect(prisma.priceGroup.deleteMany).toHaveBeenCalledWith();
    expect(prisma.currency.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'USD',
          code: 'USD',
          name: 'US Dollar',
        }),
      ],
    });
  });

  it('syncs countries and languages from Mongo to Prisma with join tables', async () => {
    const createdAt = new Date('2026-03-25T13:30:00.000Z');
    const { mongo } = createMongo({
      countries: [
        {
          id: 'PL',
          code: 'pl',
          name: 'Poland',
          currencyIds: ['PLN', 'EUR'],
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: 'XX',
          code: 'xx',
          name: 'Unknown',
        },
      ],
      languages: [
        {
          id: 'PL',
          code: 'pl',
          name: 'Polish',
          nativeName: 'Polski',
          countries: [{ countryId: 'PL' }],
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: 'EMPTY',
          code: '',
          name: 'Invalid',
        },
      ],
    });

    const prisma = {
      country: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn(),
      },
      countryCurrency: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      catalog: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      language: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn(),
      },
      languageCountry: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as Parameters<typeof syncCountries>[0]['prisma'];

    const countryResult = await syncCountries({
      mongo,
      prisma,
      ...baseContext,
      countryCodes: new Set(['PL']),
    });
    const languageResult = await syncLanguages({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(countryResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
      warnings: ['Skipped country code: XX'],
    });
    expect(languageResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(prisma.country.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'PL',
          code: 'PL',
          name: 'Poland',
        }),
      ],
    });
    expect(prisma.countryCurrency.createMany).toHaveBeenCalledWith({
      data: [
        { countryId: 'PL', currencyId: 'PLN' },
        { countryId: 'PL', currencyId: 'EUR' },
      ],
    });
    expect(prisma.catalog.deleteMany).toHaveBeenCalledWith();
    expect(prisma.languageCountry.createMany).toHaveBeenCalledWith({
      data: [{ languageId: 'PL', countryId: 'PL' }],
    });
  });

  it('syncs currencies, countries, and languages from Prisma back to Mongo', async () => {
    const createdAt = new Date('2026-03-25T14:00:00.000Z');
    const { mongo, collections } = createMongo({});

    const prisma = {
      currency: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'USD',
            code: 'USD',
            name: 'US Dollar',
            symbol: '$',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      country: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'PL',
            code: 'PL',
            name: 'Poland',
            currencies: [{ currencyId: 'PLN' }],
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      language: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'PL',
            code: 'PL',
            name: 'Polish',
            nativeName: 'Polski',
            countries: [
              {
                countryId: 'PL',
                country: {
                  id: 'PL',
                  code: 'PL',
                  name: 'Poland',
                },
              },
            ],
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
    } as unknown as Parameters<typeof syncCurrenciesPrismaToMongo>[0]['prisma'];

    const currencyResult = await syncCurrenciesPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const countryResult = await syncCountriesPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const languageResult = await syncLanguagesPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(currencyResult).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });
    expect(countryResult).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });
    expect(languageResult).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });

    expect(collections.get('currencies')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'USD',
        code: 'USD',
      }),
    ]);
    expect(collections.get('countries')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'PL',
        currencyIds: ['PLN'],
      }),
    ]);
    expect(collections.get('languages')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'PL',
        countries: [
          {
            countryId: 'PL',
            country: {
              id: 'PL',
              code: 'PL',
              name: 'Poland',
            },
          },
        ],
      }),
    ]);
  });
});
