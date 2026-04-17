// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultPlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';

const {
  clipboardWriteTextMock,
  useIntegrationsMock,
  useProgrammableIntegrationConnectionsMock,
  useCleanupAllPlaywrightBrowserPersistenceMock,
  useCleanupPlaywrightBrowserPersistenceMock,
  usePlaywrightPersonasMock,
  usePlaywrightActionsMock,
  usePromotePlaywrightBrowserOwnershipMock,
  useTestPlaywrightProgrammableConnectionMock,
  useUpsertProgrammableConnectionMock,
  toastMock,
} = vi.hoisted(() => ({
  clipboardWriteTextMock: vi.fn<() => Promise<void>>(),
  useIntegrationsMock: vi.fn(),
  useProgrammableIntegrationConnectionsMock: vi.fn(),
  useCleanupAllPlaywrightBrowserPersistenceMock: vi.fn(),
  useCleanupPlaywrightBrowserPersistenceMock: vi.fn(),
  usePlaywrightPersonasMock: vi.fn(),
  usePlaywrightActionsMock: vi.fn(),
  usePromotePlaywrightBrowserOwnershipMock: vi.fn(),
  useTestPlaywrightProgrammableConnectionMock: vi.fn(),
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

vi.mock('@/features/playwright/hooks/usePlaywrightProgrammableIntegration', () => ({
  usePlaywrightProgrammableIntegration: () => {
    const integrationsQuery = useIntegrationsMock();

    return {
      integrationQuery: integrationsQuery,
      programmableIntegration:
        integrationsQuery.data?.find(
          (integration: { slug?: string }) => integration.slug === 'playwright-programmable'
        ) ?? null,
    };
  },
  usePlaywrightProgrammableConnections: (...args: unknown[]) =>
    useProgrammableIntegrationConnectionsMock(...args),
  useUpsertPlaywrightProgrammableConnection: () => useUpsertProgrammableConnectionMock(),
}));

vi.mock('@/features/playwright/hooks/usePlaywrightProgrammableAdminMutations', () => ({
  usePromotePlaywrightBrowserOwnership: () => usePromotePlaywrightBrowserOwnershipMock(),
  useCleanupPlaywrightBrowserPersistence: () =>
    useCleanupPlaywrightBrowserPersistenceMock(),
  useCleanupAllPlaywrightBrowserPersistence: () =>
    useCleanupAllPlaywrightBrowserPersistenceMock(),
  useTestPlaywrightProgrammableConnection: () =>
    useTestPlaywrightProgrammableConnectionMock(),
}));

vi.mock('@/features/playwright/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: () => usePlaywrightPersonasMock(),
}));

vi.mock('@/shared/hooks/usePlaywrightStepSequencer', () => ({
  usePlaywrightActions: () => usePlaywrightActionsMock(),
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
      <h2>{title}</h2>
      <p>{description}</p>
      {actions}
      {children}
    </section>
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

import { AdminPlaywrightProgrammableIntegrationPageRuntime } from './AdminPlaywrightProgrammableIntegrationPageRuntime';

const PLAYWRIGHT_LISTING_SCRIPT = 'export default async function runListing() {}';
const PLAYWRIGHT_IMPORT_SCRIPT = 'export default async function runImport() {}';
const PLAYWRIGHT_IMPORT_BASE_URL = 'https://example.test/import';
const DEFAULT_IMPORT_FLOW_JSON = '{"name":"Draft import","blocks":[{"kind":"create_draft"}]}';

const createProgrammableLegacyBrowserMigration = () => ({
  hasLegacyBrowserBehavior: false,
  legacySummary: [],
  requiresManualProxyPasswordInput: false,
  canCleanupPersistedLegacyBrowserFields: false,
  listingDraftActionId: 'listing-draft',
  listingDraftActionName: 'Listing Draft',
  importDraftActionId: 'import-draft',
  importDraftActionName: 'Import Draft',
});

const buildProgrammableImportConnection = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 'connection-programmable-1',
  integrationId: 'integration-playwright-1',
  name: 'Programmable Import',
  playwrightListingActionId: 'listing-draft',
  playwrightImportActionId: 'import-draft',
  playwrightLegacyBrowserMigration: createProgrammableLegacyBrowserMigration(),
  playwrightListingScript: PLAYWRIGHT_LISTING_SCRIPT,
  playwrightImportScript: PLAYWRIGHT_IMPORT_SCRIPT,
  playwrightImportBaseUrl: PLAYWRIGHT_IMPORT_BASE_URL,
  playwrightImportCaptureRoutesJson: null,
  playwrightImportAutomationFlowJson: DEFAULT_IMPORT_FLOW_JSON,
  playwrightFieldMapperJson: null,
  playwrightDraftMapperJson: null,
  createdAt: '2026-04-17T00:00:00.000Z',
  updatedAt: '2026-04-17T00:00:00.000Z',
  ...overrides,
});

const buildImportRunResponse = ({
  input = {},
  result = {},
  ok = true,
}: {
  input?: Record<string, unknown>;
  ok?: boolean;
  result?: Record<string, unknown>;
}): Record<string, unknown> => ({
  ok,
  scriptType: 'import',
  input: {
    sourceUrl: PLAYWRIGHT_IMPORT_BASE_URL,
    ...input,
  },
  result: {
    rawResult: { ok: true },
    ...result,
  },
});

const buildAutomationFlowResult = ({
  rawProducts = [],
  overrides = {},
}: {
  rawProducts?: Record<string, unknown>[];
  overrides?: Record<string, unknown>;
}): Record<string, unknown> => {
  const nextVars =
    overrides['vars'] !== null &&
    typeof overrides['vars'] === 'object' &&
    !Array.isArray(overrides['vars'])
      ? (overrides['vars'] as Record<string, unknown>)
      : {};
  const nextResults =
    overrides['results'] !== null &&
    typeof overrides['results'] === 'object' &&
    !Array.isArray(overrides['results'])
      ? (overrides['results'] as Record<string, unknown>)
      : {};

  return {
    executionMode: 'commit',
    flow: { name: 'Draft import', blocks: [] },
    writeOutcomes: [],
    draftPayloads: [],
    drafts: [],
    productPayloads: [],
    products: [],
    ...overrides,
    results: nextResults,
    vars: {
      rawProducts,
      ...nextVars,
    },
  };
};

const buildAutomationFlowImportRunResponse = ({
  automationFlow = {},
  input = {},
  mappedProducts = [],
  rawProducts = [],
  result = {},
}: {
  automationFlow?: Record<string, unknown>;
  input?: Record<string, unknown>;
  mappedProducts?: Record<string, unknown>[];
  rawProducts?: Record<string, unknown>[];
  result?: Record<string, unknown>;
}): Record<string, unknown> =>
  buildImportRunResponse({
    input,
    result: {
      rawProducts,
      mappedProducts,
      automationFlow: buildAutomationFlowResult({
        rawProducts,
        overrides: automationFlow,
      }),
      ...result,
    },
  });

const mockProgrammableImportRuntime = ({
  connection,
  testMutateAsync,
  upsertMutateAsync,
}: {
  connection: Record<string, unknown>;
  testMutateAsync: ReturnType<typeof vi.fn>;
  upsertMutateAsync: ReturnType<typeof vi.fn>;
}): void => {
  useProgrammableIntegrationConnectionsMock.mockReturnValue({
    data: [connection],
    isLoading: false,
  });
  useUpsertProgrammableConnectionMock.mockReturnValue({
    mutateAsync: upsertMutateAsync,
    isPending: false,
  });
  useTestPlaywrightProgrammableConnectionMock.mockReturnValue({
    mutateAsync: testMutateAsync,
    isPending: false,
  });
};

describe('AdminPlaywrightProgrammableIntegrationPageRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clipboardWriteTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteTextMock },
    });
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
    usePromotePlaywrightBrowserOwnershipMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useCleanupPlaywrightBrowserPersistenceMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useCleanupAllPlaywrightBrowserPersistenceMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useTestPlaywrightProgrammableConnectionMock.mockReturnValue({
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

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    expect(screen.queryByText('Connection Persona')).not.toBeInTheDocument();
    expect(screen.queryByText('Programmable Connection Overrides')).not.toBeInTheDocument();
    expect(screen.getByText('Browser behavior owned by selected actions')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Programmable Listing Session' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/playwright/step-sequencer?actionId=runtime_action__playwright_programmable_listing'
        )
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: 'Programmable Import Session' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/playwright/step-sequencer?actionId=runtime_action__playwright_programmable_import'
        )
    ).toBe(true);
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

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

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

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

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

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

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

  it('shows Run Flow for import connections with automation flow JSON and executes commit mode', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-flow-1',
    });
    const rawProducts = [
      { title: 'Product 1' },
      { title: 'Product 2' },
      { title: 'Product 3' },
      { title: 'Product 4' },
    ];
    const mappedProducts = [
      { name: 'Product 1' },
      { name: 'Product 2' },
      { name: 'Product 3' },
      { name: 'Product 4' },
    ];
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        input: {
          captures: [
            { url: 'https://example.test/p/1' },
            { url: 'https://example.test/p/2' },
            { url: 'https://example.test/p/3' },
            { url: 'https://example.test/p/4' },
          ],
        },
        rawProducts,
        mappedProducts,
        automationFlow: {
          writeOutcomes: [
            {
              kind: 'draft',
              status: 'created',
              index: 0,
              payload: { sku: 'SKU-1' },
              record: { id: 'draft-1' },
            },
            {
              kind: 'draft',
              status: 'created',
              index: 1,
              payload: { sku: 'SKU-2' },
              record: { id: 'draft-2' },
            },
            {
              kind: 'draft',
              status: 'created',
              index: 2,
              payload: { sku: 'SKU-3' },
              record: { id: 'draft-3' },
            },
            {
              kind: 'draft',
              status: 'created',
              index: 3,
              payload: { sku: 'SKU-4' },
              record: { id: 'draft-4' },
            },
            {
              kind: 'product',
              status: 'created',
              index: 0,
              payload: { sku: 'SKU-1' },
              record: { id: 'product-1' },
            },
            {
              kind: 'product',
              status: 'created',
              index: 1,
              payload: { sku: 'SKU-2' },
              record: { id: 'product-2' },
            },
            {
              kind: 'product',
              status: 'created',
              index: 2,
              payload: { sku: 'SKU-3' },
              record: { id: 'product-3' },
            },
            {
              kind: 'product',
              status: 'failed',
              index: 3,
              payload: { sku: 'SKU-4' },
              record: null,
              errorMessage: 'Product validation failed',
            },
          ],
          draftPayloads: [
            { sku: 'SKU-1' },
            { sku: 'SKU-2' },
            { sku: 'SKU-3' },
            { sku: 'SKU-4' },
          ],
          drafts: [
            { id: 'draft-1' },
            { id: 'draft-2' },
            { id: 'draft-3' },
            { id: 'draft-4' },
          ],
          productPayloads: [
            { sku: 'SKU-1' },
            { sku: 'SKU-2' },
            { sku: 'SKU-3' },
            { sku: 'SKU-4' },
          ],
          products: [
            { id: 'product-1' },
            { id: 'product-2' },
            { id: 'product-3' },
          ],
          results: {
            mappedDrafts: [
              { sku: 'SKU-1', name_en: 'Product 1' },
              { sku: 'SKU-2', name_en: 'Product 2' },
              { sku: 'SKU-3', name_en: 'Product 3' },
              { sku: 'SKU-4', name_en: 'Product 4' },
            ],
            draftWrites: [
              { id: 'draft-1' },
              { id: 'draft-2' },
              { id: 'draft-3' },
              {
                kind: 'write_error',
                operation: 'create_draft',
                status: 'failed',
                errorMessage: 'Catalog validation failed',
              },
            ],
            drafts: [{ id: 'draft-1' }, { id: 'draft-2' }],
            products: [{ id: 'product-1' }, { id: 'product-2' }],
          },
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-flow-1',
        name: 'Programmable Flow',
        playwrightImportAutomationFlowJson: DEFAULT_IMPORT_FLOW_JSON,
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(await screen.findByRole('button', { name: 'Run Flow' }));

    await waitFor(() => {
      expect(upsertMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-flow-1',
        payload: expect.objectContaining({
          name: 'Programmable Flow',
          playwrightImportAutomationFlowJson:
            '{"name":"Draft import","blocks":[{"kind":"create_draft"}]}',
        }),
      });
    });
    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-flow-1',
        executionMode: 'commit',
        scriptType: 'import',
      });
    });
    expect(screen.getByText('Last Run Result')).toBeInTheDocument();
    expect(screen.getByText('Execution mode: commit')).toBeInTheDocument();
    expect(screen.getByText('Flow: Draft import')).toBeInTheDocument();
    expect(screen.getByText('Raw Products')).toBeInTheDocument();
    expect(screen.getByText('Mapped Products')).toBeInTheDocument();
    expect(screen.getByText('Mapped Drafts')).toBeInTheDocument();
    expect(screen.getByText('Drafts Created')).toBeInTheDocument();
    expect(screen.getByText('Draft Write Results')).toBeInTheDocument();
    expect(screen.getByText('Products Created')).toBeInTheDocument();
    expect(screen.getByText('Flow Results')).toBeInTheDocument();
    expect(screen.getByText('Draft Write Status (4)')).toBeInTheDocument();
    expect(screen.getByText('Product Write Status (4)')).toBeInTheDocument();
    expect(screen.getByText('Draft Write Result Status (4)')).toBeInTheDocument();
    const draftWriteResultStatusSection = screen
      .getByText('Draft Write Result Status (4)')
      .closest('details');
    expect(draftWriteResultStatusSection).not.toBeNull();
    expect(draftWriteResultStatusSection).toHaveAttribute('open');
    expect(
      within(draftWriteResultStatusSection as HTMLElement).getByText('3 created')
    ).toBeInTheDocument();
    expect(
      within(draftWriteResultStatusSection as HTMLElement).getByText('1 failed')
    ).toBeInTheDocument();
    expect(
      within(draftWriteResultStatusSection as HTMLElement).getByText('Catalog validation failed')
    ).toBeInTheDocument();
    const productWriteStatusSection = screen
      .getByText('Product Write Status (4)')
      .closest('details');
    expect(productWriteStatusSection).not.toBeNull();
    expect(productWriteStatusSection).toHaveAttribute('open');
    const productWriteStatusQueries = within(productWriteStatusSection as HTMLElement);
    expect(productWriteStatusQueries.getByText('3 created')).toBeInTheDocument();
    expect(productWriteStatusQueries.getByText('1 failed')).toBeInTheDocument();
    expect(productWriteStatusQueries.getByText('Product validation failed')).toBeInTheDocument();
    expect(productWriteStatusQueries.getByRole('button', { name: 'all (4)' })).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'created (3)' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'failed (1)' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'input order' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'failures first' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'Copy filtered payloads JSON (4)' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'Copy filtered outcomes JSON (4)' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'Copy filtered outcomes CSV (4)' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'Download filtered outcomes JSON (4)' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'Download filtered outcomes CSV (4)' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'Copy failed payloads JSON (1)' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'Copy failed outcomes JSON (1)' })
    ).toBeInTheDocument();
    expect(
      productWriteStatusQueries.getByRole('button', { name: 'Copy failed outcomes CSV (1)' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('created').length).toBeGreaterThan(0);
    expect(screen.getAllByText('failed').length).toBeGreaterThan(0);
    expect(screen.queryByText('no-write')).not.toBeInTheDocument();
    expect(
      screen.getAllByText('Status comes from explicit server write outcomes.').length
    ).toBeGreaterThan(0);
    expect(screen.getByText('Input Preview')).toBeInTheDocument();
    expect(screen.getByText('Raw Result Preview')).toBeInTheDocument();
    expect(screen.getByText('Raw Products Preview (4)')).toBeInTheDocument();
    expect(screen.getByText('Mapped Products Preview (4)')).toBeInTheDocument();
    expect(screen.getByText('Mapped Drafts Preview (4)')).toBeInTheDocument();
    expect(screen.getByText('Draft Payloads Preview (4)')).toBeInTheDocument();
    expect(screen.getByText('Drafts Preview (4)')).toBeInTheDocument();
    expect(screen.queryByText('Draft Write Results Preview (4)')).not.toBeInTheDocument();
    expect(screen.getByText('Product Payloads Preview (4)')).toBeInTheDocument();
    expect(screen.getByText('Products Preview (3)')).toBeInTheDocument();
    expect(screen.getByText('Flow Result Preview: drafts (2)')).toBeInTheDocument();
    expect(screen.getByText('Flow Result Preview: products (2)')).toBeInTheDocument();
    expect(screen.queryByText('Flow Result Preview: mappedDrafts (4)')).not.toBeInTheDocument();
    expect(screen.queryByText('Flow Result Preview: draftWrites (4)')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Show all 4 items' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Product 1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SKU-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SKU-4/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/draft-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/product-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/draft-4/).length).toBeGreaterThan(0);
    expect(productWriteStatusQueries.getByText('Item 4')).toBeInTheDocument();
    const failedProductRow = productWriteStatusQueries
      .getByText('Item 4')
      .closest('div.rounded-lg');
    expect(failedProductRow).not.toBeNull();
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:write-status');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    fireEvent.click(
      productWriteStatusQueries.getByRole('button', { name: 'Download filtered outcomes CSV (4)' })
    );
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const downloadedBlob = createObjectURLSpy.mock.calls[0]?.[0];
    expect(downloadedBlob).toBeInstanceOf(Blob);
    await expect(downloadedBlob?.text()).resolves.toBe(
      'itemNumber,index,status,errorMessage,payloadSummary,createdSummary\n"4","3","failed","Product validation failed","sku=SKU-4","No created record"\n"1","0","created","","sku=SKU-1","id=product-1"\n"2","1","created","","sku=SKU-2","id=product-2"\n"3","2","created","","sku=SKU-3","id=product-3"'
    );
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:write-status');
    expect(toastMock).toHaveBeenCalledWith('Filtered outcomes CSV for Product Write Status download started', {
      variant: 'success',
    });
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    anchorClickSpy.mockRestore();
    toastMock.mockClear();
    fireEvent.click(
      productWriteStatusQueries.getByRole('button', { name: 'Copy filtered outcomes CSV (4)' })
    );
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        'itemNumber,index,status,errorMessage,payloadSummary,createdSummary\n"4","3","failed","Product validation failed","sku=SKU-4","No created record"\n"1","0","created","","sku=SKU-1","id=product-1"\n"2","1","created","","sku=SKU-2","id=product-2"\n"3","2","created","","sku=SKU-3","id=product-3"'
      );
    });
    expect(toastMock).toHaveBeenCalledWith('Filtered outcomes CSV for Product Write Status copied to clipboard', {
      variant: 'success',
    });
    clipboardWriteTextMock.mockClear();
    toastMock.mockClear();
    fireEvent.click(
      productWriteStatusQueries.getByRole('button', { name: 'Copy filtered outcomes JSON (4)' })
    );
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        '[\n  {\n    "createdRecord": null,\n    "errorMessage": "Product validation failed",\n    "index": 3,\n    "payloadRecord": {\n      "sku": "SKU-4"\n    },\n    "status": "failed"\n  },\n  {\n    "createdRecord": {\n      "id": "product-1"\n    },\n    "errorMessage": null,\n    "index": 0,\n    "payloadRecord": {\n      "sku": "SKU-1"\n    },\n    "status": "created"\n  },\n  {\n    "createdRecord": {\n      "id": "product-2"\n    },\n    "errorMessage": null,\n    "index": 1,\n    "payloadRecord": {\n      "sku": "SKU-2"\n    },\n    "status": "created"\n  },\n  {\n    "createdRecord": {\n      "id": "product-3"\n    },\n    "errorMessage": null,\n    "index": 2,\n    "payloadRecord": {\n      "sku": "SKU-3"\n    },\n    "status": "created"\n  }\n]'
      );
    });
    expect(toastMock).toHaveBeenCalledWith('Filtered outcomes for Product Write Status copied to clipboard', {
      variant: 'success',
    });
    clipboardWriteTextMock.mockClear();
    toastMock.mockClear();
    fireEvent.click(
      productWriteStatusQueries.getByRole('button', { name: 'Copy failed payloads JSON (1)' })
    );
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('[\n  {\n    "sku": "SKU-4"\n  }\n]');
    });
    expect(toastMock).toHaveBeenCalledWith('Failed payloads for Product Write Status copied to clipboard', {
      variant: 'success',
    });
    clipboardWriteTextMock.mockClear();
    toastMock.mockClear();
    fireEvent.click(
      productWriteStatusQueries.getByRole('button', { name: 'Copy failed outcomes JSON (1)' })
    );
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        '[\n  {\n    "createdRecord": null,\n    "errorMessage": "Product validation failed",\n    "index": 3,\n    "payloadRecord": {\n      "sku": "SKU-4"\n    },\n    "status": "failed"\n  }\n]'
      );
    });
    expect(toastMock).toHaveBeenCalledWith('Failed outcomes for Product Write Status copied to clipboard', {
      variant: 'success',
    });
    clipboardWriteTextMock.mockClear();
    toastMock.mockClear();
    fireEvent.click(
      productWriteStatusQueries.getByRole('button', { name: 'Copy failed outcomes CSV (1)' })
    );
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        'itemNumber,index,status,errorMessage,payloadSummary,createdSummary\n"4","3","failed","Product validation failed","sku=SKU-4","No created record"'
      );
    });
    expect(toastMock).toHaveBeenCalledWith('Failed outcomes CSV for Product Write Status copied to clipboard', {
      variant: 'success',
    });
    clipboardWriteTextMock.mockClear();
    toastMock.mockClear();
    fireEvent.click(within(failedProductRow as HTMLElement).getByRole('button', { name: 'Copy payload JSON' }));
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('{\n  "sku": "SKU-4"\n}');
    });
    expect(toastMock).toHaveBeenCalledWith('Payload for item 4 copied to clipboard', {
      variant: 'success',
    });
    expect(screen.getByText('drafts')).toBeInTheDocument();
    expect(screen.getByText('products')).toBeInTheDocument();
  });

  it('auto-expands draft write status when commit-mode draft writes fail', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-draft-failure-1',
    });
    const rawProducts = [{ title: 'Draft Failure Product' }];
    const mappedProducts = [{ name: 'Draft Failure Product' }];
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts,
        mappedProducts,
        automationFlow: {
          writeOutcomes: [
            {
              kind: 'draft',
              status: 'failed',
              index: 0,
              payload: { sku: 'SKU-FAIL-1' },
              record: null,
              errorMessage: 'Draft validation failed',
            },
          ],
          draftPayloads: [{ sku: 'SKU-FAIL-1' }],
          drafts: [],
          productPayloads: [],
          products: [],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-draft-failure-1',
        name: 'Programmable Draft Failure',
        playwrightImportAutomationFlowJson: DEFAULT_IMPORT_FLOW_JSON,
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(await screen.findByRole('button', { name: 'Run Flow' }));

    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-draft-failure-1',
        executionMode: 'commit',
        scriptType: 'import',
      });
    });

    const draftWriteStatusSection = screen
      .getByText('Draft Write Status (1)')
      .closest('details');
    expect(draftWriteStatusSection).not.toBeNull();
    expect(draftWriteStatusSection).toHaveAttribute('open');
    expect(within(draftWriteStatusSection as HTMLElement).getByText('1 failed')).toBeInTheDocument();
    expect(
      within(draftWriteStatusSection as HTMLElement).queryByText('1 created')
    ).not.toBeInTheDocument();
    expect(
      within(draftWriteStatusSection as HTMLElement).getByText('Draft validation failed')
    ).toBeInTheDocument();
  });

  it('shows a dry-run badge when draft writes are inferred from payloads in dry-run mode', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-draft-dry-run-1',
    });
    const rawProducts = [{ title: 'Dry Run Product 1' }, { title: 'Dry Run Product 2' }];
    const mappedProducts = [{ name: 'Dry Run Product 1' }, { name: 'Dry Run Product 2' }];
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts,
        mappedProducts,
        automationFlow: {
          executionMode: 'dry_run',
          flow: { name: 'Draft preview', blocks: [] },
          draftPayloads: [{ sku: 'SKU-DRY-1' }, { sku: 'SKU-DRY-2' }],
          drafts: [],
          productPayloads: [],
          products: [],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-draft-dry-run-1',
        name: 'Programmable Draft Dry Run',
        playwrightImportAutomationFlowJson: '{"name":"Draft preview","blocks":[{"kind":"map_draft"}]}',
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(await screen.findByRole('button', { name: 'Run Flow' }));

    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-draft-dry-run-1',
        executionMode: 'commit',
        scriptType: 'import',
      });
    });

    const draftWriteStatusSection = screen
      .getByText('Draft Write Status (2)')
      .closest('details');
    expect(draftWriteStatusSection).not.toBeNull();
    expect(within(draftWriteStatusSection as HTMLElement).getByText('2 dry-run')).toBeInTheDocument();
    expect(
      within(draftWriteStatusSection as HTMLElement).queryByText(/failed$/i)
    ).not.toBeInTheDocument();
  });

  it('shows a no-write badge when payloads exist without created drafts in commit mode', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-draft-no-write-1',
    });
    const rawProducts = [{ title: 'No Write Product' }];
    const mappedProducts = [{ name: 'No Write Product' }];
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts,
        mappedProducts,
        automationFlow: {
          flow: { name: 'Draft partial', blocks: [] },
          draftPayloads: [{ sku: 'SKU-NOWRITE-1' }],
          drafts: [],
          productPayloads: [],
          products: [],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-draft-no-write-1',
        name: 'Programmable Draft No Write',
        playwrightImportAutomationFlowJson: '{"name":"Draft partial","blocks":[{"kind":"create_draft"}]}',
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(await screen.findByRole('button', { name: 'Run Flow' }));

    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-draft-no-write-1',
        executionMode: 'commit',
        scriptType: 'import',
      });
    });

    const draftWriteStatusSection = screen
      .getByText('Draft Write Status (1)')
      .closest('details');
    expect(draftWriteStatusSection).not.toBeNull();
    expect(draftWriteStatusSection).not.toHaveAttribute('open');
    expect(
      within(draftWriteStatusSection as HTMLElement).getByText('1 no-write')
    ).toBeInTheDocument();
    expect(
      within(draftWriteStatusSection as HTMLElement).queryByText(/failed$/i)
    ).not.toBeInTheDocument();
  });

  it('builds a draft preview from one test scrape using saved draft mapper rules', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-draft-mapper-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildImportRunResponse({
        result: {
        rawProducts: [
          {
            title: 'Mapped draft title',
            price: '19,50',
          },
        ],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-draft-mapper-1',
        name: 'Programmable Draft Mapper',
        playwrightImportAutomationFlowJson: null,
        playwrightDraftMapperJson: JSON.stringify([
          {
            enabled: true,
            targetPath: 'name_en',
            mode: 'scraped',
            sourcePath: 'title',
            staticValue: '',
            transform: 'trim',
            required: true,
          },
          {
            enabled: true,
            targetPath: 'catalogIds',
            mode: 'static',
            sourcePath: '',
            staticValue: '["catalog-a"]',
            transform: 'string_array',
            required: true,
          },
        ]),
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    expect(
      screen.getByText('Run Test Import to capture sample scrape data for mapping.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Test Import' }));

    await waitFor(() => {
      expect(upsertMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-draft-mapper-1',
        payload: expect.objectContaining({
          name: 'Programmable Draft Mapper',
          playwrightDraftMapperJson: JSON.stringify([
            {
              enabled: true,
              targetPath: 'name_en',
              mode: 'scraped',
              sourcePath: 'title',
              staticValue: '',
              transform: 'trim',
              required: true,
            },
            {
              enabled: true,
              targetPath: 'catalogIds',
              mode: 'static',
              sourcePath: '',
              staticValue: '["catalog-a"]',
              transform: 'string_array',
              required: true,
            },
          ]),
        }),
      });
    });

    expect(await screen.findByLabelText('Draft mapper sample selector')).toBeInTheDocument();
    expect(screen.getByText('Computed draft payload from the selected sample and current rules.')).toBeInTheDocument();
    expect(screen.getAllByText('Mapped draft title').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/catalog-a/).length).toBeGreaterThan(0);
    expect(screen.getByText('Valid')).toBeInTheDocument();
    const draftMapperPreviewTemplateButton = screen
      .getByText('Use Draft Mapper Preview Template')
      .closest('button');
    expect(draftMapperPreviewTemplateButton).not.toBeNull();
    fireEvent.click(draftMapperPreviewTemplateButton as HTMLButtonElement);
    expect(
      (screen.getByLabelText('Import automation flow editor') as HTMLTextAreaElement).value
    ).toContain('"resultKey": "mappedDrafts"');
    expect(
      (screen.getByLabelText('Import automation flow editor') as HTMLTextAreaElement).value
    ).not.toContain('"kind": "create_draft"');
    const resilientDraftMapperTemplateButton = screen
      .getByText('Use Resilient Draft Mapper Flow Template')
      .closest('button');
    expect(resilientDraftMapperTemplateButton).not.toBeNull();
    fireEvent.click(resilientDraftMapperTemplateButton as HTMLButtonElement);
    expect(
      (screen.getByLabelText('Import automation flow editor') as HTMLTextAreaElement).value
    ).toContain('"resultKey": "draftWrites"');
    expect(
      (screen.getByLabelText('Import automation flow editor') as HTMLTextAreaElement).value
    ).toContain('"onError": "continue"');
    const draftMapperTemplateButton = screen
      .getByText('Use Draft Mapper Flow Template')
      .closest('button');
    expect(draftMapperTemplateButton).not.toBeNull();
    fireEvent.click(draftMapperTemplateButton as HTMLButtonElement);
    expect(
      (screen.getByLabelText('Import automation flow editor') as HTMLTextAreaElement).value
    ).toContain('"kind": "map_draft"');
    expect(screen.getByRole('button', { name: 'Run Flow' })).toBeInTheDocument();
  });
});
