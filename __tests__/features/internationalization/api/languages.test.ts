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

import { getIntlHandler, postIntlHandler } from '@/app/api/v2/metadata/handler';
import {
  deleteMetadataIdHandler,
  putMetadataIdHandler,
} from '@/app/api/v2/metadata/[type]/[id]/handler';

describe('Languages API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getInternationalizationProvider.mockResolvedValue('mongodb');
  });

  it('lists languages with expanded country metadata', async () => {
    const languageToArray = vi.fn().mockResolvedValue([
      {
        id: 'EN',
        code: 'EN',
        name: 'English',
        nativeName: 'English',
        countries: [{ countryId: 'PL' }],
      },
    ]);
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
        if (name === 'languages') {
          return {
            find: vi.fn(() => ({
              sort: vi.fn(() => ({
                skip: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    toArray: languageToArray,
                  })),
                })),
              })),
            })),
          };
        }
        if (name === 'countries') {
          return {
            find: vi.fn(() => ({
              toArray: countriesToArray,
            })),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }),
    });

    const res = await getIntlHandler(
      new NextRequest('http://localhost/api/v2/metadata/languages'),
      {} as any,
      { type: 'languages' }
    );
    const languages = await res.json();

    expect(res.status).toBe(200);
    expect(languages).toEqual([
      expect.objectContaining({
        id: 'EN',
        code: 'EN',
        name: 'English',
        countries: [
          {
            id: 'PL',
            code: 'PL',
            name: 'Poland',
            isActive: true,
            countryId: 'PL',
          },
        ],
      }),
    ]);
  });

  it('creates a language with country assignments', async () => {
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const countriesToArray = vi.fn().mockResolvedValue([
      { id: 'PL', code: 'PL', name: 'Poland', currencyIds: ['PLN'] },
    ]);

    mocks.getMongoDb.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'languages') {
          return { insertOne };
        }
        if (name === 'countries') {
          return {
            find: vi.fn(() => ({
              toArray: countriesToArray,
            })),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }),
    });

    const req = new NextRequest('http://localhost/api/v2/metadata/languages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        countryIds: ['PL'],
      }),
    });

    const res = await postIntlHandler(req, {} as any, { type: 'languages' });
    const language = await res.json();

    expect(res.status).toBe(200);
    expect(insertOne).toHaveBeenCalledTimes(1);
    expect(language).toEqual(
      expect.objectContaining({
        code: 'FR',
        name: 'French',
        countries: [
          expect.objectContaining({
            countryId: 'PL',
          }),
        ],
      })
    );
  });

  it('updates a language with country assignments', async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'PL',
        code: 'PL',
        name: 'Polish',
        nativeName: 'Polski',
        countries: [{ countryId: 'PL' }],
      })
      .mockResolvedValueOnce({
        id: 'PL',
        code: 'PL',
        name: 'Polish Updated',
        nativeName: 'Polski',
        countries: [{ countryId: 'DE' }],
      });
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const countriesToArray = vi.fn().mockResolvedValue([
      { id: 'DE', code: 'DE', name: 'Germany', currencyIds: ['EUR'] },
    ]);

    mocks.getMongoDb.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'languages') {
          return {
            findOne,
            updateOne,
          };
        }
        if (name === 'countries') {
          return {
            find: vi.fn(() => ({
              toArray: countriesToArray,
            })),
          };
        }
        if (name === 'catalogs') {
          return {
            updateMany: vi.fn().mockResolvedValue({ acknowledged: true }),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }),
    });

    const req = new NextRequest('http://localhost/api/v2/metadata/languages/PL', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'PL',
        name: 'Polish Updated',
        nativeName: 'Polski',
        countryIds: ['DE'],
      }),
    });

    const res = await putMetadataIdHandler(req, {} as any, {
      type: 'languages',
      id: 'PL',
    });
    const language = await res.json();

    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(language).toEqual(
      expect.objectContaining({
        name: 'Polish Updated',
        countries: [
          expect.objectContaining({
            countryId: 'DE',
          }),
        ],
      })
    );
  });

  it('deletes a language and clears catalog references', async () => {
    const findOne = vi.fn().mockResolvedValue({
      id: 'SV',
      code: 'SV',
      name: 'Swedish',
      nativeName: 'Svenska',
      countries: [{ countryId: 'SE' }],
    });
    const deleteOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const updateMany = vi.fn().mockResolvedValue({ acknowledged: true });

    mocks.getMongoDb.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'languages') {
          return {
            findOne,
            deleteOne,
          };
        }
        if (name === 'catalogs') {
          return {
            updateMany,
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }),
    });

    const res = await deleteMetadataIdHandler(
      new NextRequest('http://localhost/api/v2/metadata/languages/SV'),
      {} as any,
      {
        type: 'languages',
        id: 'SV',
      }
    );

    expect(res.status).toBe(204);
    expect(deleteOne).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledTimes(2);
  });
});
