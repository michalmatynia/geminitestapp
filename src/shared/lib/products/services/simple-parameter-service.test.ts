/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  findOne: vi.fn(),
  getMongoDb: vi.fn(),
  getProductDataProvider: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: mocks.getProductDataProvider,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

import { PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY } from '@/shared/lib/products/constants';
import {
  createSimpleParameter,
  deleteSimpleParameter,
  listSimpleParameters,
  updateSimpleParameter,
} from './simple-parameter-service';

const settingFilter = {
  $or: [{ _id: PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY }, { key: PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY }],
};

describe('simple-parameter-service', () => {
  beforeEach(() => {
    mocks.captureException.mockReset();
    mocks.findOne.mockReset();
    mocks.getProductDataProvider.mockReset().mockResolvedValue('mongodb');
    mocks.updateOne.mockReset().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'settings') return {};
        return {
          findOne: mocks.findOne,
          updateOne: mocks.updateOne,
        };
      },
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T17:30:00.000Z'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns an empty list for blank catalog ids and parses invalid settings defensively', async () => {
    expect(await listSimpleParameters({ catalogId: '   ' })).toEqual([]);
    expect(mocks.getProductDataProvider).not.toHaveBeenCalled();

    const parseErrorDoc = { value: '{not-json' };
    mocks.findOne.mockResolvedValueOnce(parseErrorDoc);

    const list = await listSimpleParameters({ catalogId: 'catalog-1' });

    expect(list).toEqual([]);
    expect(mocks.findOne).toHaveBeenCalledWith(settingFilter);
    expect(mocks.captureException).toHaveBeenCalledTimes(1);
  });

  it('lists and sorts parameters by catalog and search term', async () => {
    const storedValue = JSON.stringify([
      {
        id: 'p-2',
        catalogId: 'catalog-1',
        name_en: 'zeta',
        name_pl: 'Żeta',
        name_de: '',
        createdAt: '2026-03-24T10:00:00.000Z',
        updatedAt: '2026-03-24T10:00:00.000Z',
      },
      {
        id: 'p-1',
        catalogId: 'catalog-1',
        name_en: ' Alpha ',
        name_pl: ' Alfa ',
        name_de: null,
      },
      {
        id: 'p-3',
        catalogId: 'catalog-2',
        name_en: 'alpha',
      },
      {
        catalogId: 'catalog-1',
        name_en: 'broken',
      },
    ]);
    mocks.findOne
      .mockResolvedValueOnce({ value: storedValue })
      .mockResolvedValueOnce({ value: storedValue });

    const all = await listSimpleParameters({ catalogId: 'catalog-1' });
    const searched = await listSimpleParameters({ catalogId: 'catalog-1', search: 'alf' });

    expect(all.map((item) => item.id)).toEqual(['p-1', 'p-2']);
    expect(all[0]).toEqual(
      expect.objectContaining({
        id: 'p-1',
        name: 'Alpha',
        name_en: 'Alpha',
        name_pl: 'Alfa',
        name_de: null,
      })
    );
    expect(searched.map((item) => item.id)).toEqual(['p-1']);
  });

  it('creates parameters, trims nullable fields, and rejects duplicates or missing required input', async () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'browser-uuid'),
    });

    mocks.findOne
      .mockResolvedValueOnce({
        value: JSON.stringify([
          {
            id: 'existing',
            catalogId: 'catalog-1',
            name_en: 'Width',
            createdAt: '2026-03-25T10:00:00.000Z',
            updatedAt: '2026-03-25T10:00:00.000Z',
          },
        ]),
      })
      .mockResolvedValueOnce({
        value: JSON.stringify([
          {
            id: 'existing',
            catalogId: 'catalog-1',
            name_en: 'Width',
            createdAt: '2026-03-25T10:00:00.000Z',
            updatedAt: '2026-03-25T10:00:00.000Z',
          },
        ]),
      });

    const created = await createSimpleParameter({
      catalogId: ' catalog-1 ',
      name_en: ' Height ',
      name_pl: ' Wysokosc ',
      name_de: '   ',
    });

    expect(created).toEqual({
      id: 'browser-uuid',
      name: 'Height',
      catalogId: 'catalog-1',
      name_en: 'Height',
      name_pl: 'Wysokosc',
      name_de: null,
      createdAt: '2026-03-25T17:30:00.000Z',
      updatedAt: '2026-03-25T17:30:00.000Z',
    });
    expect(mocks.updateOne).toHaveBeenCalledWith(
      settingFilter,
      {
        $set: expect.objectContaining({
          key: PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY,
          updatedAt: new Date('2026-03-25T17:30:00.000Z'),
          value: JSON.stringify([
            {
              id: 'existing',
              name: 'Width',
              catalogId: 'catalog-1',
              name_en: 'Width',
              name_pl: null,
              name_de: null,
              createdAt: '2026-03-25T10:00:00.000Z',
              updatedAt: '2026-03-25T10:00:00.000Z',
            },
            {
              id: 'browser-uuid',
              name: 'Height',
              catalogId: 'catalog-1',
              name_en: 'Height',
              name_pl: 'Wysokosc',
              name_de: null,
              createdAt: '2026-03-25T17:30:00.000Z',
              updatedAt: '2026-03-25T17:30:00.000Z',
            },
          ]),
        }),
        $setOnInsert: {
          createdAt: new Date('2026-03-25T17:30:00.000Z'),
        },
      },
      { upsert: true }
    );

    mocks.findOne.mockResolvedValueOnce({
      value: JSON.stringify([
        {
          id: 'existing',
          catalogId: 'catalog-1',
          name_en: 'Width',
        },
      ]),
    });

    await expect(
      createSimpleParameter({
        catalogId: 'catalog-1',
        name_en: ' width ',
      })
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'A parameter with this name already exists in this catalog',
    });

    await expect(
      createSimpleParameter({
        catalogId: ' ',
        name_en: ' ',
      })
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'Catalog and English name are required.',
    });
  });

  it('updates parameters and rejects missing or duplicate targets', async () => {
    const baseItems = [
      {
        id: 'param-1',
        catalogId: 'catalog-1',
        name_en: 'Width',
        name_pl: 'Szerokosc',
        name_de: null,
        createdAt: '2026-03-25T10:00:00.000Z',
        updatedAt: '2026-03-25T10:00:00.000Z',
      },
      {
        id: 'param-2',
        catalogId: 'catalog-2',
        name_en: 'Height',
        createdAt: '2026-03-25T11:00:00.000Z',
        updatedAt: '2026-03-25T11:00:00.000Z',
      },
    ];

    mocks.findOne.mockResolvedValueOnce({ value: JSON.stringify(baseItems) });

    const updated = await updateSimpleParameter(' param-1 ', {
      catalogId: ' catalog-2 ',
      name_en: ' Depth ',
      name_pl: '  ',
      name_de: 'Tiefe',
    });

    expect(updated).toEqual({
      id: 'param-1',
      name: 'Width',
      catalogId: 'catalog-2',
      name_en: 'Depth',
      name_pl: null,
      name_de: 'Tiefe',
      createdAt: '2026-03-25T10:00:00.000Z',
      updatedAt: '2026-03-25T17:30:00.000Z',
    });
    expect(mocks.updateOne).toHaveBeenCalledTimes(1);

    mocks.findOne.mockResolvedValueOnce({ value: JSON.stringify(baseItems) });
    await expect(
      updateSimpleParameter('param-1', {
        catalogId: 'catalog-2',
        name_en: 'height',
      })
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'A parameter with this name already exists in this catalog',
    });

    mocks.findOne.mockResolvedValueOnce({ value: JSON.stringify(baseItems) });
    await expect(updateSimpleParameter('missing', { name_en: 'Nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Parameter not found',
    });

    await expect(updateSimpleParameter('   ', { name_en: 'Nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Parameter not found',
    });
  });

  it('deletes parameters and rejects missing ids', async () => {
    const baseItems = [
      {
        id: 'param-1',
        catalogId: 'catalog-1',
        name_en: 'Width',
        createdAt: '2026-03-25T10:00:00.000Z',
        updatedAt: '2026-03-25T10:00:00.000Z',
      },
      {
        id: 'param-2',
        catalogId: 'catalog-1',
        name_en: 'Height',
        createdAt: '2026-03-25T11:00:00.000Z',
        updatedAt: '2026-03-25T11:00:00.000Z',
      },
    ];

    mocks.findOne.mockResolvedValueOnce({ value: JSON.stringify(baseItems) });
    await deleteSimpleParameter(' param-1 ');

    const deletePayload = mocks.updateOne.mock.calls[0]?.[1] as {
      $set: { value: string };
    };
    expect(JSON.parse(deletePayload.$set.value)).toEqual([
      {
        id: 'param-2',
        name: 'Height',
        catalogId: 'catalog-1',
        name_en: 'Height',
        name_pl: null,
        name_de: null,
        createdAt: '2026-03-25T11:00:00.000Z',
        updatedAt: '2026-03-25T11:00:00.000Z',
      },
    ]);

    mocks.findOne.mockResolvedValueOnce({ value: JSON.stringify(baseItems) });
    await expect(deleteSimpleParameter('missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Parameter not found',
    });

    await expect(deleteSimpleParameter('   ')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Parameter not found',
    });
  });
});
