// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  settingsMapMock: {
    data: new Map<string, string>(),
    isPending: false,
  },
}));

type ListPanelMockProps = {
  header?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  alerts?: React.ReactNode;
  children?: React.ReactNode;
};

function MockListPanel(props: ListPanelMockProps): React.JSX.Element {
  const { header, filters, actions, alerts, children } = props;
  return (
    <div data-testid='list-panel'>
      {header}
      {filters}
      {actions}
      {alerts}
      {children}
    </div>
  );
}

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: mocks.usePathnameMock,
  useRouter: mocks.useRouterMock,
  useSearchParams: mocks.useSearchParamsMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: mocks.usePathnameMock,
  useRouter: mocks.useRouterMock,
  useSearchParams: mocks.useSearchParamsMock,
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => mocks.settingsMapMock,
}));

vi.mock('@/features/admin/components/AdminPromptEngineValidationPatternsPage', () => ({
  AdminPromptEngineValidationPatternsPage: () => (
    <div data-testid='prompt-engine-validation-patterns'>prompt-engine</div>
  ),
}));

vi.mock('@/features/admin/components/AdminValidatorSettings', () => ({
  ValidatorDocsTooltipsPanel: () => (
    <div data-testid='validator-docs-tooltips-panel'>validator-docs-tooltips-panel</div>
  ),
  ValidatorDocsTooltipsProvider: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
  ValidatorSettings: () => <div data-testid='validator-settings'>validator-settings</div>,
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminSectionBreadcrumbs: ({
    current,
  }: {
    current: string;
  }) => <div data-testid='validator-breadcrumbs'>{current}</div>,
  formatAdminAiEyebrow: (value: string) => value,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    asChild,
  }: {
    children?: React.ReactNode;
    asChild?: boolean;
  }) => asChild ? <>{children}</> : <button type='button'>{children}</button>,
  ClientOnly: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  ListPanel: MockListPanel,
}));

vi.mock('@/shared/ui/admin-title-breadcrumb-header', () => ({
  AdminTitleBreadcrumbHeader: ({ title, breadcrumb, actions }: { title: React.ReactNode, breadcrumb: React.ReactNode, actions?: React.ReactNode }) => (
    <div>
      {title}
      {breadcrumb}
      {actions}
    </div>
  ),
}));

import { AdminGlobalValidatorPage } from './AdminGlobalValidatorPage';
import {
  buildValidatorPatternListsPayload,
  defaultValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
} from './validator-scope';

const setPatternListsSetting = (
  mutate: (lists: ReturnType<typeof defaultValidatorPatternLists>) => void
): void => {
  const lists = defaultValidatorPatternLists();
  mutate(lists);
  mocks.settingsMapMock.data = new Map<string, string>([
    [VALIDATOR_PATTERN_LISTS_KEY, JSON.stringify(buildValidatorPatternListsPayload(lists))],
  ]);
};

describe('AdminGlobalValidatorPage', () => {
  beforeEach(() => {
    mocks.usePathnameMock.mockReturnValue('/admin/validator');
    mocks.useRouterMock.mockReturnValue({ push: vi.fn() });
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('list=products'));
    mocks.settingsMapMock.data = new Map<string, string>();
    mocks.settingsMapMock.isPending = false;
  });

  it('renders the validator header with breadcrumbs, badges, and list tabs', () => {
    render(<AdminGlobalValidatorPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Global Validator' })).toBeInTheDocument();
    expect(screen.getByTestId('validator-breadcrumbs')).toHaveTextContent('Product Patterns');
    expect(screen.getAllByText('Products').length).toBeGreaterThan(0);
    expect(screen.getByText('7 lists')).toBeInTheDocument();
    expect(screen.queryByText('Standard product field validations.')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Product Patterns/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Patterns' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    const panel = screen.getByTestId('list-panel');
    const nodes = Array.from(panel.querySelectorAll('*'));
    const viewTabs = screen.getByRole('tablist', { name: 'Global validator views' });
    const listTabs = screen.getByRole('tablist', { name: 'Validation pattern lists' });
    expect(nodes.indexOf(viewTabs)).toBeLessThan(nodes.indexOf(listTabs));
    expect(screen.getByTestId('validator-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('validator-docs-tooltips-panel')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage Lists' })).toHaveAttribute(
      'href',
      '/admin/validator/lists'
    );
  });

  it('pushes the selected validator list into the query string', () => {
    const pushMock = vi.fn();
    mocks.useRouterMock.mockReturnValue({ push: pushMock });

    render(<AdminGlobalValidatorPage />);

    fireEvent.click(screen.getByRole('tab', { name: /Image Studio Patterns/i }));

    expect(pushMock).toHaveBeenCalledWith('/admin/validator?list=image-studio', {
      scroll: false,
    });
  });

  it('renders the tooltip settings tab content when requested', () => {
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('list=products&view=tooltips'));

    render(<AdminGlobalValidatorPage />);

    expect(screen.getByTestId('validator-breadcrumbs')).toHaveTextContent('Settings');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(
      screen.queryByRole('tablist', { name: 'Validation pattern lists' })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('validator-docs-tooltips-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('validator-settings')).not.toBeInTheDocument();
  });

  it('pushes the tooltip settings view into the query string', () => {
    const pushMock = vi.fn();
    mocks.useRouterMock.mockReturnValue({ push: pushMock });

    render(<AdminGlobalValidatorPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));

    expect(pushMock).toHaveBeenCalledWith('/admin/validator?list=products&view=tooltips', {
      scroll: false,
    });
  });

  it('removes the view query param when switching back to patterns', () => {
    const pushMock = vi.fn();
    mocks.useRouterMock.mockReturnValue({ push: pushMock });
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('list=products&view=tooltips'));

    render(<AdminGlobalValidatorPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Patterns' }));

    expect(pushMock).toHaveBeenCalledWith('/admin/validator?list=products', {
      scroll: false,
    });
  });

  it('renders prompt-engine content for non-product validator scopes', () => {
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('list=image-studio'));

    render(<AdminGlobalValidatorPage />);

    expect(screen.getByRole('tab', { name: /Image Studio Patterns/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('prompt-engine-validation-patterns')).toBeInTheDocument();
    expect(screen.queryByTestId('validator-settings')).not.toBeInTheDocument();
  });

  it('shows a custom list description when it differs from the default scope description', () => {
    setPatternListsSetting((lists) => {
      lists[0] = {
        ...lists[0]!,
        description: 'Custom products validator layout note.',
      };
    });

    render(<AdminGlobalValidatorPage />);

    expect(screen.getByText('Custom products validator layout note.')).toBeInTheDocument();
  });
});
