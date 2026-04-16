/**
 * @vitest-environment jsdom
 */
import { Children, isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

const {
  getLiteSettingsForHydrationMock,
  loadSiteMessagesMock,
  getTranslationsMock,
  appIntlProviderMock,
  rootClientShellMock,
} = vi.hoisted(() => ({
  getLiteSettingsForHydrationMock: vi.fn(),
  loadSiteMessagesMock: vi.fn(),
  getTranslationsMock: vi.fn(),
  appIntlProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  rootClientShellMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
}));

vi.mock('@/shared/providers/AppIntlProvider', () => ({
  AppIntlProvider: appIntlProviderMock,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: getTranslationsMock,
}));

vi.mock('@/app/_providers/RootClientShell', () => ({
  RootClientShell: rootClientShellMock,
}));

vi.mock('@/shared/lib/lite-settings-ssr', () => ({
  getLiteSettingsForHydration: getLiteSettingsForHydrationMock,
}));

vi.mock('@/i18n/messages', () => ({
  loadSiteMessages: loadSiteMessagesMock,
}));

describe('RootLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTranslationsMock.mockResolvedValue((key: string) => key);
    getLiteSettingsForHydrationMock.mockResolvedValue([
      { key: 'observability.infoEnabled', value: 'true' },
    ]);
    loadSiteMessagesMock.mockResolvedValue({
      Common: {
        skipToMainContent: 'Skip to main content',
      },
    });
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
      (child) => isValidElement(child) && child.type === appIntlProviderMock
    ) as ReactElement<{ locale?: string; messages?: unknown }> | undefined;

    expect(getLiteSettingsForHydrationMock).toHaveBeenCalledTimes(1);
    expect(loadSiteMessagesMock).toHaveBeenCalledWith('pl');
    expect(intlProvider?.props.locale).toBe('pl');
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

  it('still injects lite settings for explicit Kangur alias routes', async () => {

    const { default: RootLayout } = await import('@/app/layout');

    const layout = await RootLayout({
      children: <div>content</div>,
    });
    const bodyChildren = readRootLayoutBodyChildren(layout);
    const liteSettingsScript = bodyChildren.find(
      (child) => isValidElement(child) && child.type === 'script'
    ) as ReactElement<{ dangerouslySetInnerHTML?: { __html?: string } }> | undefined;

    expect(getLiteSettingsForHydrationMock).toHaveBeenCalledTimes(1);
    expect(liteSettingsScript?.props.dangerouslySetInnerHTML?.__html).toContain(
      '__LITE_SETTINGS__'
    );
  });
});

const readRootLayoutBodyChildren = (layout: React.JSX.Element): ReactNode[] => {
  const htmlElement = layout as ReactElement<{ children?: ReactNode }>;
  const bodyElement = htmlElement.props.children as ReactElement<{ children?: ReactNode }>;
  return Children.toArray(bodyElement.props.children);
};
