import { Prisma as _Prisma, type Currency, CurrencyCode } from '@prisma/client';

import { defaultCurrencies } from '@/features/internationalization/server';
import type { CurrencyRecord } from '@/shared/contracts/internationalization';
import type { CurrencyRepository } from '@/shared/contracts/internationalization';
import prisma from '@/shared/lib/db/prisma';


const toCurrencyDomain = (currency: Currency): CurrencyRecord => ({
  id: currency.id,
  code: currency.code,
  name: currency.name,
  symbol: currency.symbol ?? null,
  isDefault: false,
  isActive: true,
  createdAt: currency.createdAt.toISOString(),
  updatedAt: currency.updatedAt ? currency.updatedAt.toISOString() : undefined,
});

export const prismaCurrencyRepository: CurrencyRepository = {
  async listCurrencies(): Promise<CurrencyRecord[]> {
    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });
    return currencies.map(toCurrencyDomain);
  },

  async getCurrencyByCode(code: string): Promise<CurrencyRecord | null> {
    const currency = await prisma.currency.findUnique({
      where: { code: code as CurrencyCode },
    });
    return currency ? toCurrencyDomain(currency) : null;
  },

  async getCurrencyById(id: string): Promise<CurrencyRecord | null> {
    const currency = await prisma.currency.findUnique({
      where: { id },
    });
    return currency ? toCurrencyDomain(currency) : null;
  },

  async createCurrency(data: { code: string; name: string; symbol?: string | null }): Promise<CurrencyRecord> {
    const currency = await prisma.currency.create({
      data: {
        id: data.code,
        code: data.code as CurrencyCode,
        name: data.name,
        symbol: data.symbol ?? null,
      },
    });
    return toCurrencyDomain(currency);
  },

  async updateCurrency(id: string, data: { code?: string; name?: string; symbol?: string | null }): Promise<CurrencyRecord> {
    const updateData: _Prisma.CurrencyUpdateInput = {
      id: data.code ?? id,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.symbol !== undefined) updateData.symbol = data.symbol;
    if (data.code !== undefined) updateData.code = data.code as CurrencyCode;

    const currency = await prisma.currency.update({
      where: { id },
      data: updateData,
    });
    return toCurrencyDomain(currency);
  },

  async deleteCurrency(id: string): Promise<void> {
    await prisma.currency.delete({ where: { id } });
  },

  async isCurrencyInUse(id: string): Promise<boolean> {
    const [priceGroupCount, countryCount] = await Promise.all([
      prisma.priceGroup.count({ where: { currencyId: id } }),
      prisma.countryCurrency.count({ where: { currencyId: id } }),
    ]);
    return priceGroupCount > 0 || countryCount > 0;
  },

  async ensureDefaultCurrencies(): Promise<void> {
    await prisma.currency.createMany({
      data: defaultCurrencies.map(c => ({
        id: c.code,
        code: c.code as CurrencyCode,
        name: c.name,
        symbol: c.symbol ?? null
      })),
      skipDuplicates: true,
    });
  },
};
