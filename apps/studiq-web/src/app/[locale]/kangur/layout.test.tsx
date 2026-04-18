/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';

import type { ReactNode } from 'react';

const {
  setRequestLocaleMock,
  loadSiteMessagesMock,
  nextIntlProviderMock,
  htmlLangSyncMock,
  kangurAppearanceLayoutMock,
  notFoundMock,
} = vi.hoisted(() => ({
  setRequestLocaleMock: vi.fn(),
  loadSiteMessagesMock: vi.fn(),
  nextIntlProviderMock: vi.fn(
    ({
      children,
      locale,
      messages,
    }: {
      children: ReactNode;
      locale: string;
      messages: unknown;
    }) => (
      <div
        data-testid='next-intl-provider'
        data-locale={locale}
        data-messages={JSON.stringify(messages)}
      >
        {children}
      </div>
    )
  ),
  htmlLangSyncMock: vi.fn(({ locale }: { locale: string }) => (
    <div data-testid='html-lang-sync' data-locale={locale} />
  )),
  kangurAppearanceLayoutMock: vi.fn(({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-appearance-layout'>{children}</div>
  )),
  notFoundMock: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: nextIntlProviderMock,
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

vi.mock('../../kangur/KangurAppearanceLayout', () => ({
  default: kangurAppearanceLayoutMock,
}));

describe('apps/studiq-web localized Kangur layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSiteMessagesMock.mockResolvedValue({
      Common: {
        skipToMainContent: 'Skip to main content',
      },
    });
  });

  it('binds the requested locale for localized Kangur routes', async () => {
    const { default: LocalizedKangurLayout } = await import('./layout');

    const result = await LocalizedKangurLayout({
      children: <div data-testid='workspace-child'>Workspace child</div>,
      params: Promise.resolve({ locale: 'en' }),
    });

    render(result);

    expect(setRequestLocaleMock).toHaveBeenCalledWith('en');
    expect(loadSiteMessagesMock).toHaveBeenCalledWith('en');
    expect(screen.getByTestId('next-intl-provider')).toHaveAttribute('data-locale', 'en');
    expect(screen.getByTestId('html-lang-sync')).toHaveAttribute('data-locale', 'en');
    expect(screen.getByTestId('kangur-appearance-layout')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-child')).toBeInTheDocument();
  });

  it('normalizes uppercase locale params before loading localized Kangur content', async () => {
    const { default: LocalizedKangurLayout } = await import('./layout');

    const result = await LocalizedKangurLayout({
      children: <div data-testid='workspace-child'>Workspace child</div>,
      params: Promise.resolve({ locale: 'EN' }),
    });

    render(result);

    expect(setRequestLocaleMock).toHaveBeenCalledWith('en');
    expect(loadSiteMessagesMock).toHaveBeenCalledWith('en');
    expect(screen.getByTestId('next-intl-provider')).toHaveAttribute('data-locale', 'en');
    expect(screen.getByTestId('html-lang-sync')).toHaveAttribute('data-locale', 'en');
  });

  it('rejects unsupported locales', async () => {
    const { default: LocalizedKangurLayout } = await import('./layout');

    await expect(
      LocalizedKangurLayout({
        children: <div />,
        params: Promise.resolve({ locale: 'xx' }),
      })
    ).rejects.toThrow('NOT_FOUND');

    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(loadSiteMessagesMock).not.toHaveBeenCalled();
  });
});
