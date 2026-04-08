/**
 * @vitest-environment jsdom
 */
import { Children } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

const {
  appIntlProviderMock,
  getTranslationsMock,
  htmlLangSyncMock,
  loadSiteMessagesMock,
  notFoundMock,
  setRequestLocaleMock,
} = vi.hoisted(() => ({
  appIntlProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  getTranslationsMock: vi.fn(),
  htmlLangSyncMock: vi.fn(() => null),
  loadSiteMessagesMock: vi.fn(),
  notFoundMock: vi.fn(),
  setRequestLocaleMock: vi.fn(),
}));

vi.mock('@/shared/providers/AppIntlProvider', () => ({
  AppIntlProvider: appIntlProviderMock,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: getTranslationsMock,
  setRequestLocale: setRequestLocaleMock,
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('@/i18n/messages', () => ({
  loadSiteMessages: loadSiteMessagesMock,
}));

vi.mock('@/shared/ui/HtmlLangSync', () => ({
  HtmlLangSync: htmlLangSyncMock,
}));

describe('LocaleLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTranslationsMock.mockResolvedValue((key: string) => key);
    loadSiteMessagesMock.mockResolvedValue({
      Common: {
        skipToMainContent: 'Pomoc',
      },
    });
  });

  it('loads normalized locale messages into the provider', async () => {
    const { default: LocaleLayout } = await import('@/app/[locale]/layout');

    const layout = await LocaleLayout({
      children: <div>child</div>,
      params: Promise.resolve({ locale: 'PL' }),
    });
    const providerElement = layout as ReactElement<{
      children?: ReactNode;
      locale?: string;
      messages?: unknown;
    }>;
    const providerChildren = Children.toArray(providerElement.props.children);
    const htmlLangSyncElement = providerChildren.find(
      (child) => typeof child === 'object' && child !== null && 'type' in child
    ) as ReactElement<{ locale?: string }> | undefined;

    expect(setRequestLocaleMock).toHaveBeenCalledWith('pl');
    expect(loadSiteMessagesMock).toHaveBeenCalledWith('pl');
    expect(providerElement.props.locale).toBe('pl');
    expect(providerElement.props.messages).toEqual(
      expect.objectContaining({
        Common: expect.objectContaining({
          skipToMainContent: 'Pomoc',
        }),
      })
    );
    expect(htmlLangSyncElement?.type).toBe(htmlLangSyncMock);
    expect(htmlLangSyncElement?.props).toEqual(
      expect.objectContaining({
        locale: 'pl',
      })
    );
  });

  it('delegates unsupported locales to notFound', async () => {
    notFoundMock.mockImplementation(() => {
      throw new Error('NOT_FOUND');
    });

    const { default: LocaleLayout } = await import('@/app/[locale]/layout');

    await expect(
      LocaleLayout({
        children: <div>child</div>,
        params: Promise.resolve({ locale: 'zz' }),
      })
    ).rejects.toThrow('NOT_FOUND');
    expect(loadSiteMessagesMock).not.toHaveBeenCalled();
  });
});
