/**
 * @vitest-environment jsdom
 */
import { Children } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

const {
  appIntlProviderMock,
  htmlLangSyncMock,
  loadSiteMessagesMock,
  notFoundMock,
  setRequestLocaleMock,
} = vi.hoisted(() => ({
  appIntlProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  htmlLangSyncMock: vi.fn(() => null),
  loadSiteMessagesMock: vi.fn(),
  notFoundMock: vi.fn(),
  setRequestLocaleMock: vi.fn(),
}));

vi.mock('@/shared/providers/AppIntlProvider', () => ({
  AppIntlProvider: appIntlProviderMock,
}));

vi.mock('next-intl/server', () => ({
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

describe('StudiQ LocaleLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSiteMessagesMock.mockResolvedValue({
      Common: {
        skipToMainContent: 'Pomoc',
      },
    });
  });

  it('loads normalized locale messages into the provider', async () => {
    const { default: LocaleLayout } = await import('./layout');

    const layout = await LocaleLayout({
      children: <div>child</div>,
      params: Promise.resolve({ locale: 'EN' }),
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

    expect(setRequestLocaleMock).toHaveBeenCalledWith('en');
    expect(loadSiteMessagesMock).toHaveBeenCalledWith('en');
    expect(providerElement.props.locale).toBe('en');
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
        locale: 'en',
      })
    );
  });

  it('delegates unsupported locales to notFound', async () => {
    notFoundMock.mockImplementation(() => {
      throw new Error('NOT_FOUND');
    });

    const { default: LocaleLayout } = await import('./layout');

    await expect(
      LocaleLayout({
        children: <div>child</div>,
        params: Promise.resolve({ locale: 'zz' }),
      })
    ).rejects.toThrow('NOT_FOUND');
    expect(loadSiteMessagesMock).not.toHaveBeenCalled();
  });
});
