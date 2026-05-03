/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';

import type { ReactNode } from 'react';

const {
  loadKangurSiteMessagesMock,
  nextIntlProviderMock,
  htmlLangSyncMock,
  kangurAppearanceLayoutMock,
} = vi.hoisted(() => ({
  loadKangurSiteMessagesMock: vi.fn(),
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
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: nextIntlProviderMock,
}));

vi.mock('@/i18n/messages', () => ({
  loadKangurSiteMessages: loadKangurSiteMessagesMock,
}));

vi.mock('@/shared/ui/HtmlLangSync', () => ({
  HtmlLangSync: htmlLangSyncMock,
}));

vi.mock('./KangurAppearanceLayout', () => ({
  default: kangurAppearanceLayoutMock,
}));

describe('apps/studiq-web Kangur layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadKangurSiteMessagesMock.mockResolvedValue({
      Common: {
        skipToMainContent: 'Skip to main content',
      },
    });
  });

  it('wraps the shared Kangur appearance layout with the default-locale intl provider', async () => {
    const { default: KangurLayout } = await import('./layout');

    const result = await KangurLayout({
      children: <div data-testid='workspace-child'>Workspace child</div>,
    });

    render(result);

    expect(loadKangurSiteMessagesMock).toHaveBeenCalledWith('pl');
    expect(nextIntlProviderMock).toHaveBeenCalledTimes(1);
    expect(htmlLangSyncMock).toHaveBeenCalledWith({ locale: 'pl' }, undefined);
    expect(screen.getByTestId('next-intl-provider')).toHaveAttribute('data-locale', 'pl');
    expect(screen.getByTestId('kangur-appearance-layout')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-child')).toBeInTheDocument();
  });
});
