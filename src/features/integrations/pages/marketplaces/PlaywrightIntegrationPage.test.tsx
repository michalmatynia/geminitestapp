// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultPlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';

const {
  useIntegrationsMock,
  useProgrammableIntegrationConnectionsMock,
  usePlaywrightPersonasMock,
  usePlaywrightActionsMock,
  useUpsertProgrammableConnectionMock,
  toastMock,
} = vi.hoisted(() => ({
  useIntegrationsMock: vi.fn(),
  useProgrammableIntegrationConnectionsMock: vi.fn(),
  usePlaywrightPersonasMock: vi.fn(),
  usePlaywrightActionsMock: vi.fn(),
  useUpsertProgrammableConnectionMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children?: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useIntegrations: () => useIntegrationsMock(),
  useProgrammableIntegrationConnections: (...args: unknown[]) =>
    useProgrammableIntegrationConnectionsMock(...args),
}));

vi.mock('@/features/playwright/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: () => usePlaywrightPersonasMock(),
}));

vi.mock('@/shared/hooks/usePlaywrightStepSequencer', () => ({
  usePlaywrightActions: () => usePlaywrightActionsMock(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationMutations', () => ({
  useUpsertProgrammableConnection: () => useUpsertProgrammableConnectionMock(),
}));

vi.mock('@/features/integrations/components/connections/PlaywrightManagedRuntimeActionsSection', () => ({
  PlaywrightManagedRuntimeActionsSection: () => <div>managed-runtime-actions</div>,
}));

vi.mock('@/features/integrations/components/connections/PlaywrightProgrammableSessionPreviewSection', () => ({
  PlaywrightProgrammableSessionPreviewSection: () => <div>programmable-session-preview</div>,
}));

vi.mock('@/shared/ui/playwright/PlaywrightSettingsForm', () => ({
  PlaywrightSettingsForm: ({
    title,
  }: {
    title?: React.ReactNode;
  }) => <div>{title ?? 'PlaywrightSettingsForm'}</div>,
}));

vi.mock('@/shared/ui/playwright/PlaywrightCaptureRoutesEditor', () => ({
  PlaywrightCaptureRoutesEditor: () => <div>capture-routes-editor</div>,
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminIntegrationsPageLayout: ({
    title,
    children,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  LoadingState: ({ message }: { message?: React.ReactNode }) => <div>{message}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({
    label,
    description,
    children,
  }: {
    label?: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      <span>{description}</span>
      {children}
    </label>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
    Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Button: ({
      children,
      onClick,
      asChild,
      disabled,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
      asChild?: boolean;
      disabled?: boolean;
    }) =>
      asChild ? (
        <div>{children}</div>
      ) : (
        <button type='button' onClick={onClick} disabled={disabled}>
          {children}
        </button>
      ),
    Input: ({
      value,
      onChange,
      'aria-label': ariaLabel,
    }: {
      value?: string;
      onChange?: React.ChangeEventHandler<HTMLInputElement>;
      'aria-label'?: string;
    }) => <input value={value} onChange={onChange} aria-label={ariaLabel} />,
    Textarea: ({
      value,
      onChange,
      'aria-label': ariaLabel,
    }: {
      value?: string;
      onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
      'aria-label'?: string;
    }) => <textarea value={value} onChange={onChange} aria-label={ariaLabel} />,
  };
});

import PlaywrightIntegrationPage from './PlaywrightIntegrationPage';

describe('PlaywrightIntegrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIntegrationsMock.mockReturnValue({
      data: [
        {
          id: 'integration-playwright-1',
          slug: 'playwright-programmable',
          name: 'Playwright (Programmable)',
        },
      ],
      isLoading: false,
    });
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
    });
    usePlaywrightActionsMock.mockReturnValue({
      data: [
        {
          id: 'listing-draft',
          name: 'Listing Draft',
          description: null,
          runtimeKey: null,
          blocks: [],
          stepSetIds: [],
          personaId: null,
          executionSettings: defaultPlaywrightActionExecutionSettings,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
        },
        {
          id: 'import-draft',
          name: 'Import Draft',
          description: null,
          runtimeKey: null,
          blocks: [],
          stepSetIds: [],
          personaId: null,
          executionSettings: defaultPlaywrightActionExecutionSettings,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
        },
      ],
      isPending: false,
    });
    useUpsertProgrammableConnectionMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('hides connection-scoped browser editors after the connection is migrated', () => {
    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        {
          id: 'connection-1',
          integrationId: 'integration-playwright-1',
          name: 'Programmable A',
          playwrightListingActionId: 'listing-draft',
          playwrightImportActionId: 'import-draft',
          playwrightLegacyBrowserMigration: {
            hasLegacyBrowserBehavior: false,
            legacySummary: [],
            requiresManualProxyPasswordInput: false,
            canCleanupPersistedLegacyBrowserFields: false,
            listingDraftActionId: 'listing-draft',
            listingDraftActionName: 'Listing Draft',
            importDraftActionId: 'import-draft',
            importDraftActionName: 'Import Draft',
          },
          playwrightListingScript: null,
          playwrightImportScript: null,
          playwrightImportBaseUrl: null,
          playwrightImportCaptureRoutesJson: null,
          playwrightFieldMapperJson: null,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    render(<PlaywrightIntegrationPage />);

    expect(screen.queryByText('Connection Persona')).not.toBeInTheDocument();
    expect(screen.queryByText('Programmable Connection Overrides')).not.toBeInTheDocument();
    expect(screen.getByText('Browser behavior owned by selected actions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Programmable Listing Session' })).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=runtime_action__playwright_programmable_listing'
    );
    expect(screen.getByRole('link', { name: 'Programmable Import Session' })).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=runtime_action__playwright_programmable_import'
    );
    expect(
      screen.getByText(/This connection no longer owns persona or browser overrides/i)
    ).toBeInTheDocument();
  });

  it('shows legacy browser settings as read-only migration data while overrides still exist', () => {
    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        {
          id: 'connection-2',
          integrationId: 'integration-playwright-1',
          name: 'Programmable B',
          playwrightListingActionId: 'listing-draft',
          playwrightImportActionId: 'import-draft',
          playwrightLegacyBrowserMigration: {
            hasLegacyBrowserBehavior: true,
            legacySummary: ['Persona', 'Browser preference'],
            requiresManualProxyPasswordInput: false,
            canCleanupPersistedLegacyBrowserFields: false,
            listingDraftActionId: 'programmable_connection__connection-2__listing_session',
            listingDraftActionName: 'Programmable B / Listing session',
            importDraftActionId: 'programmable_connection__connection-2__import_session',
            importDraftActionName: 'Programmable B / Import session',
          },
          playwrightListingScript: null,
          playwrightImportScript: null,
          playwrightImportBaseUrl: null,
          playwrightImportCaptureRoutesJson: null,
          playwrightFieldMapperJson: null,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    render(<PlaywrightIntegrationPage />);

    expect(screen.queryByText('Connection Persona')).not.toBeInTheDocument();
    expect(screen.queryByText('Programmable Connection Overrides')).not.toBeInTheDocument();
    expect(screen.getByText('Legacy browser settings require promotion')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Programmable B / Listing session' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/playwright/step-sequencer?actionId=programmable_connection__connection-2__listing_session'
        )
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: 'Programmable B / Import session' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/playwright/step-sequencer?actionId=programmable_connection__connection-2__import_session'
        )
    ).toBe(true);
    expect(
      screen.getByText(/This connection still has legacy browser behavior stored on the connection model/i)
    ).toBeInTheDocument();
  });

  it('shows cleanup copy when the programmable connection already points at its generated drafts', () => {
    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        {
          id: 'connection-3',
          integrationId: 'integration-playwright-1',
          name: 'Programmable C',
          playwrightListingActionId: 'programmable_connection__connection-3__listing_session',
          playwrightImportActionId: 'programmable_connection__connection-3__import_session',
          playwrightLegacyBrowserMigration: {
            hasLegacyBrowserBehavior: true,
            legacySummary: ['Persona'],
            requiresManualProxyPasswordInput: false,
            canCleanupPersistedLegacyBrowserFields: true,
            listingDraftActionId: 'programmable_connection__connection-3__listing_session',
            listingDraftActionName: 'Programmable C / Listing session',
            importDraftActionId: 'programmable_connection__connection-3__import_session',
            importDraftActionName: 'Programmable C / Import session',
          },
          playwrightListingScript: null,
          playwrightImportScript: null,
          playwrightImportBaseUrl: null,
          playwrightImportCaptureRoutesJson: null,
          playwrightFieldMapperJson: null,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    render(<PlaywrightIntegrationPage />);

    expect(screen.getByText('Stored browser fields can be cleared')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Programmable C / Listing session' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/playwright/step-sequencer?actionId=programmable_connection__connection-3__listing_session'
        )
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: 'Programmable C / Import session' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/playwright/step-sequencer?actionId=programmable_connection__connection-3__import_session'
        )
    ).toBe(true);
    expect(screen.getByText('Clear stored browser fields')).toBeInTheDocument();
  });

  it('shows a bulk cleanup action when multiple programmable connections are ready for cleanup', () => {
    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        {
          id: 'connection-3',
          integrationId: 'integration-playwright-1',
          name: 'Programmable C',
          playwrightListingActionId: 'programmable_connection__connection-3__listing_session',
          playwrightImportActionId: 'programmable_connection__connection-3__import_session',
          playwrightLegacyBrowserMigration: {
            hasLegacyBrowserBehavior: true,
            legacySummary: ['Persona'],
            requiresManualProxyPasswordInput: false,
            canCleanupPersistedLegacyBrowserFields: true,
            listingDraftActionId: 'programmable_connection__connection-3__listing_session',
            listingDraftActionName: 'Programmable C / Listing session',
            importDraftActionId: 'programmable_connection__connection-3__import_session',
            importDraftActionName: 'Programmable C / Import session',
          },
          playwrightListingScript: null,
          playwrightImportScript: null,
          playwrightImportBaseUrl: null,
          playwrightImportCaptureRoutesJson: null,
          playwrightFieldMapperJson: null,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
        },
        {
          id: 'connection-4',
          integrationId: 'integration-playwright-1',
          name: 'Programmable D',
          playwrightListingActionId: 'programmable_connection__connection-4__listing_session',
          playwrightImportActionId: 'programmable_connection__connection-4__import_session',
          playwrightLegacyBrowserMigration: {
            hasLegacyBrowserBehavior: true,
            legacySummary: ['Browser preference'],
            requiresManualProxyPasswordInput: false,
            canCleanupPersistedLegacyBrowserFields: true,
            listingDraftActionId: 'programmable_connection__connection-4__listing_session',
            listingDraftActionName: 'Programmable D / Listing session',
            importDraftActionId: 'programmable_connection__connection-4__import_session',
            importDraftActionName: 'Programmable D / Import session',
          },
          playwrightListingScript: null,
          playwrightImportScript: null,
          playwrightImportBaseUrl: null,
          playwrightImportCaptureRoutesJson: null,
          playwrightFieldMapperJson: null,
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    render(<PlaywrightIntegrationPage />);

    expect(
      screen.getByText((content) =>
        content.includes(
          'programmable connections already point at their generated Step Sequencer drafts'
        )
      )
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_content, node) =>
          node?.textContent?.includes(
            'Programmable D: Programmable D / Listing session and Programmable D / Import session'
          ) ?? false
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Programmable D / Listing session' })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=programmable_connection__connection-4__listing_session'
    );
    expect(
      screen.getByRole('link', { name: 'Programmable D / Import session' })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=programmable_connection__connection-4__import_session'
    );
    expect(screen.getByText('Clear all safe stored browser fields')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Programmable D' }));

    expect(screen.getByLabelText('Playwright connection name')).toHaveValue('Programmable D');
  });
});
