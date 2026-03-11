import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NextRequest } from 'next/server';

const {
  getCurrencyRepositoryMock,
  getInternationalizationProviderMock,
  getMongoDbMock,
  prismaMock,
  currencyRepoMock,
} = vi.hoisted(() => ({
  getCurrencyRepositoryMock: vi.fn() as Mock,
  getInternationalizationProviderMock: vi.fn() as Mock,
  getMongoDbMock: vi.fn() as Mock,
  prismaMock: {} as Record<string, unknown>,
  currencyRepoMock: {
    listCurrencies: vi.fn() as Mock,
    createCurrency: vi.fn() as Mock,
    updateCurrency: vi.fn() as Mock,
    deleteCurrency: vi.fn() as Mock,
    getCurrencyById: vi.fn() as Mock,
  },
}));

vi.mock('@/features/internationalization/server', () => ({
  getCurrencyRepository: getCurrencyRepositoryMock,
  getInternationalizationProvider: getInternationalizationProviderMock,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: prismaMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { GET_intl_handler, POST_intl_handler } from './handler';

describe('v2 metadata handler canonical contract', () => {
  beforeEach(() => {
    getCurrencyRepositoryMock.mockReset();
    getInternationalizationProviderMock.mockReset();
    getMongoDbMock.mockReset();
    getCurrencyRepositoryMock.mockResolvedValue(currencyRepoMock);
    getInternationalizationProviderMock.mockResolvedValue('prisma');

    Object.keys(prismaMock).forEach((key) => {
      delete prismaMock[key];
    });
    Object.values(currencyRepoMock).forEach((mock) => {
      mock.mockReset();
    });
  });

  it('creates currency from canonical payload shape', async () => {
    currencyRepoMock.createCurrency.mockResolvedValue({
      id: 'PLN',
      code: 'PLN',
      name: 'Polish Zloty',
      symbol: 'zł',
    });

    const request = new NextRequest('http://localhost/api/v2/metadata/currencies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'PLN',
        name: 'Polish Zloty',
        symbol: 'zł',
      }),
    });

    await POST_intl_handler(request, {} as Parameters<typeof POST_intl_handler>[1], {
      type: 'currencies',
    });

    expect(currencyRepoMock.createCurrency).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PLN',
        name: 'Polish Zloty',
        symbol: 'zł',
      })
    );
  });

  it('creates language from canonical payload and country IDs', async () => {
    getInternationalizationProviderMock.mockResolvedValue('mongodb');

    const insertOneMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const countryFindToArrayMock = vi
      .fn()
      .mockResolvedValue([{ id: 'country-pl', code: 'PL', name: 'Poland' }]);

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'languages') {
          return {
            insertOne: insertOneMock,
          };
        }
        if (name === 'countries') {
          return {
            find: vi.fn(() => ({
              toArray: countryFindToArrayMock,
            })),
          };
        }
        return {};
      }),
    });

    const request = new NextRequest('http://localhost/api/v2/metadata/languages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'EN',
        name: 'English',
        nativeName: 'English',
        countryIds: ['country-pl'],
      }),
    });

    await POST_intl_handler(request, {} as Parameters<typeof POST_intl_handler>[1], {
      type: 'languages',
    });

    expect(insertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'EN',
        code: 'EN',
        name: 'English',
        nativeName: 'English',
        countries: [{ countryId: 'country-pl' }],
      })
    );
  });

  it('rejects deprecated wrapped payload envelope', async () => {
    const request = new NextRequest('http://localhost/api/v2/metadata/currencies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        data: {
          code: 'PLN',
          name: 'Polish Zloty',
        },
      }),
    });

    await expect(
      POST_intl_handler(request, {} as Parameters<typeof POST_intl_handler>[1], {
        type: 'currencies',
      })
    ).rejects.toThrow('Code and name are required');
  });

  it('reads languages from mongo provider with mapped country objects', async () => {
    getInternationalizationProviderMock.mockResolvedValue('mongodb');

    const countriesToArrayMock = vi
      .fn()
      .mockResolvedValue([{ id: 'PL', code: 'PL', name: 'Poland' }]);
    const languagesToArrayMock = vi.fn().mockResolvedValue([
      {
        id: 'PL',
        code: 'PL',
        name: 'Polish',
        nativeName: 'Polski',
        countries: [{ countryId: 'PL' }],
      },
    ]);

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'countries') {
          return {
            find: vi.fn(() => ({
              toArray: countriesToArrayMock,
            })),
          };
        }
        if (name === 'languages') {
          return {
            find: vi.fn(() => ({
              sort: vi.fn(() => ({
                toArray: languagesToArrayMock,
              })),
            })),
          };
        }
        return {
          find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
        };
      }),
    });

    const response = await GET_intl_handler(
      new NextRequest('http://localhost/api/v2/metadata/languages'),
      {} as Parameters<typeof GET_intl_handler>[1],
      { type: 'languages' }
    );
    const payload = (await response.json()) as Array<Record<string, unknown>>;

    expect(payload).toHaveLength(1);
    expect(payload[0]?.['id']).toBe('PL');
    expect(payload[0]?.['countries']).toEqual([
      expect.objectContaining({
        id: 'PL',
        code: 'PL',
        name: 'Poland',
      }),
    ]);
  });
});
