/**
 * @vitest-environment jsdom
 */
import { Children, isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

const {
  appIntlProviderMock,
  getLiteSettingsForHydrationMock,
  loadSiteMessagesMock,
  rootClientShellMock,
} = vi.hoisted(() => ({
  appIntlProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  getLiteSettingsForHydrationMock: vi.fn(),
  loadSiteMessagesMock: vi.fn(),
  rootClientShellMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
}));

vi.mock('@/shared/providers/AppIntlProvider', () => ({
  AppIntlProvider: appIntlProviderMock,
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

describe('StudiQ RootLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLiteSettingsForHydrationMock.mockResolvedValue([
      { key: 'kangur_theme_daily', value: '{"themePreset":"aurora"}' },
    ]);
    loadSiteMessagesMock.mockResolvedValue({
      Common: {
        skipToMainContent: 'Skip to main content',
      },
    });
  });

  it('injects lite settings hydration and shared root providers', async () => {
    const { default: RootLayout } = await import('./layout');

    const layout = await RootLayout({
      children: <div>content</div>,
    });
    const bodyChildren = readRootLayoutBodyChildren(layout);
    const liteSettingsScript = bodyChildren.find(
      (child) => isValidElement(child) && child.type === 'script'
    ) as ReactElement<{ dangerouslySetInnerHTML?: { __html?: string } }> | undefined;
    const intlProvider = findElementByType(bodyChildren, appIntlProviderMock) as ReactElement<{
      locale?: string;
      messages?: unknown;
    }> | undefined;
    const rootClientShell = findElementByType(bodyChildren, rootClientShellMock);

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
    expect(rootClientShell).toBeDefined();
  });
});

const readRootLayoutBodyChildren = (layout: React.JSX.Element): ReactNode[] => {
  const htmlElement = layout as ReactElement<{ children?: ReactNode }>;
  const bodyElement = htmlElement.props.children as ReactElement<{ children?: ReactNode }>;
  return Children.toArray(bodyElement.props.children);
};

const findElementByType = (
  nodes: ReactNode | ReactNode[],
  type: unknown
): ReactElement | undefined => {
  for (const node of Children.toArray(nodes)) {
    if (!isValidElement(node)) {
      continue;
    }

    if (node.type === type) {
      return node;
    }

    const nested = findElementByType(node.props.children, type);
    if (nested) {
      return nested;
    }
  }

  return undefined;
};
