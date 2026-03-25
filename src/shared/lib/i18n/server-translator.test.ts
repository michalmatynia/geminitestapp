import { beforeEach, describe, expect, it, vi } from 'vitest';

const createTranslatorMock = vi.hoisted(() => vi.fn());
const loadSiteMessagesMock = vi.hoisted(() => vi.fn());
const resolvePreferredSiteLocaleMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('use-intl/core', () => ({
  createTranslator: createTranslatorMock,
}));
vi.mock('@/i18n/messages', () => ({
  loadSiteMessages: loadSiteMessagesMock,
}));
vi.mock('@/shared/lib/i18n/site-locale', () => ({
  resolvePreferredSiteLocale: resolvePreferredSiteLocaleMock,
}));

import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import {
  getSiteTranslator,
  resolveRequestSiteLocale,
} from '@/shared/lib/i18n/server-translator';

describe('server-translator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePreferredSiteLocaleMock.mockReturnValue('de');
    loadSiteMessagesMock.mockResolvedValue({
      greeting: 'Hallo {name}',
    });
    createTranslatorMock.mockImplementation(
      ({
        locale,
      }: {
        locale: string;
      }) =>
        (key: string, values?: Record<string, unknown>) =>
          `${locale}:${key}:${String(values?.['name'] ?? '')}`
    );
  });

  it('resolves request locale from explicit locale, cookies, referer, and accept-language headers', () => {
    const request = new Request('https://example.test/api/products', {
      headers: new Headers({
        'accept-language': 'pl,en;q=0.9',
        'cookie': `${DEFAULT_SITE_I18N_CONFIG.cookieName}=pl%2DPL; theme=dark`,
        'referer': 'https://example.test/pl/products',
        'x-next-intl-locale': 'en',
      }),
    });

    const locale = resolveRequestSiteLocale({
      locale: 'de',
      request,
    });

    expect(locale).toBe('de');
    expect(resolvePreferredSiteLocaleMock).toHaveBeenCalledWith({
      pathname: '/pl/products',
      explicitLocale: 'de',
      cookieLocale: 'pl-PL',
      acceptLanguage: 'pl,en;q=0.9',
    });
  });

  it('falls back cleanly when request metadata is malformed or missing', () => {
    const request = new Request('https://example.test/api/products', {
      headers: new Headers({
        'cookie': 'invalid-cookie-entry',
        'referer': 'not-a-valid-url',
      }),
    });

    resolveRequestSiteLocale({ request });

    expect(resolvePreferredSiteLocaleMock).toHaveBeenCalledWith({
      pathname: null,
      explicitLocale: null,
      cookieLocale: null,
      acceptLanguage: null,
    });
  });

  it('loads messages and returns a typed translator wrapper', async () => {
    resolvePreferredSiteLocaleMock.mockReturnValue('pl');

    const { locale, t } = await getSiteTranslator({
      request: new Request('https://example.test/api/products'),
    });

    expect(locale).toBe('pl');
    expect(loadSiteMessagesMock).toHaveBeenCalledWith('pl');
    expect(createTranslatorMock).toHaveBeenCalledWith({
      locale: 'pl',
      messages: { greeting: 'Hallo {name}' },
    });
    expect(t('greeting', { name: 'Ada' })).toBe('pl:greeting:Ada');
  });
});
