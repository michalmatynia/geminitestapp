import type { CurrencyRecord } from '@/shared/types/domain/internationalization';

export type CurrencyRepository = {
  listCurrencies(): Promise<CurrencyRecord[]>;
  getCurrencyById(id: string): Promise<CurrencyRecord | null>;
  getCurrencyByCode(code: string): Promise<CurrencyRecord | null>;
  createCurrency(data: { code: string; name: string; symbol?: string | null }): Promise<CurrencyRecord>;
  updateCurrency(id: string, data: { code?: string; name?: string; symbol?: string | null }): Promise<CurrencyRecord>;
  deleteCurrency(id: string): Promise<void>;
  isCurrencyInUse(id: string): Promise<boolean>;
  ensureDefaultCurrencies(): Promise<void>;
};
