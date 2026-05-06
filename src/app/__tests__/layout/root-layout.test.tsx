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
    const rootClientShell = findElementByType(layout, rootClientShellMock);
    expect(rootClientShell?.props.initialLiteSettings).toEqual([
      ['observability.infoEnabled', 'true'],
    ]);
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

  it('provides the app-content wrapper targeted by Kangur surface styles', async () => {
    const { default: RootLayout } = await import('@/app/layout');

    const layout = await RootLayout({
      children: <div>content</div>,
    });

    const appContent = findElementById(layout, 'app-content');

    expect(appContent).toBeDefined();
    expect(appContent?.props.className).toContain('min-h-screen');
  });
});

const readRootLayoutBodyChildren = (layout: React.JSX.Element): ReactNode[] => {
  const htmlElement = layout as ReactElement<{ children?: ReactNode }>;
  const bodyElement = Children.toArray(htmlElement.props.children).find(
    (child): child is ReactElement<{ children?: ReactNode }> =>
      isValidElement(child) && child.type === 'body'
  );
  expect(bodyElement).toBeDefined();
  return Children.toArray(bodyElement!.props.children);
};

const findElementById = (
  node: ReactNode,
  id: string
): ReactElement<{ id?: string; className?: string; children?: ReactNode }> | null => {
  if (!isValidElement<{ id?: string; className?: string; children?: ReactNode }>(node)) {
    return null;
  }

  if (node.props.id === id) {
    return node;
  }

  const children = Children.toArray(node.props.children);
  for (const child of children) {
    const match = findElementById(child, id);
    if (match) {
      return match;
    }
  }

  return null;
};

const findElementByType = (
  node: ReactNode,
  type: unknown
): ReactElement<{ initialLiteSettings?: ReadonlyArray<readonly [string, string]>; children?: ReactNode }> | null => {
  if (!isValidElement<{ initialLiteSettings?: ReadonlyArray<readonly [string, string]>; children?: ReactNode }>(node)) {
    return null;
  }

  if (node.type === type) {
    return node;
  }

  const children = Children.toArray(node.props.children);
  for (const child of children) {
    const match = findElementByType(child, type);
    if (match) {
      return match;
    }
  }

  return null;
};
