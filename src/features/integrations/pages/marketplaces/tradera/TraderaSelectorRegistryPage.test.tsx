// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';

const {
  toastMock,
  useSettingsMapMock,
  useTraderaSelectorRegistryMock,
  useSyncMutationMock,
  useSaveMutationMock,
  useDeleteMutationMock,
  useProfileMutationMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useSettingsMapMock: vi.fn(),
  useTraderaSelectorRegistryMock: vi.fn(),
  useSyncMutationMock: vi.fn(),
  useSaveMutationMock: vi.fn(),
  useDeleteMutationMock: vi.fn(),
  useProfileMutationMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/features/integrations/hooks/useTraderaSelectorRegistry', () => ({
  useTraderaSelectorRegistry: (...args: unknown[]) => useTraderaSelectorRegistryMock(...args),
  useSyncTraderaSelectorRegistryMutation: () => useSyncMutationMock(),
  useSaveTraderaSelectorRegistryEntryMutation: () => useSaveMutationMock(),
  useDeleteTraderaSelectorRegistryEntryMutation: () => useDeleteMutationMock(),
  useMutateTraderaSelectorRegistryProfileMutation: () => useProfileMutationMock(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => useSettingsMapMock(),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: vi.fn(),
    ConfirmationModal: () => null,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: vi.fn(),
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminIntegrationsPageLayout: ({
    title,
    children,
    headerActions,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
    headerActions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{headerActions}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/empty-state', () => ({
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
      <div>{action}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/search-input', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock('@/shared/ui/templates/StandardDataTablePanel', () => ({
  StandardDataTablePanel: ({
    title,
    description,
    alerts,
    filters,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    alerts?: React.ReactNode;
    filters?: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
      <div>{alerts}</div>
      <div>{filters}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    asChild,
    children,
    loading: _loading,
    loadingText: _loadingText,
    ...props
  }: {
    asChild?: boolean;
    children?: React.ReactNode;
    loading?: boolean;
    loadingText?: string;
    [key: string]: unknown;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, props);
    }
    return <button {...props}>{children}</button>;
  },
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  useToast: () => ({ toast: toastMock }),
}));

import TraderaSelectorRegistryPage from './TraderaSelectorRegistryPage';

describe('TraderaSelectorRegistryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useSettingsMapMock.mockReturnValue({
      data: new Map<string, string>([[TRADERA_SETTINGS_KEYS.selectorProfile, 'profile-market-a']]),
    });
    useTraderaSelectorRegistryMock.mockReturnValue({
      data: {
        entries: [
          {
            id: 'entry-1',
            profile: 'default',
            key: 'TITLE_SELECTORS',
            group: 'listing',
            kind: 'selectors',
            description: 'Selectors for the title field.',
            valueType: 'string_array',
            valueJson: '["input[name=\\"title\\"]"]',
            itemCount: 1,
            preview: ['input[name="title"]'],
            source: 'mongo',
            createdAt: '2026-04-16T09:00:00.000Z',
            updatedAt: '2026-04-16T09:00:00.000Z',
          },
        ],
        total: 1,
        syncedAt: '2026-04-16T09:00:00.000Z',
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useSyncMutationMock.mockReturnValue({ mutateAsync: vi.fn() });
    useSaveMutationMock.mockReturnValue({ mutateAsync: vi.fn() });
    useDeleteMutationMock.mockReturnValue({ mutateAsync: vi.fn() });
    useProfileMutationMock.mockReturnValue({ mutateAsync: vi.fn() });
  });

  it('shows the configured global selector profile in the registry header', () => {
    render(<TraderaSelectorRegistryPage />);

    expect(screen.getByText('Global profile: profile-market-a')).toBeInTheDocument();
    expect(screen.getByText('Viewing: default')).toBeInTheDocument();
  });
});
