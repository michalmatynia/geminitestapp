// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultPlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';

const {
  clipboardWriteTextMock,
  useIntegrationsMock,
  usePlaywrightActionRunMock,
  usePlaywrightActionRunsMock,
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
  usePlaywrightActionRunMock: vi.fn(),
  usePlaywrightActionRunsMock: vi.fn(),
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

vi.mock('@/features/playwright/hooks/usePlaywrightActionRuns', () => ({
  usePlaywrightActionRuns: (...args: unknown[]) => usePlaywrightActionRunsMock(...args),
  usePlaywrightActionRun: (...args: unknown[]) => usePlaywrightActionRunMock(...args),
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
  scrapeSource = {
    type: 'script',
    actionId: 'import-draft',
    runId: null,
  },
}: {
  input?: Record<string, unknown>;
  ok?: boolean;
  result?: Record<string, unknown>;
  scrapeSource?: Record<string, unknown>;
}): Record<string, unknown> => {
  const nextResult = {
    rawResult: { ok: true },
    scrapeSource,
    ...result,
  };

  if (!Array.isArray(nextResult['scrapedItems']) && Array.isArray(nextResult['rawProducts'])) {
    nextResult['scrapedItems'] = nextResult['rawProducts'];
  }

  return {
    ok,
    scriptType: 'import',
    input: {
      sourceUrl: PLAYWRIGHT_IMPORT_BASE_URL,
      ...input,
    },
    result: nextResult,
  };
};

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
    scrapeSource: {
      type: 'script',
      actionId: 'import-draft',
      runId: null,
    },
    writeOutcomes: [],
    draftPayloads: [],
    drafts: [],
    productPayloads: [],
    products: [],
    ...overrides,
    results: nextResults,
    vars: {
      scrapedItems: rawProducts,
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

const buildIndexedStringRecords = ({
  count,
  key,
  prefix,
}: {
  count: number;
  key: string;
  prefix: string;
}): Record<string, string>[] =>
  Array.from({ length: count }, (_unused, index) => ({
    [key]: `${prefix} ${index + 1}`,
  }));

const buildIndexedSkuPayloads = (count: number): Array<{ sku: string }> =>
  Array.from({ length: count }, (_unused, index) => ({
    sku: `SKU-${index + 1}`,
  }));

const buildIndexedIdRecords = (prefix: string, count: number): Array<{ id: string }> =>
  Array.from({ length: count }, (_unused, index) => ({
    id: `${prefix}-${index + 1}`,
  }));

const buildCreatedWriteOutcomes = ({
  count,
  kind,
  recordPrefix,
}: {
  count: number;
  kind: 'draft' | 'product';
  recordPrefix: string;
}): Record<string, unknown>[] =>
  Array.from({ length: count }, (_unused, index) => ({
    kind,
    status: 'created',
    index,
    payload: { sku: `SKU-${index + 1}` },
    record: { id: `${recordPrefix}-${index + 1}` },
  }));

const buildFailedWriteOutcome = ({
  errorMessage,
  index,
  kind,
  sku,
}: {
  errorMessage: string;
  index: number;
  kind: 'draft' | 'product';
  sku: string;
}): Record<string, unknown> => ({
  kind,
  status: 'failed',
  index,
  payload: { sku },
  record: null,
  errorMessage,
});

const buildMappedDrafts = (count: number): Array<{ sku: string; name_en: string }> =>
  Array.from({ length: count }, (_unused, index) => ({
    sku: `SKU-${index + 1}`,
    name_en: `Product ${index + 1}`,
  }));

const buildDraftWriteErrorResult = (errorMessage: string): Record<string, string> => ({
  kind: 'write_error',
  operation: 'create_draft',
  status: 'failed',
  errorMessage,
});

const PRODUCT_WRITE_STATUS_FAILED_OUTCOME_EXPORT = {
  createdRecord: null,
  errorMessage: 'Product validation failed',
  index: 3,
  payloadRecord: { sku: 'SKU-4' },
  status: 'failed',
};

const PRODUCT_WRITE_STATUS_FILTERED_OUTCOME_EXPORTS = [
  PRODUCT_WRITE_STATUS_FAILED_OUTCOME_EXPORT,
  {
    createdRecord: { id: 'product-1' },
    errorMessage: null,
    index: 0,
    payloadRecord: { sku: 'SKU-1' },
    status: 'created',
  },
  {
    createdRecord: { id: 'product-2' },
    errorMessage: null,
    index: 1,
    payloadRecord: { sku: 'SKU-2' },
    status: 'created',
  },
  {
    createdRecord: { id: 'product-3' },
    errorMessage: null,
    index: 2,
    payloadRecord: { sku: 'SKU-3' },
    status: 'created',
  },
] as const;

const PRODUCT_WRITE_STATUS_FILTERED_OUTCOMES_JSON = JSON.stringify(
  PRODUCT_WRITE_STATUS_FILTERED_OUTCOME_EXPORTS,
  null,
  2
);

const PRODUCT_WRITE_STATUS_FAILED_OUTCOMES_JSON = JSON.stringify(
  [PRODUCT_WRITE_STATUS_FAILED_OUTCOME_EXPORT],
  null,
  2
);

const PRODUCT_WRITE_STATUS_FAILED_PAYLOADS_JSON = JSON.stringify([{ sku: 'SKU-4' }], null, 2);
const PRODUCT_WRITE_STATUS_FAILED_PAYLOAD_JSON = JSON.stringify({ sku: 'SKU-4' }, null, 2);

const PRODUCT_WRITE_STATUS_FILTERED_OUTCOMES_CSV = [
  'itemNumber,index,status,errorMessage,payloadSummary,createdSummary',
  '"4","3","failed","Product validation failed","sku=SKU-4","No created record"',
  '"1","0","created","","sku=SKU-1","id=product-1"',
  '"2","1","created","","sku=SKU-2","id=product-2"',
  '"3","2","created","","sku=SKU-3","id=product-3"',
].join('\n');

const PRODUCT_WRITE_STATUS_FAILED_OUTCOMES_CSV = [
  'itemNumber,index,status,errorMessage,payloadSummary,createdSummary',
  '"4","3","failed","Product validation failed","sku=SKU-4","No created record"',
].join('\n');

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
    window.history.replaceState({}, '', '/admin/playwright/programmable');
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
    usePlaywrightActionRunsMock.mockReturnValue({
      data: { runs: [], nextCursor: null, total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
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
    const rawProducts = buildIndexedStringRecords({
      count: 4,
      key: 'title',
      prefix: 'Product',
    });
    const mappedProducts = buildIndexedStringRecords({
      count: 4,
      key: 'name',
      prefix: 'Product',
    });
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
            ...buildCreatedWriteOutcomes({
              count: 4,
              kind: 'draft',
              recordPrefix: 'draft',
            }),
            ...buildCreatedWriteOutcomes({
              count: 3,
              kind: 'product',
              recordPrefix: 'product',
            }),
            buildFailedWriteOutcome({
              errorMessage: 'Product validation failed',
              index: 3,
              kind: 'product',
              sku: 'SKU-4',
            }),
          ],
          draftPayloads: buildIndexedSkuPayloads(4),
          drafts: buildIndexedIdRecords('draft', 4),
          productPayloads: buildIndexedSkuPayloads(4),
          products: buildIndexedIdRecords('product', 3),
          results: {
            mappedDrafts: buildMappedDrafts(4),
            draftWrites: [
              ...buildIndexedIdRecords('draft', 3),
              buildDraftWriteErrorResult('Catalog validation failed'),
            ],
            drafts: buildIndexedIdRecords('draft', 2),
            products: buildIndexedIdRecords('product', 2),
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
    expect(screen.getByText('Source: Script run')).toBeInTheDocument();
    expect(screen.getByText('Action: import-draft')).toBeInTheDocument();
    expect(screen.getByText('Scrape Source')).toBeInTheDocument();
    expect(screen.getByText('Scraped Items')).toBeInTheDocument();
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
    expect(screen.getByText('Scraped Items Preview (4)')).toBeInTheDocument();
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
    await expect(downloadedBlob?.text()).resolves.toBe(PRODUCT_WRITE_STATUS_FILTERED_OUTCOMES_CSV);
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
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(PRODUCT_WRITE_STATUS_FILTERED_OUTCOMES_CSV);
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
        PRODUCT_WRITE_STATUS_FILTERED_OUTCOMES_JSON
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
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(PRODUCT_WRITE_STATUS_FAILED_PAYLOADS_JSON);
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
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(PRODUCT_WRITE_STATUS_FAILED_OUTCOMES_JSON);
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
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(PRODUCT_WRITE_STATUS_FAILED_OUTCOMES_CSV);
    });
    expect(toastMock).toHaveBeenCalledWith('Failed outcomes CSV for Product Write Status copied to clipboard', {
      variant: 'success',
    });
    clipboardWriteTextMock.mockClear();
    toastMock.mockClear();
    fireEvent.click(within(failedProductRow as HTMLElement).getByRole('button', { name: 'Copy payload JSON' }));
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(PRODUCT_WRITE_STATUS_FAILED_PAYLOAD_JSON);
    });
    expect(toastMock).toHaveBeenCalledWith('Payload for item 4 copied to clipboard', {
      variant: 'success',
    });
    expect(screen.getByText('drafts')).toBeInTheDocument();
    expect(screen.getByText('products')).toBeInTheDocument();
  });

  it('links retained scrape-source runs from the programmable report', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-retained-run-link-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildImportRunResponse({
        result: {
          rawProducts: [{ title: 'Retained Source Product' }],
          scrapeSource: {
            type: 'retained_action_run',
            actionId: 'import-draft',
            runId: 'run-retained-42',
            failedStepId: 'step-retained-42',
            failedStepRefId: 'title_fill',
            failedStepLabel: 'Fill title',
          },
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-retained-run-link-1',
        name: 'Programmable Retained Source',
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(await screen.findByRole('button', { name: 'Test Import' }));

    await waitFor(() => {
      expect(upsertMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-retained-run-link-1',
        payload: expect.objectContaining({
          name: 'Programmable Retained Source',
        }),
      });
    });
    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-retained-run-link-1',
        executionMode: 'dry_run',
        scriptType: 'import',
      });
    });
    expect(screen.getByText('Source: Retained action run')).toBeInTheDocument();
    expect(screen.getByText('Action: import-draft')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run: run-retained-42' })).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?actionId=import-draft&runId=run-retained-42'
    );
    expect(screen.getByRole('link', { name: 'Step detail: Fill title' })).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?actionId=import-draft&runId=run-retained-42&stepId=step-retained-42'
    );
    expect(screen.getByRole('link', { name: 'Failed step: Fill title' })).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=import-draft&blockRefId=title_fill'
    );
  });

  it('auto-expands mapped drafts preview for manual Test Import preview runs', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-import-preview-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts: [{ title: 'Manual Preview Product' }],
        automationFlow: {
          executionMode: 'dry_run',
          flow: {
            name: 'Draft mapper preview',
            blocks: [{ kind: 'map_draft' }],
          },
          results: {
            mappedDrafts: [{ name_en: 'Manual Preview Product' }],
          },
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-import-preview-1',
        name: 'Programmable Import Preview',
        playwrightImportAutomationFlowJson:
          '{"name":"Draft mapper preview","blocks":[{"kind":"map_draft"}]}',
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime focusSection='import' />);

    fireEvent.click(await screen.findByRole('button', { name: 'Test Import' }));

    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-import-preview-1',
        executionMode: 'dry_run',
        scriptType: 'import',
      });
    });

    expect((await screen.findAllByText(/Manual Preview Product/)).length).toBeGreaterThan(0);
    expect(screen.getByText('Mapped Drafts Preview (1)').closest('details')).toHaveAttribute(
      'open'
    );
  });

  it('auto-seeds the strongest signal path for manual Test Import samples when the draft mapper is empty', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-import-auto-seed-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildImportRunResponse({
        result: {
          rawProducts: [
            {
              title: 'Manual Seed Product',
              offer: { price: { value: '13.25' } },
            },
          ],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-import-auto-seed-1',
        name: 'Programmable Import Auto Seed',
        playwrightDraftMapperJson: null,
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime focusSection='import' />);

    fireEvent.click(await screen.findByRole('button', { name: 'Test Import' }));

    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-import-auto-seed-1',
        executionMode: 'dry_run',
        scriptType: 'import',
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Draft mapper source path 1')).toHaveValue('title');
    });
    await waitFor(() => {
      expect(screen.getByText('Suggested')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Auto-seeded from signal: title to name_en using trim.')
    ).toBeInTheDocument();
    expect(screen.getByText(/"name_en": "Manual Seed Product"/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accept suggestion' }));

    await waitFor(() => {
      expect(screen.queryByText('Suggested')).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText('Auto-seeded from signal: title to name_en using trim.')
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Draft mapper source path 1')).toHaveValue('title');
  });

  it('re-seeds from the selected sample when the mapper is cleared and the sample changes', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-import-auto-reseed-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildImportRunResponse({
        result: {
          scrapedItems: [
            {
              title: 'Manual Seed Product',
            },
            {
              offer: { price: { value: '13.25' } },
            },
          ],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-import-auto-reseed-1',
        name: 'Programmable Import Auto Reseed',
        playwrightDraftMapperJson: null,
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime focusSection='import' />);

    fireEvent.click(await screen.findByRole('button', { name: 'Test Import' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Draft mapper source path 1')).toHaveValue('title');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText('No draft mappings configured yet.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Draft mapper sample selector'), {
      target: { value: '1' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Draft mapper source path 1')).toHaveValue(
        'offer.price.value'
      );
    });
    expect(screen.getByText('Suggested')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => {
      expect(screen.queryByText('Suggested')).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText('Draft mapper source path 1')).toHaveValue(
      'offer.price.value'
    );
    expect(screen.getByText(/"price": 13.25/)).toBeInTheDocument();
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
            buildFailedWriteOutcome({
              errorMessage: 'Draft validation failed',
              index: 0,
              kind: 'draft',
              sku: 'SKU-FAIL-1',
            }),
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

  it('shows retained-step context links inside failed draft write sections', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-retained-draft-failure-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts: [{ title: 'Retained Failure Product' }],
        mappedProducts: [{ name: 'Retained Failure Product' }],
        result: {
          scrapeSource: {
            type: 'retained_action_run',
            actionId: 'import-draft',
            runId: 'run-retained-77',
            failedStepId: 'step-retained-77',
            failedStepRefId: 'title_fill',
            failedStepLabel: 'Fill title',
          },
        },
        automationFlow: {
          writeOutcomes: [
            buildFailedWriteOutcome({
              errorMessage: 'Draft validation failed',
              index: 0,
              kind: 'draft',
              sku: 'SKU-RET-1',
            }),
          ],
          draftPayloads: [{ sku: 'SKU-RET-1' }],
          drafts: [],
          productPayloads: [],
          products: [],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-retained-draft-failure-1',
        name: 'Programmable Retained Draft Failure',
        playwrightImportAutomationFlowJson: DEFAULT_IMPORT_FLOW_JSON,
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(await screen.findByRole('button', { name: 'Run Flow' }));

    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-retained-draft-failure-1',
        executionMode: 'commit',
        scriptType: 'import',
      });
    });

    const draftWriteStatusSection = screen
      .getByText('Draft Write Status (1)')
      .closest('details');
    expect(draftWriteStatusSection).not.toBeNull();
    expect(draftWriteStatusSection).toHaveAttribute('open');
    const retainedStepDetailLinks = within(draftWriteStatusSection as HTMLElement).getAllByRole('link', {
      name: 'Retained step detail: Fill title',
    });
    expect(retainedStepDetailLinks[0]).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?actionId=import-draft&runId=run-retained-77&stepId=step-retained-77'
    );
    const sequencerBlockLinks = within(draftWriteStatusSection as HTMLElement).getAllByRole('link', {
      name: 'Sequencer block: Fill title',
    });
    expect(sequencerBlockLinks[0]).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=import-draft&blockRefId=title_fill'
    );
    const failedDraftRow = within(draftWriteStatusSection as HTMLElement)
      .getByText('Item 1')
      .closest('div.rounded-lg');
    expect(failedDraftRow).not.toBeNull();
    expect(
      within(failedDraftRow as HTMLElement).getByRole('link', {
        name: 'Open retained step',
      })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?actionId=import-draft&runId=run-retained-77&stepId=step-retained-77'
    );
    expect(
      within(failedDraftRow as HTMLElement).getByRole('link', {
        name: 'Open sequencer block',
      })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=import-draft&blockRefId=title_fill'
    );
  });

  it('shows retained-step context links inside failed product write sections', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-retained-product-failure-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts: [{ title: 'Retained Product Failure' }],
        mappedProducts: [{ name: 'Retained Product Failure' }],
        result: {
          scrapeSource: {
            type: 'retained_action_run',
            actionId: 'import-draft',
            runId: 'run-retained-88',
            failedStepId: 'step-retained-88',
            failedStepRefId: 'title_fill',
            failedStepLabel: 'Fill title',
          },
        },
        automationFlow: {
          writeOutcomes: [
            buildFailedWriteOutcome({
              errorMessage: 'Product validation failed',
              index: 0,
              kind: 'product',
              sku: 'SKU-RET-PRODUCT-1',
            }),
          ],
          draftPayloads: [],
          drafts: [],
          productPayloads: [{ sku: 'SKU-RET-PRODUCT-1' }],
          products: [],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-retained-product-failure-1',
        name: 'Programmable Retained Product Failure',
        playwrightImportAutomationFlowJson: DEFAULT_IMPORT_FLOW_JSON,
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(await screen.findByRole('button', { name: 'Run Flow' }));

    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-retained-product-failure-1',
        executionMode: 'commit',
        scriptType: 'import',
      });
    });

    const productWriteStatusSection = screen
      .getByText('Product Write Status (1)')
      .closest('details');
    expect(productWriteStatusSection).not.toBeNull();
    expect(productWriteStatusSection).toHaveAttribute('open');
    const retainedStepDetailLinks = within(productWriteStatusSection as HTMLElement).getAllByRole('link', {
      name: 'Retained step detail: Fill title',
    });
    expect(retainedStepDetailLinks[0]).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?actionId=import-draft&runId=run-retained-88&stepId=step-retained-88'
    );
    const sequencerBlockLinks = within(productWriteStatusSection as HTMLElement).getAllByRole('link', {
      name: 'Sequencer block: Fill title',
    });
    expect(sequencerBlockLinks[0]).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=import-draft&blockRefId=title_fill'
    );
    const failedProductRow = within(productWriteStatusSection as HTMLElement)
      .getByText('Item 1')
      .closest('div.rounded-lg');
    expect(failedProductRow).not.toBeNull();
    expect(
      within(failedProductRow as HTMLElement).getByRole('link', {
        name: 'Open retained step',
      })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?actionId=import-draft&runId=run-retained-88&stepId=step-retained-88'
    );
    expect(
      within(failedProductRow as HTMLElement).getByRole('link', {
        name: 'Open sequencer block',
      })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=import-draft&blockRefId=title_fill'
    );
  });

  it('shows retained-step context links inside failed draft write result sections', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-retained-draft-write-result-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts: [{ title: 'Retained Draft Write Result' }],
        mappedProducts: [{ name: 'Retained Draft Write Result' }],
        result: {
          scrapeSource: {
            type: 'retained_action_run',
            actionId: 'import-draft',
            runId: 'run-retained-99',
            failedStepId: 'step-retained-99',
            failedStepRefId: 'title_fill',
            failedStepLabel: 'Fill title',
          },
        },
        automationFlow: {
          results: {
            draftWrites: [buildDraftWriteErrorResult('Catalog validation failed')],
          },
          draftPayloads: [],
          drafts: [],
          productPayloads: [],
          products: [],
          writeOutcomes: [],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-retained-draft-write-result-1',
        name: 'Programmable Retained Draft Write Result',
        playwrightImportAutomationFlowJson: DEFAULT_IMPORT_FLOW_JSON,
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(await screen.findByRole('button', { name: 'Run Flow' }));

    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-retained-draft-write-result-1',
        executionMode: 'commit',
        scriptType: 'import',
      });
    });

    const draftWriteResultSection = screen
      .getByText('Draft Write Result Status (1)')
      .closest('details');
    expect(draftWriteResultSection).not.toBeNull();
    expect(draftWriteResultSection).toHaveAttribute('open');
    const retainedStepDetailLinks = within(draftWriteResultSection as HTMLElement).getAllByRole(
      'link',
      {
        name: 'Retained step detail: Fill title',
      }
    );
    expect(retainedStepDetailLinks[0]).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?actionId=import-draft&runId=run-retained-99&stepId=step-retained-99'
    );
    const sequencerBlockLinks = within(draftWriteResultSection as HTMLElement).getAllByRole(
      'link',
      {
        name: 'Sequencer block: Fill title',
      }
    );
    expect(sequencerBlockLinks[0]).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=import-draft&blockRefId=title_fill'
    );
    const failedDraftWriteResultRow = within(draftWriteResultSection as HTMLElement)
      .getByText('Item 1')
      .closest('div.rounded-lg');
    expect(failedDraftWriteResultRow).not.toBeNull();
    expect(
      within(failedDraftWriteResultRow as HTMLElement).getByRole('link', {
        name: 'Open retained step',
      })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?actionId=import-draft&runId=run-retained-99&stepId=step-retained-99'
    );
    expect(
      within(failedDraftWriteResultRow as HTMLElement).getByRole('link', {
        name: 'Open sequencer block',
      })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=import-draft&blockRefId=title_fill'
    );
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
    expect(draftWriteStatusSection).toHaveAttribute('open');
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
    expect(draftWriteStatusSection).toHaveAttribute('open');
    expect(
      within(draftWriteStatusSection as HTMLElement).getByText('1 no-write')
    ).toBeInTheDocument();
    expect(
      within(draftWriteStatusSection as HTMLElement).queryByText(/failed$/i)
    ).not.toBeInTheDocument();
  });

  it('shows an unknown badge when explicit draft write outcomes contain an unsupported status', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-draft-unknown-1',
    });
    const rawProducts = [{ title: 'Unknown Status Product' }];
    const mappedProducts = [{ name: 'Unknown Status Product' }];
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts,
        mappedProducts,
        automationFlow: {
          writeOutcomes: [
            {
              kind: 'draft',
              status: 'pending_review',
              index: 0,
              payload: { sku: 'SKU-UNKNOWN-1' },
              record: null,
            },
          ],
          draftPayloads: [{ sku: 'SKU-UNKNOWN-1' }],
          drafts: [],
          productPayloads: [],
          products: [],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-draft-unknown-1',
        name: 'Programmable Draft Unknown',
        playwrightImportAutomationFlowJson: '{"name":"Draft unknown","blocks":[{"kind":"create_draft"}]}',
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(await screen.findByRole('button', { name: 'Run Flow' }));

    await waitFor(() => {
      expect(testMutateAsync).toHaveBeenCalledWith({
        connectionId: 'connection-draft-unknown-1',
        executionMode: 'commit',
        scriptType: 'import',
      });
    });

    const draftWriteStatusSection = screen
      .getByText('Draft Write Status (1)')
      .closest('details');
    expect(draftWriteStatusSection).not.toBeNull();
    expect(draftWriteStatusSection).toHaveAttribute('open');
    expect(
      within(draftWriteStatusSection as HTMLElement).getByText('1 unknown')
    ).toBeInTheDocument();
    expect(
      within(draftWriteStatusSection as HTMLElement).queryByText(/failed$/i)
    ).not.toBeInTheDocument();
    expect(
      within(draftWriteStatusSection as HTMLElement).getByRole('button', { name: 'unknown (1)' })
    ).toBeInTheDocument();
  });

  it('builds a draft preview from one test scrape using saved draft mapper rules', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-draft-mapper-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildImportRunResponse({
        result: {
        scrapedItems: [
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
    ).toContain('"path": "vars.scrapedItems"');
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

  it('uses draft mapper sample chips to create the first inferred mapping row', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-draft-chip-seed-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildImportRunResponse({
        result: {
          scrapedItems: [
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
        id: 'connection-draft-chip-seed-1',
        name: 'Programmable Draft Chip Seed',
        playwrightImportAutomationFlowJson: null,
        playwrightDraftMapperJson: null,
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(screen.getByRole('button', { name: 'Test Import' }));

    await screen.findByLabelText('Draft mapper sample selector');
    expect(
      screen.getByText('Click a field to seed the first mapper row with that source path.')
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Draft mapper source path 1')).toHaveValue('title');
    });

    fireEvent.click(screen.getByRole('button', { name: 'price' }));

    expect(screen.getByLabelText('Draft mapper source path 1')).toHaveValue('price');
    expect(screen.getByText(/"price": 19.5/)).toBeInTheDocument();
  });

  it('uses nested draft mapper sample paths to infer price mappings', async () => {
    const upsertMutateAsync = vi.fn().mockResolvedValue({
      id: 'connection-draft-chip-nested-1',
    });
    const testMutateAsync = vi.fn().mockResolvedValue(
      buildImportRunResponse({
        result: {
          scrapedItems: [
            {
              title: 'Mapped draft title',
              offer: {
                price: {
                  value: '19,50',
                },
              },
              gallery: {
                images: [{ url: 'https://example.test/image-1.jpg' }],
              },
            },
          ],
        },
      })
    );

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-draft-chip-nested-1',
        name: 'Programmable Draft Chip Nested',
        playwrightImportAutomationFlowJson: null,
        playwrightDraftMapperJson: null,
      }),
      testMutateAsync,
      upsertMutateAsync,
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    fireEvent.click(screen.getByRole('button', { name: 'Test Import' }));

    await screen.findByLabelText('Draft mapper sample selector');
    expect(screen.getByRole('button', { name: 'offer.price.value' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'gallery.images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'gallery.images.0.url' })).toBeInTheDocument();
    const draftMapperSamplePanel = screen.getByText('Scrape Sample').closest('div')?.parentElement;
    expect(draftMapperSamplePanel).not.toBeNull();
    expect(within(draftMapperSamplePanel as HTMLElement).getAllByText('Signal')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'offer.price.value' }));

    expect(screen.getByLabelText('Draft mapper source path 1')).toHaveValue(
      'offer.price.value'
    );
    expect(screen.getByText(/"price": 19.5/)).toBeInTheDocument();
  });

  it('falls back to the latest retained import action run for draft mapper samples', async () => {
    const retainedRunSummary = {
      runId: 'run-retained-1',
      actionId: 'import-draft',
      actionName: 'Import Draft',
      runtimeKey: null,
      status: 'completed',
      startedAt: '2026-04-18T08:00:00.000Z',
      completedAt: '2026-04-18T08:00:03.000Z',
      durationMs: 3000,
      selectorProfile: null,
      connectionId: null,
      integrationId: null,
      instanceKind: null,
      instanceFamily: null,
      instanceLabel: null,
      tags: [],
      stepCount: 0,
      createdAt: '2026-04-18T08:00:00.000Z',
      updatedAt: '2026-04-18T08:00:03.000Z',
    };
    usePlaywrightActionRunsMock.mockReturnValue({
      data: { runs: [retainedRunSummary], nextCursor: null, total: 1 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockImplementation((runId: string | null) => ({
      data:
        runId === 'run-retained-1'
          ? {
              run: {
                ...retainedRunSummary,
                ownerUserId: null,
                personaId: null,
                websiteId: null,
                flowId: null,
                listingId: null,
                request: null,
                codeSnapshot: null,
                scrapedItems: [
                  { title: 'Retained Product', sourceUrl: 'https://example.test/p/1' },
                ],
                result: null,
                error: null,
                artifacts: [],
                logs: [],
              },
              steps: [],
            }
          : null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-retained-mapper-1',
        name: 'Programmable Retained Mapper',
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
        ]),
      }),
      testMutateAsync: vi.fn(),
      upsertMutateAsync: vi.fn(),
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    expect(
      screen.getByText('Using the latest retained completed import action run as the mapping source.')
    ).toBeInTheDocument();
    expect(await screen.findByText(/"name_en": "Retained Product"/)).toBeInTheDocument();
    expect(usePlaywrightActionRunsMock).toHaveBeenCalledWith(
      { actionId: 'import-draft', status: 'completed', limit: 1 },
      { enabled: true }
    );
  });

  it('auto-seeds the strongest retained-run signal path when the draft mapper is empty', async () => {
    const retainedRunSummary = {
      runId: 'run-retained-auto-seed-1',
      actionId: 'import-draft',
      actionName: 'Import Draft',
      runtimeKey: null,
      status: 'completed',
      startedAt: '2026-04-18T08:00:00.000Z',
      completedAt: '2026-04-18T08:00:03.000Z',
      durationMs: 3000,
      selectorProfile: null,
      connectionId: null,
      integrationId: null,
      instanceKind: null,
      instanceFamily: null,
      instanceLabel: null,
      tags: [],
      stepCount: 0,
      createdAt: '2026-04-18T08:00:00.000Z',
      updatedAt: '2026-04-18T08:00:03.000Z',
    };
    usePlaywrightActionRunsMock.mockReturnValue({
      data: { runs: [retainedRunSummary], nextCursor: null, total: 1 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockImplementation((runId: string | null) => ({
      data:
        runId === 'run-retained-auto-seed-1'
          ? {
              run: {
                ...retainedRunSummary,
                ownerUserId: null,
                personaId: null,
                websiteId: null,
                flowId: null,
                listingId: null,
                request: null,
                codeSnapshot: null,
                scrapedItems: [
                  {
                    title: 'Retained Product',
                    offer: { price: { value: '21.50' } },
                  },
                ],
                result: null,
                error: null,
                artifacts: [],
                logs: [],
              },
              steps: [],
            }
          : null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    mockProgrammableImportRuntime({
      connection: buildProgrammableImportConnection({
        id: 'connection-retained-auto-seed-1',
        name: 'Programmable Retained Auto Seed',
        playwrightImportAutomationFlowJson: null,
        playwrightDraftMapperJson: null,
      }),
      testMutateAsync: vi.fn(),
      upsertMutateAsync: vi.fn(),
    });

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime />);

    await waitFor(() => {
      expect(screen.getByLabelText('Draft mapper source path 1')).toHaveValue('title');
    });
    expect(screen.getByText(/"name_en": "Retained Product"/)).toBeInTheDocument();
  });

  it('selects the deep-linked connection and pinned retained run for the draft mapper', async () => {
    window.history.replaceState(
      {},
      '',
      '/admin/playwright/programmable/import?connectionId=connection-retained-target&retainedRunId=run-retained-99'
    );

    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        buildProgrammableImportConnection({
          id: 'connection-other',
          name: 'Other Connection',
        }),
        buildProgrammableImportConnection({
          id: 'connection-retained-target',
          name: 'Pinned Retained Connection',
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
          ]),
        }),
      ],
      isLoading: false,
    });
    useUpsertProgrammableConnectionMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useTestPlaywrightProgrammableConnectionMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    usePlaywrightActionRunsMock.mockReturnValue({
      data: { runs: [], nextCursor: null, total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockImplementation((runId: string | null) => ({
      data:
        runId === 'run-retained-99'
          ? {
              run: {
                runId: 'run-retained-99',
                actionId: 'import-draft',
                actionName: 'Import Draft',
                runtimeKey: null,
                ownerUserId: null,
                personaId: null,
                status: 'completed',
                startedAt: '2026-04-18T08:00:00.000Z',
                completedAt: '2026-04-18T08:00:02.000Z',
                durationMs: 2000,
                selectorProfile: null,
                websiteId: null,
                flowId: null,
                connectionId: 'connection-retained-target',
                integrationId: 'integration-playwright-1',
                listingId: null,
                instanceKind: 'browser',
                instanceFamily: 'playwright',
                instanceLabel: 'Pinned Browser',
                tags: [],
                request: null,
                codeSnapshot: null,
                scrapedItems: [{ title: 'Pinned Retained Product' }],
                result: null,
                error: null,
                artifacts: [],
                logs: [],
                stepCount: 0,
                createdAt: '2026-04-18T08:00:00.000Z',
                updatedAt: '2026-04-18T08:00:02.000Z',
              },
              steps: [],
            }
          : null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime focusSection='import' />);

    expect(screen.getByLabelText('Playwright connection name')).toHaveValue(
      'Pinned Retained Connection'
    );
    expect(
      screen.getByText('Using retained import action run run-retained-99 as the mapping source.')
    ).toBeInTheDocument();
    expect(await screen.findByText(/"name_en": "Pinned Retained Product"/)).toBeInTheDocument();
    expect(usePlaywrightActionRunsMock).toHaveBeenCalledWith(
      { actionId: 'import-draft', status: 'completed', limit: 1 },
      { enabled: false }
    );
    expect(usePlaywrightActionRunMock).toHaveBeenCalledWith('run-retained-99', {
      enabled: true,
    });
  });

  it('selects a matching connection from importActionId when the mapper deep link omits connectionId', async () => {
    window.history.replaceState(
      {},
      '',
      '/admin/playwright/programmable/import?importActionId=import-draft&retainedRunId=run-retained-77'
    );

    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        buildProgrammableImportConnection({
          id: 'connection-other-import',
          name: 'Other Import Connection',
          playwrightImportActionId: 'import-other',
        }),
        buildProgrammableImportConnection({
          id: 'connection-import-match',
          name: 'Matched Import Connection',
          playwrightImportActionId: 'import-draft',
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
          ]),
        }),
      ],
      isLoading: false,
    });
    useUpsertProgrammableConnectionMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useTestPlaywrightProgrammableConnectionMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    usePlaywrightActionRunsMock.mockReturnValue({
      data: { runs: [], nextCursor: null, total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockImplementation((runId: string | null) => ({
      data:
        runId === 'run-retained-77'
          ? {
              run: {
                runId: 'run-retained-77',
                actionId: 'import-draft',
                actionName: 'Import Draft',
                runtimeKey: null,
                ownerUserId: null,
                personaId: null,
                status: 'completed',
                startedAt: '2026-04-18T09:00:00.000Z',
                completedAt: '2026-04-18T09:00:02.000Z',
                durationMs: 2000,
                selectorProfile: null,
                websiteId: null,
                flowId: null,
                connectionId: null,
                integrationId: 'integration-playwright-1',
                listingId: null,
                instanceKind: 'browser',
                instanceFamily: 'playwright',
                instanceLabel: 'Matched Browser',
                tags: [],
                request: null,
                codeSnapshot: null,
                scrapedItems: [{ title: 'Matched Retained Product' }],
                result: null,
                error: null,
                artifacts: [],
                logs: [],
                stepCount: 0,
                createdAt: '2026-04-18T09:00:00.000Z',
                updatedAt: '2026-04-18T09:00:02.000Z',
              },
              steps: [],
            }
          : null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime focusSection='import' />);

    expect(screen.getByLabelText('Playwright connection name')).toHaveValue(
      'Matched Import Connection'
    );
    expect(
      screen.getByText('Using retained import action run run-retained-77 as the mapping source.')
    ).toBeInTheDocument();
    expect(await screen.findByText(/"name_en": "Matched Retained Product"/)).toBeInTheDocument();
    expect(usePlaywrightActionRunsMock).toHaveBeenCalledWith(
      { actionId: 'import-draft', status: 'completed', limit: 1 },
      { enabled: false }
    );
    expect(usePlaywrightActionRunMock).toHaveBeenCalledWith('run-retained-77', {
      enabled: true,
    });
  });

  it('shows an explicit warning when no programmable connection matches the importActionId hint', async () => {
    window.history.replaceState(
      {},
      '',
      '/admin/playwright/programmable/import?importActionId=missing-import-action&retainedRunId=run-retained-missing'
    );

    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        buildProgrammableImportConnection({
          id: 'connection-fallback-a',
          name: 'Fallback Connection A',
          playwrightImportActionId: 'import-fallback-a',
        }),
        buildProgrammableImportConnection({
          id: 'connection-fallback-b',
          name: 'Fallback Connection B',
          playwrightImportActionId: 'import-fallback-b',
        }),
      ],
      isLoading: false,
    });
    useUpsertProgrammableConnectionMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useTestPlaywrightProgrammableConnectionMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    usePlaywrightActionRunsMock.mockReturnValue({
      data: { runs: [], nextCursor: null, total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockImplementation((runId: string | null) => ({
      data:
        runId === 'run-retained-missing'
          ? {
              run: {
                runId: 'run-retained-missing',
                actionId: 'missing-import-action',
                actionName: 'Missing Import Action',
                runtimeKey: null,
                ownerUserId: null,
                personaId: null,
                status: 'completed',
                startedAt: '2026-04-18T10:00:00.000Z',
                completedAt: '2026-04-18T10:00:02.000Z',
                durationMs: 2000,
                selectorProfile: null,
                websiteId: null,
                flowId: null,
                connectionId: null,
                integrationId: 'integration-playwright-1',
                listingId: null,
                instanceKind: 'browser',
                instanceFamily: 'playwright',
                instanceLabel: 'Unmatched Browser',
                tags: [],
                request: null,
                codeSnapshot: null,
                scrapedItems: [{ title: 'Unmatched Retained Product' }],
                result: null,
                error: null,
                artifacts: [],
                logs: [],
                stepCount: 0,
                createdAt: '2026-04-18T10:00:00.000Z',
                updatedAt: '2026-04-18T10:00:02.000Z',
              },
              steps: [],
            }
          : null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime focusSection='import' />);

    expect(screen.getByLabelText('Playwright connection name')).toHaveValue(
      'Fallback Connection A'
    );
    expect(document.body).toHaveTextContent(
      'No programmable connection matches import action missing-import-action'
    );
    expect(document.body).toHaveTextContent('run-retained-missing');
    expect(document.body).toHaveTextContent('Showing Fallback Connection A instead.');
    expect(screen.getByRole('button', { name: 'Create preview connection (Recommended)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Other setup' })).toBeInTheDocument();
    expect(
      document.body
    ).toHaveTextContent(
      'Recommended because this retained run currently only exposes "title" without pricing, imagery, or product identifiers yet.'
    );
    expect(document.body).toHaveTextContent(
      'Click a field to seed the first mapper row with that source path.'
    );
    expect(document.body).toHaveTextContent('Retained sample fields');
    const retainedFieldsSection = screen.getByText('Retained sample fields').parentElement;
    expect(retainedFieldsSection).not.toBeNull();
    expect(within(retainedFieldsSection as HTMLElement).getByRole('button', { name: 'title' })).toBeInTheDocument();
    expect(
      within(retainedFieldsSection as HTMLElement).queryByRole('button', { name: 'price' })
    ).not.toBeInTheDocument();
    expect(within(retainedFieldsSection as HTMLElement).getAllByText('Signal')).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'Create draft flow connection' })
    ).not.toBeInTheDocument();
    expect(await screen.findByText(/"title": "Unmatched Retained Product"/)).toBeInTheDocument();
    expect(usePlaywrightActionRunMock).toHaveBeenCalledWith('run-retained-missing', {
      enabled: true,
    });
  });

  it('uses the retained title field shortcut to create a preview-seeded matching connection and auto-runs the preview flow', async () => {
    window.history.replaceState(
      {},
      '',
      '/admin/playwright/programmable/import?importActionId=missing-import-action&retainedRunId=run-retained-missing'
    );
    const scrollIntoViewMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });

    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts: [{ title: 'Previewed Retained Product' }],
        automationFlow: {
          executionMode: 'dry_run',
          flow: {
            name: 'Draft mapper preview',
            blocks: [
              {
                kind: 'for_each',
                items: { type: 'path', path: 'vars.scrapedItems' },
                blocks: [
                  { kind: 'map_draft' },
                  {
                    kind: 'append_result',
                    resultKey: 'mappedDrafts',
                    value: { type: 'path', path: 'current' },
                  },
                ],
              },
            ],
          },
          results: {
            mappedDrafts: [{ name_en: 'Previewed Retained Product' }],
          },
        },
      })
    );
    const upsertMutateAsync = vi.fn().mockResolvedValue(
      buildProgrammableImportConnection({
        id: 'connection-created-from-hint',
        name: 'Import missing-import-action',
        playwrightImportActionId: 'missing-import-action',
      })
    );

    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        buildProgrammableImportConnection({
          id: 'connection-fallback-a',
          name: 'Fallback Connection A',
          playwrightImportActionId: 'import-fallback-a',
        }),
      ],
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
    usePlaywrightActionRunsMock.mockReturnValue({
      data: { runs: [], nextCursor: null, total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockImplementation((runId: string | null) => ({
      data:
        runId === 'run-retained-missing'
          ? {
              run: {
                runId: 'run-retained-missing',
                actionId: 'missing-import-action',
                actionName: 'Missing Import Action',
                runtimeKey: null,
                ownerUserId: null,
                personaId: null,
                status: 'completed',
                startedAt: '2026-04-18T10:00:00.000Z',
                completedAt: '2026-04-18T10:00:02.000Z',
                durationMs: 2000,
                selectorProfile: null,
                websiteId: null,
                flowId: null,
                connectionId: null,
                integrationId: 'integration-playwright-1',
                listingId: null,
                instanceKind: 'browser',
                instanceFamily: 'playwright',
                instanceLabel: 'Unmatched Browser',
                tags: [],
                request: null,
                codeSnapshot: null,
                scrapedItems: [{ title: 'Unmatched Retained Product' }],
                result: null,
                error: null,
                artifacts: [],
                logs: [],
                stepCount: 0,
                createdAt: '2026-04-18T10:00:00.000Z',
                updatedAt: '2026-04-18T10:00:02.000Z',
              },
              steps: [],
            }
          : null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime focusSection='import' />);

    const retainedFieldsSection = screen.getByText('Retained sample fields').parentElement;
    expect(retainedFieldsSection).not.toBeNull();

    fireEvent.click(
      within(retainedFieldsSection as HTMLElement).getByRole('button', { name: 'title' })
    );

    await waitFor(() => {
      expect(upsertMutateAsync).toHaveBeenCalledWith({
        payload: expect.objectContaining({
          name: 'Import missing-import-action',
          playwrightImportActionId: 'missing-import-action',
          playwrightListingActionId: null,
          playwrightImportScript: null,
        }),
      });
    });

    const createPayload = upsertMutateAsync.mock.calls[0]?.[0]?.payload as
      | Record<string, unknown>
      | undefined;
    const parsedDraftMapperJson = JSON.parse(
      String(createPayload?.playwrightDraftMapperJson ?? '[]')
    ) as Array<Record<string, unknown>>;
    const parsedAutomationFlowJson = JSON.parse(
      String(createPayload?.playwrightImportAutomationFlowJson ?? '{}')
    ) as Record<string, unknown>;
      expect(parsedDraftMapperJson).toEqual([
      expect.objectContaining({
        enabled: true,
        targetPath: 'name_en',
        mode: 'scraped',
        sourcePath: 'title',
        staticValue: '',
        transform: 'trim',
        required: true,
      }),
    ]);
    expect(parsedAutomationFlowJson).toEqual({
      name: 'Draft mapper preview',
      blocks: [
        {
          kind: 'for_each',
          items: { type: 'path', path: 'vars.scrapedItems' },
          blocks: [
            { kind: 'map_draft' },
            {
              kind: 'append_result',
              resultKey: 'mappedDrafts',
              value: { type: 'path', path: 'current' },
            },
          ],
        },
      ],
    });
    expect(testMutateAsync).toHaveBeenCalledWith({
      connectionId: 'connection-created-from-hint',
      executionMode: 'dry_run',
      scriptType: 'import',
    });
    expect((await screen.findAllByText(/Previewed Retained Product/)).length).toBeGreaterThan(0);
    expect(screen.getByText('Mapped Drafts Preview (1)').closest('details')).toHaveAttribute(
      'open'
    );
    expect(scrollIntoViewMock).toHaveBeenCalled();

    expect(toastMock).toHaveBeenCalledWith(
      'New programmable Playwright connection created for import action "missing-import-action" and preview run completed.',
      { variant: 'success' }
    );
  });

  it('uses the retained price field shortcut to seed a product-like draft-write connection and auto-runs dry-run validation', async () => {
    window.history.replaceState(
      {},
      '',
      '/admin/playwright/programmable/import?importActionId=missing-import-action&retainedRunId=run-retained-missing'
    );
    const scrollIntoViewMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });

    const testMutateAsync = vi.fn().mockResolvedValue(
      buildAutomationFlowImportRunResponse({
        rawProducts: [{ title: 'Draft Validation Product' }],
        automationFlow: {
          executionMode: 'dry_run',
          flow: {
            name: 'Draft mapper import',
            blocks: [
              {
                kind: 'for_each',
                items: { type: 'path', path: 'vars.scrapedItems' },
                blocks: [
                  { kind: 'map_draft' },
                  { kind: 'create_draft' },
                  {
                    kind: 'append_result',
                    resultKey: 'drafts',
                    value: { type: 'path', path: 'current' },
                  },
                ],
              },
            ],
          },
          draftPayloads: [{ name_en: 'Draft Validation Product' }],
          writeOutcomes: [
            {
              kind: 'create_draft',
              index: 0,
              status: 'dry_run',
              payloadRecord: { name_en: 'Draft Validation Product' },
              createdRecord: null,
              errorMessage: null,
            },
          ],
          results: {
            mappedDrafts: [{ name_en: 'Draft Validation Product' }],
          },
        },
      })
    );
    const upsertMutateAsync = vi.fn().mockResolvedValue(
      buildProgrammableImportConnection({
        id: 'connection-created-draft-flow',
        name: 'Import missing-import-action',
        playwrightImportActionId: 'missing-import-action',
      })
    );

    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        buildProgrammableImportConnection({
          id: 'connection-fallback-a',
          name: 'Fallback Connection A',
          playwrightImportActionId: 'import-fallback-a',
        }),
      ],
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
    usePlaywrightActionRunsMock.mockReturnValue({
      data: { runs: [], nextCursor: null, total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockImplementation((runId: string | null) => ({
      data:
        runId === 'run-retained-missing'
          ? {
              run: {
                runId: 'run-retained-missing',
                actionId: 'missing-import-action',
                actionName: 'Missing Import Action',
                runtimeKey: null,
                ownerUserId: null,
                personaId: null,
                status: 'completed',
                startedAt: '2026-04-18T10:00:00.000Z',
                completedAt: '2026-04-18T10:00:02.000Z',
                durationMs: 2000,
                selectorProfile: null,
                websiteId: null,
                flowId: null,
                connectionId: null,
                integrationId: 'integration-playwright-1',
                listingId: null,
                instanceKind: 'browser',
                instanceFamily: 'playwright',
                instanceLabel: 'Unmatched Browser',
                tags: [],
                request: null,
                codeSnapshot: null,
                scrapedItems: [
                  {
                    title: 'Unmatched Retained Product',
                    offer: { price: { value: '19.99' } },
                  },
                ],
                result: null,
                error: null,
                artifacts: [],
                logs: [],
                stepCount: 0,
                createdAt: '2026-04-18T10:00:00.000Z',
                updatedAt: '2026-04-18T10:00:02.000Z',
              },
              steps: [],
            }
          : null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime focusSection='import' />);

    expect(
      screen.getByRole('button', { name: 'Create draft flow connection (Recommended)' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Other setup' })).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      'Recommended because this retained run already looks product-like (found "title" + "offer.price.value").'
    );
    expect(document.body).toHaveTextContent('Retained sample fields');
    expect(document.body).toHaveTextContent('title');
    expect(document.body).toHaveTextContent('offer.price.value');
    expect(
      screen.queryByRole('button', { name: 'Create preview connection' })
    ).not.toBeInTheDocument();

    const retainedFieldsSection = screen.getByText('Retained sample fields').parentElement;
    expect(retainedFieldsSection).not.toBeNull();
    expect(within(retainedFieldsSection as HTMLElement).getAllByText('Signal')).toHaveLength(2);

    fireEvent.click(
      within(retainedFieldsSection as HTMLElement).getByRole('button', {
        name: 'offer.price.value',
      })
    );

    await waitFor(() => {
      expect(upsertMutateAsync).toHaveBeenCalledWith({
        payload: expect.objectContaining({
          name: 'Import missing-import-action',
          playwrightImportActionId: 'missing-import-action',
          playwrightListingActionId: null,
          playwrightImportScript: null,
        }),
      });
    });

    const createPayload = upsertMutateAsync.mock.calls[0]?.[0]?.payload as
      | Record<string, unknown>
      | undefined;
    const parsedDraftMapperJson = JSON.parse(
      String(createPayload?.playwrightDraftMapperJson ?? '[]')
    ) as Array<Record<string, unknown>>;
    const parsedAutomationFlowJson = JSON.parse(
      String(createPayload?.playwrightImportAutomationFlowJson ?? '{}')
    ) as Record<string, unknown>;
    expect(parsedDraftMapperJson).toEqual([
      expect.objectContaining({
        enabled: true,
        targetPath: 'price',
        mode: 'scraped',
        sourcePath: 'offer.price.value',
        staticValue: '',
        transform: 'number',
        required: false,
      }),
    ]);
    expect(parsedAutomationFlowJson).toEqual({
      name: 'Draft mapper import',
      blocks: [
        {
          kind: 'for_each',
          items: { type: 'path', path: 'vars.scrapedItems' },
          blocks: [
            { kind: 'map_draft' },
            { kind: 'create_draft' },
            {
              kind: 'append_result',
              resultKey: 'drafts',
              value: { type: 'path', path: 'current' },
            },
          ],
        },
      ],
    });
    expect(testMutateAsync).toHaveBeenCalledWith({
      connectionId: 'connection-created-draft-flow',
      executionMode: 'dry_run',
      scriptType: 'import',
    });
    expect((await screen.findAllByText(/Draft Validation Product/)).length).toBeGreaterThan(0);
    expect(screen.getByText('Draft Write Status (1)').closest('details')).toHaveAttribute('open');
    expect(scrollIntoViewMock).toHaveBeenCalled();

    expect(toastMock).toHaveBeenCalledWith(
      'New programmable Playwright connection created for import action "missing-import-action" and draft-flow validation completed.',
      { variant: 'success' }
    );
  });

  it('reveals the non-recommended retained-run setup option only after expanding other setup', async () => {
    window.history.replaceState(
      {},
      '',
      '/admin/playwright/programmable/import?importActionId=missing-import-action&retainedRunId=run-retained-missing'
    );

    useProgrammableIntegrationConnectionsMock.mockReturnValue({
      data: [
        buildProgrammableImportConnection({
          id: 'connection-fallback-a',
          name: 'Fallback Connection A',
          playwrightImportActionId: 'import-fallback-a',
        }),
      ],
      isLoading: false,
    });
    usePlaywrightActionRunsMock.mockReturnValue({
      data: { runs: [], nextCursor: null, total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockImplementation((runId: string | null) => ({
      data:
        runId === 'run-retained-missing'
          ? {
              run: {
                runId: 'run-retained-missing',
                actionId: 'missing-import-action',
                actionName: 'Missing Import Action',
                runtimeKey: null,
                ownerUserId: null,
                personaId: null,
                status: 'completed',
                startedAt: '2026-04-18T10:00:00.000Z',
                completedAt: '2026-04-18T10:00:02.000Z',
                durationMs: 2000,
                selectorProfile: null,
                websiteId: null,
                flowId: null,
                connectionId: null,
                integrationId: 'integration-playwright-1',
                listingId: null,
                instanceKind: 'browser',
                instanceFamily: 'playwright',
                instanceLabel: 'Unmatched Browser',
                tags: [],
                request: null,
                codeSnapshot: null,
                scrapedItems: [{ title: 'Unmatched Retained Product', price: '19.99' }],
                result: null,
                error: null,
                artifacts: [],
                logs: [],
                stepCount: 0,
                createdAt: '2026-04-18T10:00:00.000Z',
                updatedAt: '2026-04-18T10:00:02.000Z',
              },
              steps: [],
            }
          : null,
      isLoading: false,
      refetch: vi.fn(),
    }));

    render(<AdminPlaywrightProgrammableIntegrationPageRuntime focusSection='import' />);

    expect(
      screen.getByRole('button', { name: 'Create draft flow connection (Recommended)' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Create preview connection' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Other setup' }));

    expect(screen.getByRole('button', { name: 'Hide other setup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create preview connection' })).toBeInTheDocument();
  });
});
