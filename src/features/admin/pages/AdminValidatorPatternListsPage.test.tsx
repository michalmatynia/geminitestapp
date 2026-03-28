// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  settingsMapMock: {
    data: new Map<string, string>(),
    isPending: false,
  },
  mutateAsyncMock: vi.fn(),
  confirmMock: vi.fn(),
  toastMock: vi.fn(),
}));

type ListPanelMockProps = {
  header?: React.ReactNode;
  filters?: React.ReactNode;
  children?: React.ReactNode;
};

function MockListPanel(props: ListPanelMockProps): React.JSX.Element {
  const { header, filters, children } = props;
  return (
    <div data-testid='list-panel'>
      {header}
      {filters}
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

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => mocks.settingsMapMock,
  useUpdateSetting: () => ({
    mutateAsync: mocks.mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mocks.confirmMock,
    ConfirmationModal: () => <div data-testid='confirmation-modal' />,
  }),
}));

vi.mock('@/features/admin/components/AdminValidatorSettings', () => ({
  ValidatorDocsTooltipsPanel: () => (
    <div data-testid='validator-docs-tooltips-panel'>validator-docs-tooltips-panel</div>
  ),
  ValidatorDocsTooltipsProvider: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('./validator-lists/ValidatorListTree', () => ({
  ValidatorListTree: () => <div data-testid='validator-list-tree'>validator-list-tree</div>,
}));

vi.mock('@/shared/ui/templates/SettingsPanelBuilder', () => ({
  SettingsPanelBuilder: ({ open }: { open: boolean }) =>
    open ? <div data-testid='settings-panel-builder' /> : null,
}));

vi.mock('@/shared/ui', () => ({
  AdminSectionBreadcrumbs: ({
    current,
  }: {
    current: string;
  }) => <div data-testid='validator-lists-breadcrumbs'>{current}</div>,
  Badge: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  ClientOnly: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  FormSection: ({
    title,
    description,
    actions,
    children,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <section>
      {title ? <div>{title}</div> : null}
      {description ? <div>{description}</div> : null}
      {actions}
      {children}
    </section>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
    'aria-label': ariaLabel,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    'aria-label'?: string;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} aria-label={ariaLabel} />
  ),
  ListPanel: MockListPanel,
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
  SelectSimple: ({
    value,
    onValueChange,
    options,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options?: Array<{ value: string; label: string }>;
  }) => (
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  useToast: () => ({
    toast: mocks.toastMock,
  }),
}));

import { AdminValidatorPatternListsPage } from './AdminValidatorPatternListsPage';
import {
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_PATTERN_LISTS_VERSION,
} from './validator-scope';

describe('AdminValidatorPatternListsPage', () => {
  beforeEach(() => {
    mocks.usePathnameMock.mockReturnValue('/admin/validator/lists');
    mocks.useRouterMock.mockReturnValue({ push: vi.fn() });
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams());
    mocks.settingsMapMock.data = new Map<string, string>();
    mocks.settingsMapMock.isPending = false;
    mocks.mutateAsyncMock.mockResolvedValue({});
    mocks.confirmMock.mockReset();
    mocks.toastMock.mockReset();
  });

  it('renders the lists manager view by default', () => {
    render(<AdminValidatorPatternListsPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Validation Pattern Lists' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('validator-lists-breadcrumbs')).toHaveTextContent(
      'Validation Pattern Lists'
    );
    expect(screen.getByRole('tab', { name: 'Lists' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    const panel = screen.getByTestId('list-panel');
    const nodes = Array.from(panel.querySelectorAll('*'));
    const viewTabs = screen.getByRole('tablist', { name: 'Validator list manager views' });
    const addListTitle = screen.getByText('Add New List');
    expect(nodes.indexOf(viewTabs)).toBeLessThan(nodes.indexOf(addListTitle));
    expect(screen.getByText('Add New List')).toBeInTheDocument();
    expect(screen.getByTestId('validator-list-tree')).toBeInTheDocument();
    expect(screen.queryByTestId('validator-docs-tooltips-panel')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back To Validator/i })).toHaveAttribute(
      'href',
      '/admin/validator'
    );
    expect(screen.getByRole('button', { name: /Save Lists/i })).toBeDisabled();
  });

  it('renders the tooltip settings tab content when requested', () => {
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('view=tooltips'));

    render(<AdminValidatorPatternListsPage />);

    expect(screen.getByTestId('validator-lists-breadcrumbs')).toHaveTextContent(
      'Settings'
    );
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('validator-docs-tooltips-panel')).toBeInTheDocument();
    expect(screen.queryByText('Add New List')).not.toBeInTheDocument();
  });

  it('pushes the tooltip settings view into the query string', () => {
    const pushMock = vi.fn();
    mocks.useRouterMock.mockReturnValue({ push: pushMock });

    render(<AdminValidatorPatternListsPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));

    expect(pushMock).toHaveBeenCalledWith('/admin/validator/lists?view=tooltips', {
      scroll: false,
    });
  });

  it('removes the view query param when switching back to lists', () => {
    const pushMock = vi.fn();
    mocks.useRouterMock.mockReturnValue({ push: pushMock });
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('view=tooltips'));

    render(<AdminValidatorPatternListsPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Lists' }));

    expect(pushMock).toHaveBeenCalledWith('/admin/validator/lists', {
      scroll: false,
    });
  });

  it('adds a list and saves the updated validator pattern list payload', async () => {
    render(<AdminValidatorPatternListsPage />);

    fireEvent.change(screen.getByLabelText('List name'), {
      target: { value: 'Seasonal Rules' },
    });
    fireEvent.change(screen.getByLabelText('List description'), {
      target: { value: 'Custom seasonal validation list.' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'ai-paths' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Add List/i }));

    expect(mocks.toastMock).toHaveBeenCalledWith('Validation pattern list added. Save to persist.', {
      variant: 'success',
    });
    expect(screen.getByRole('button', { name: /Save Lists/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Save Lists/i }));

    await waitFor(() => expect(mocks.mutateAsyncMock).toHaveBeenCalledTimes(1));

    const payload = mocks.mutateAsyncMock.mock.calls[0]?.[0] as { key: string; value: string };
    expect(payload.key).toBe(VALIDATOR_PATTERN_LISTS_KEY);
    const parsed = JSON.parse(payload.value) as {
      version: number;
      lists: Array<{ name: string; description: string; scope: string }>;
    };
    expect(parsed.version).toBe(VALIDATOR_PATTERN_LISTS_VERSION);
    expect(
      parsed.lists.some(
        (list) =>
          list.name === 'Seasonal Rules' &&
          list.description === 'Custom seasonal validation list.' &&
          list.scope === 'ai-paths'
      )
    ).toBe(true);
  });
});
