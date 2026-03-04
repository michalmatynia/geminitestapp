import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { GET, POST } from '@/app/api/currencies/route';
import prisma from '@/shared/lib/db/prisma';

type CurrencyResponse = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
};

let canMutateCurrenciesApiTables = true;

describe('Currencies API', () => {
  const shouldSkipCurrenciesApiTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutateCurrenciesApiTables;

  beforeEach(async () => {
    if (shouldSkipCurrenciesApiTests()) return;

    try {
      await prisma.product.deleteMany({});
      await prisma.priceGroup.deleteMany({});
      await prisma.countryCurrency.deleteMany({});
      await prisma.currency.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutateCurrenciesApiTables = false;
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/currencies', () => {
    it('should seed default currencies on first call', async () => {
      if (shouldSkipCurrenciesApiTests()) return;

      const res = await GET(new NextRequest('http://localhost/api/currencies'));
      const currencies = (await res.json()) as CurrencyResponse[];

      expect(res.status).toEqual(200);
      expect(currencies.length).toBeGreaterThan(0);

      const dbCurrencies = await prisma.currency.findMany();
      expect(dbCurrencies.length).toBeGreaterThan(0);

      const usd = currencies.find((c: CurrencyResponse) => c.code === 'USD');
      if (!usd) {
        throw new Error('Expected seeded currency USD.');
      }
      expect(usd.name).toBe('US Dollar');
      expect(usd.symbol).toBe('$');
    });
  });

  describe('POST /api/currencies', () => {
    it('should create a new currency', async () => {
      if (shouldSkipCurrenciesApiTests()) return;

      const newCurrency = {
        code: 'USD',
        name: 'US Dollar Custom',
        symbol: '$',
      };

      const req = new NextRequest('http://localhost/api/currencies', {
        method: 'POST',
        body: JSON.stringify(newCurrency),
      });

      const res = await POST(req);
      const currency = (await res.json()) as CurrencyResponse;

      expect(res.status).toEqual(200);
      expect(currency.code).toBe('USD');
      expect(currency.name).toBe('US Dollar Custom');
    });

    it('should reject invalid payload', async () => {
      if (shouldSkipCurrenciesApiTests()) return;
      const invalidCurrency = {
        code: 'XYZ', // Not in ENUM
        name: 'Invalid',
      };

      const req = new NextRequest('http://localhost/api/currencies', {
        method: 'POST',
        body: JSON.stringify(invalidCurrency),
      });

      const res = await POST(req);
      expect(res.status).toEqual(400);
    });
  });
});
