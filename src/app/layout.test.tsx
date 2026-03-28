/**
 * @vitest-environment jsdom
 */
import { Children, isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

const {
  getLocaleMock,
  getLiteSettingsForHydrationMock,
  loadSiteMessagesMock,
  getTranslationsMock,
  nextIntlClientProviderMock,
  readServerRequestPathnameMock,
  rootClientShellMock,
} = vi.hoisted(() => ({
  getLocaleMock: vi.fn(),
  getLiteSettingsForHydrationMock: vi.fn(),
  loadSiteMessagesMock: vi.fn(),
  getTranslationsMock: vi.fn(),
  nextIntlClientProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  readServerRequestPathnameMock: vi.fn(),
  rootClientShellMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: nextIntlClientProviderMock,
}));

vi.mock('next-intl/server', () => ({
  getLocale: getLocaleMock,
  getTranslations: getTranslationsMock,
}));

vi.mock('./_providers/RootClientShell', () => ({
  RootClientShell: rootClientShellMock,
}));

vi.mock('@/shared/lib/lite-settings-ssr', () => ({
  getLiteSettingsForHydration: getLiteSettingsForHydrationMock,
}));

vi.mock('@/i18n/messages', () => ({
  loadSiteMessages: loadSiteMessagesMock,
}));

vi.mock('@/shared/lib/request/server-request-context', () => ({
  readServerRequestPathname: readServerRequestPathnameMock,
}));

describe('RootLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLocaleMock.mockResolvedValue('en');
    getTranslationsMock.mockResolvedValue((key: string) => key);
    getLiteSettingsForHydrationMock.mockResolvedValue([
      { key: 'observability.infoEnabled', value: 'true' },
    ]);
    loadSiteMessagesMock.mockResolvedValue({
      Common: {
        skipToMainContent: 'Skip to main content',
      },
    });
    readServerRequestPathnameMock.mockReturnValue(null);
  });

  it('injects lite settings for non-Kangur routes', async () => {
    const { default: RootLayout } = await import('@/app/layout');

    const layout = await RootLayout({
      children: <div>content</div>,
    });
    const bodyChildren = readRootLayoutBodyChildren(layout);
    const liteSettingsScript = bodyChildren.find(
      (child) => isValidElement(child) && child.type === 'script'
    ) as ReactElement<{ dangerouslySetInnerHTML?: { __html?: string } }> | undefined;
    const intlProvider = bodyChildren.find(
      (child) => isValidElement(child) && child.type === nextIntlClientProviderMock
    ) as ReactElement<{ locale?: string; messages?: unknown }> | undefined;

    expect(getLiteSettingsForHydrationMock).toHaveBeenCalledTimes(1);
    expect(loadSiteMessagesMock).toHaveBeenCalledWith('en');
    expect(intlProvider?.props.locale).toBe('en');
    expect(intlProvider?.props.messages).toEqual(
      expect.objectContaining({
        Common: expect.objectContaining({
          skipToMainContent: 'Skip to main content',
        }),
      })
    );
    expect(liteSettingsScript?.props.dangerouslySetInnerHTML?.__html).toContain(
      '__LITE_SETTINGS__'
    );
  });

  it('skips lite settings hydration for explicit Kangur alias routes', async () => {
    readServerRequestPathnameMock.mockReturnValue('/en/kangur');

    const { default: RootLayout } = await import('@/app/layout');

    const layout = await RootLayout({
      children: <div>content</div>,
    });
    const bodyChildren = readRootLayoutBodyChildren(layout);

    expect(getLiteSettingsForHydrationMock).not.toHaveBeenCalled();
    expect(
      bodyChildren.some((child) => isValidElement(child) && child.type === 'script')
    ).toBe(false);
  });
});

const readRootLayoutBodyChildren = (layout: React.JSX.Element): ReactNode[] => {
  const htmlElement = layout as ReactElement<{ children?: ReactNode }>;
  const bodyElement = htmlElement.props.children as ReactElement<{ children?: ReactNode }>;
  return Children.toArray(bodyElement.props.children);
};
