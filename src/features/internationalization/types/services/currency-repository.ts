import type { CreateCurrencyDto, UpdateCurrencyDto } from '@/shared/contracts/internationalization';
import type { CurrencyRecord } from '@/shared/types/domain/internationalization';

export type CurrencyRepository = {
  listCurrencies(): Promise<CurrencyRecord[]>;
  getCurrencyById(id: string): Promise<CurrencyRecord | null>;
  getCurrencyByCode(code: string): Promise<CurrencyRecord | null>;
  createCurrency(data: CreateCurrencyDto): Promise<CurrencyRecord>;
  updateCurrency(id: string, data: UpdateCurrencyDto): Promise<CurrencyRecord>;
  deleteCurrency(id: string): Promise<void>;
  isCurrencyInUse(id: string): Promise<boolean>;
  ensureDefaultCurrencies(): Promise<void>;
};
