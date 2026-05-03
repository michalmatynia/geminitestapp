import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrencyRepository: vi.fn(),
  getInternationalizationProvider: vi.fn(),
  listCurrencies: vi.fn(),
  createCurrency: vi.fn(),
}));

vi.mock('@/features/internationalization/server', () => ({
  getCurrencyRepository: mocks.getCurrencyRepository,
  getInternationalizationProvider: mocks.getInternationalizationProvider,
}));

import { getIntlHandler, postIntlHandler } from '@/app/api/v2/metadata/handler';

describe('Currencies API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getInternationalizationProvider.mockResolvedValue('mongodb');
    mocks.getCurrencyRepository.mockResolvedValue({
      listCurrencies: mocks.listCurrencies,
      createCurrency: mocks.createCurrency,
    });
  });

  it('lists currencies from the currency repository', async () => {
    mocks.listCurrencies.mockResolvedValue([
      { id: 'USD', code: 'USD', name: 'US Dollar', symbol: '$' },
    ]);

    const res = await getIntlHandler(new NextRequest('http://localhost/api/v2/metadata/currencies'), {} as any, {
      type: 'currencies',
    });
    const currencies = await res.json();

    expect(res.status).toBe(200);
    expect(currencies).toEqual([{ id: 'USD', code: 'USD', name: 'US Dollar', symbol: '$' }]);
  });

  it('creates a currency from the canonical payload', async () => {
    mocks.createCurrency.mockResolvedValue({
      id: 'USD',
      code: 'USD',
      name: 'US Dollar Custom',
      symbol: '$',
    });

    const req = new NextRequest('http://localhost/api/v2/metadata/currencies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'usd',
        name: 'US Dollar Custom',
        symbol: '$',
      }),
    });

    const res = await postIntlHandler(req, {} as any, { type: 'currencies' });
    const currency = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.createCurrency).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'USD',
        name: 'US Dollar Custom',
        symbol: '$',
      })
    );
    expect(currency.code).toBe('USD');
  });

  it('rejects missing code/name payloads', async () => {
    const req = new NextRequest('http://localhost/api/v2/metadata/currencies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'USD' }),
    });

    await expect(postIntlHandler(req, {} as any, { type: 'currencies' })).rejects.toThrow(
      'Code and name are required'
    );
  });
});
