import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/v2/products/metadata/[type]/route';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

type PriceGroupResponse = {
  id: string;
  groupId: string;
  name: string;
  currencyId: string;
  type: string;
  basePriceField: string;
  isDefault: boolean;
  sourceGroupId?: string | null;
};

describe('Price Groups API', () => {
  const priceGroupsRouteContext = { params: Promise.resolve({ type: 'price-groups' }) };
  const currencies = new Map<string, { id: string; code: string; name: string }>();
  const priceGroups: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    currencies.clear();
    priceGroups.length = 0;

    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'currencies') {
          return {
            find: (query: Record<string, unknown>) => ({
              toArray: async () => {
                const ids = (query.id as { $in?: string[] } | undefined)?.$in ?? [];
                return Array.from(currencies.values()).filter((currency) => ids.includes(currency.id));
              },
            }),
            findOne: async (query: Record<string, unknown>) => {
              if (query.code && typeof query.code === 'string') {
                return Array.from(currencies.values()).find((currency) => currency.code === query.code) ?? null;
              }
              const alternatives = Array.isArray(query.$or) ? query.$or : [];
              for (const alternative of alternatives) {
                const id = typeof alternative.id === 'string' ? alternative.id : null;
                const code = typeof alternative.code === 'string' ? alternative.code : null;
                const match =
                  (id ? currencies.get(id) : null) ??
                  (code
                    ? Array.from(currencies.values()).find((currency) => currency.code === code) ?? null
                    : null);
                if (match) return match;
              }
              return null;
            },
          };
        }

        if (name === 'price_groups') {
          return {
            find: () => ({
              sort: () => ({
                skip: () => ({
                  limit: () => ({
                    toArray: async () =>
                      [...priceGroups].sort((left, right) =>
                        String(left.name ?? '').localeCompare(String(right.name ?? ''))
                      ),
                  }),
                }),
              }),
            }),
            findOne: async (query: Record<string, unknown>) => {
              if (query.groupId && typeof query.groupId === 'string') {
                return priceGroups.find((group) => group.groupId === query.groupId) ?? null;
              }
              return null;
            },
            insertOne: async (doc: Record<string, unknown>) => {
              priceGroups.push(doc);
              return { acknowledged: true };
            },
          };
        }

        throw new Error(`Unexpected collection: ${name}`);
      },
    });
  });

  describe('GET /api/v2/products/metadata/price-groups', () => {
    it('should return empty list initially', async () => {
      const res = await GET(
        new NextRequest('http://localhost/api/v2/products/metadata/price-groups'),
        priceGroupsRouteContext
      );
      const groups = (await res.json()) as PriceGroupResponse[];
      expect(res.status).toEqual(200);
      expect(groups).toEqual([]);
    });

    it('should return created price groups', async () => {
      currencies.set('usd', { id: 'usd', code: 'USD', name: 'US Dollar' });
      priceGroups.push({
        id: 'pg1',
        groupId: 'PG1',
        name: 'Group 1',
        currencyId: 'usd',
        type: 'standard',
        basePriceField: 'price',
        isDefault: false,
        sourceGroupId: null,
        priceMultiplier: 1,
        addToPrice: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await GET(
        new NextRequest('http://localhost/api/v2/products/metadata/price-groups'),
        priceGroupsRouteContext
      );
      const groups = (await res.json()) as PriceGroupResponse[];
      expect(res.status).toEqual(200);
      expect(groups).toHaveLength(1);
      expect(groups[0]!.groupId).toBe('PG1');
    });
  });

  describe('POST /api/v2/products/metadata/price-groups', () => {
    it('should create a standard price group', async () => {
      currencies.set('usd', { id: 'usd', code: 'USD', name: 'US Dollar' });

      const newGroup = {
        groupId: 'STD',
        name: 'Standard Group',
        currencyId: 'usd',
        type: 'standard',
        basePriceField: 'price',
        priceMultiplier: 1,
        addToPrice: 0,
        isDefault: true,
      };

      const req = new NextRequest('http://localhost/api/v2/products/metadata/price-groups', {
        method: 'POST',
        body: JSON.stringify(newGroup),
      });

      const res = await POST(req, priceGroupsRouteContext);
      const group = (await res.json()) as PriceGroupResponse;

      expect(res.status).toEqual(200);
      expect(group.groupId).toBe('STD');
      expect(group.isDefault).toBe(true);
    });

    it('should create a dependent price group', async () => {
      currencies.set('eur', { id: 'eur', code: 'EUR', name: 'Euro' });
      const sourceGroup = {
        id: 'base-id',
        groupId: 'BASE',
        name: 'Base Group',
        currencyId: 'eur',
        type: 'standard',
        basePriceField: 'price',
        isDefault: false,
        sourceGroupId: null,
        priceMultiplier: 1,
        addToPrice: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      priceGroups.push(sourceGroup);

      const newGroup = {
        groupId: 'DEP',
        name: 'Dependent Group',
        currencyId: 'eur',
        type: 'dependent',
        basePriceField: 'price',
        sourceGroupId: sourceGroup.id,
        priceMultiplier: 1.2,
        addToPrice: 10,
      };

      const req = new NextRequest('http://localhost/api/v2/products/metadata/price-groups', {
        method: 'POST',
        body: JSON.stringify(newGroup),
      });

      const res = await POST(req, priceGroupsRouteContext);
      const group = (await res.json()) as PriceGroupResponse;

      expect(res.status).toEqual(200);
      expect(group.type).toBe('dependent');
      expect(group.sourceGroupId).toBe(sourceGroup.id);
    });

    it('should fail validation for dependent group without source', async () => {
      currencies.set('eur', { id: 'eur', code: 'EUR', name: 'Euro' });

      const newGroup = {
        groupId: 'DEP_FAIL',
        name: 'Dependent Fail',
        currencyId: 'eur',
        type: 'dependent',
        basePriceField: 'price',
        // sourceGroupId missing
        priceMultiplier: 1.2,
        addToPrice: 10,
      };

      const req = new NextRequest('http://localhost/api/v2/products/metadata/price-groups', {
        method: 'POST',
        body: JSON.stringify(newGroup),
      });

      const res = await POST(req, priceGroupsRouteContext);
      expect(res.status).toEqual(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('Invalid payload');
    });
  });
});
