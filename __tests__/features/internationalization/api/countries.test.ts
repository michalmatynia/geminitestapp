import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrencyRepository: vi.fn(),
  getInternationalizationProvider: vi.fn(),
  getMongoDb: vi.fn(),
}));

vi.mock('@/features/internationalization/server', () => ({
  getCurrencyRepository: mocks.getCurrencyRepository,
  getInternationalizationProvider: mocks.getInternationalizationProvider,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { GET_intl_handler, POST_intl_handler } from '@/app/api/v2/metadata/handler';
import { PUT_metadata_id_handler } from '@/app/api/v2/metadata/[type]/[id]/handler';

describe('Countries API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getInternationalizationProvider.mockResolvedValue('mongodb');
  });

  it('lists countries from Mongo and maps currencyIds to canonical relations', async () => {
    const countriesToArray = vi.fn().mockResolvedValue([
      {
        id: 'PL',
        code: 'PL',
        name: 'Poland',
        currencyIds: ['PLN'],
      },
    ]);

    mocks.getMongoDb.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'countries') {
          return {
            find: vi.fn(() => ({
              sort: vi.fn(() => ({
                toArray: countriesToArray,
              })),
            })),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }),
    });

    const res = await GET_intl_handler(
      new NextRequest('http://localhost/api/v2/metadata/countries'),
      {} as any,
      { type: 'countries' }
    );
    const countries = await res.json();

    expect(res.status).toBe(200);
    expect(countries).toEqual([
      {
        id: 'PL',
        code: 'PL',
        name: 'Poland',
        isActive: true,
        createdAt: undefined,
        updatedAt: undefined,
        currencies: [{ countryId: 'PL', currencyId: 'PLN' }],
      },
    ]);
  });

  it('creates a country with currencyIds', async () => {
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });

    mocks.getMongoDb.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'countries') {
          return { insertOne };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }),
    });

    const req = new NextRequest('http://localhost/api/v2/metadata/countries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'DE',
        name: 'Germany',
        currencyIds: ['EUR'],
      }),
    });

    const res = await POST_intl_handler(req, {} as any, { type: 'countries' });
    const country = await res.json();

    expect(res.status).toBe(200);
    expect(insertOne).toHaveBeenCalledTimes(1);
    expect(country).toEqual(
      expect.objectContaining({
        id: 'DE',
        code: 'DE',
        name: 'Germany',
        currencies: [{ countryId: 'DE', currencyId: 'EUR' }],
      })
    );
  });

  it('updates a country currencyIds via Mongo', async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'PL',
        code: 'PL',
        name: 'Poland',
        currencyIds: ['PLN'],
      })
      .mockResolvedValueOnce({
        id: 'PL',
        code: 'PL',
        name: 'Poland Updated',
        currencyIds: ['EUR'],
      });
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });

    mocks.getMongoDb.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'countries') {
          return {
            findOne,
            updateOne,
          };
        }
        if (name === 'languages') {
          return {
            updateMany: vi.fn().mockResolvedValue({ acknowledged: true }),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }),
    });

    const req = new NextRequest('http://localhost/api/v2/metadata/countries/PL', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'PL',
        name: 'Poland Updated',
        currencyIds: ['EUR'],
      }),
    });

    const res = await PUT_metadata_id_handler(req, {} as any, {
      type: 'countries',
      id: 'PL',
    });
    const country = await res.json();

    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(country).toEqual(
      expect.objectContaining({
        code: 'PL',
        name: 'Poland Updated',
        currencies: [{ countryId: 'PL', currencyId: 'EUR' }],
      })
    );
  });

  it('rejects missing code/name payloads', async () => {
    const req = new NextRequest('http://localhost/api/v2/metadata/countries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'PL' }),
    });

    await expect(POST_intl_handler(req, {} as any, { type: 'countries' })).rejects.toThrow(
      'Code and name are required'
    );
  });
});
