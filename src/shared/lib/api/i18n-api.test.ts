import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, apiDeleteMock, apiPostMock, apiPutMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
    delete: apiDeleteMock,
    post: apiPostMock,
    put: apiPutMock,
  },
}));

import {
  deleteCountry,
  deleteCurrency,
  deleteLanguage,
  getCountries,
  getCurrencies,
  getLanguages,
  saveCountry,
  saveCurrency,
  saveLanguage,
} from './i18n-api';

describe('i18n api client', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiDeleteMock.mockReset();
    apiPostMock.mockReset();
    apiPutMock.mockReset();
  });

  it('loads metadata collections from the v2 metadata endpoints', async () => {
    apiGetMock.mockResolvedValue([]);

    await getCurrencies();
    await getCountries();
    await getLanguages();

    expect(apiGetMock).toHaveBeenNthCalledWith(1, '/api/v2/metadata/currencies');
    expect(apiGetMock).toHaveBeenNthCalledWith(2, '/api/v2/metadata/countries');
    expect(apiGetMock).toHaveBeenNthCalledWith(3, '/api/v2/metadata/languages');
  });

  it('routes delete and save operations to the correct create/update endpoints', async () => {
    apiDeleteMock.mockResolvedValue(undefined);
    apiPostMock.mockResolvedValue({});
    apiPutMock.mockResolvedValue({});

    await deleteCurrency('cur-1');
    await deleteCountry('country-1');
    await deleteLanguage('lang-1');
    await saveCurrency(undefined, { code: 'PLN' } as never);
    await saveCurrency('cur-1', { code: 'EUR' } as never);
    await saveCountry(undefined, { code: 'PL' } as never);
    await saveCountry('country-1', { code: 'DE' } as never);
    await saveLanguage(undefined, { code: 'pl' } as never);
    await saveLanguage('lang-1', { code: 'en' } as never);

    expect(apiDeleteMock).toHaveBeenNthCalledWith(1, '/api/v2/metadata/currencies/cur-1');
    expect(apiDeleteMock).toHaveBeenNthCalledWith(2, '/api/v2/metadata/countries/country-1');
    expect(apiDeleteMock).toHaveBeenNthCalledWith(3, '/api/v2/metadata/languages/lang-1');
    expect(apiPostMock).toHaveBeenNthCalledWith(1, '/api/v2/metadata/currencies', {
      code: 'PLN',
    });
    expect(apiPutMock).toHaveBeenNthCalledWith(1, '/api/v2/metadata/currencies/cur-1', {
      code: 'EUR',
    });
    expect(apiPostMock).toHaveBeenNthCalledWith(2, '/api/v2/metadata/countries', {
      code: 'PL',
    });
    expect(apiPutMock).toHaveBeenNthCalledWith(2, '/api/v2/metadata/countries/country-1', {
      code: 'DE',
    });
    expect(apiPostMock).toHaveBeenNthCalledWith(3, '/api/v2/metadata/languages', {
      code: 'pl',
    });
    expect(apiPutMock).toHaveBeenNthCalledWith(3, '/api/v2/metadata/languages/lang-1', {
      code: 'en',
    });
  });
});
