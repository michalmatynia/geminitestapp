// @vitest-environment jsdom

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAiPathRunResultMock: vi.fn(),
  savePlaywrightActionsIsPending: false,
  savePlaywrightActionsMutateAsyncMock: vi.fn(),
  settingsGetMock: vi.fn(),
  subscribeToTrackedAiPathRunMock: vi.fn(),
  toastMock: vi.fn(),
  triggerButtonBarPropsMock: vi.fn(),
  usePlaywrightActionsMock: vi.fn(),
  withCsrfHeadersMock: vi.fn(),
}));

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: (headers?: HeadersInit) => mocks.withCsrfHeadersMock(headers),
}));

vi.mock('@/shared/hooks/usePlaywrightStepSequencer', () => ({
  usePlaywrightActions: (options?: unknown) => mocks.usePlaywrightActionsMock(options),
  useSavePlaywrightActionsMutation: () => ({
    isPending: mocks.savePlaywrightActionsIsPending,
    mutateAsync: mocks.savePlaywrightActionsMutateAsyncMock,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: mocks.settingsGetMock,
  }),
}));

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  ContextRegistryPageProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  getAiPathRunResult: (...args: unknown[]) => mocks.getAiPathRunResultMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/client-run-tracker', () => ({
  subscribeToTrackedAiPathRun: (...args: unknown[]) =>
    mocks.subscribeToTrackedAiPathRunMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar', () => ({
  TriggerButtonBar: (props: {
    disabled?: boolean;
    getEntityJson?: () => Record<string, unknown>;
    location?: string;
    onRunQueued?: (args: {
      button: { id: string };
      entityId: string | null;
      entityType: 'custom';
      runId: string;
    }) => void;
  }) => {
    mocks.triggerButtonBarPropsMock(props);
    return props.location === 'filemaker_job_board_scraped_offer' ? (
      <button
        type='button'
        disabled={props.disabled}
        onClick={() =>
          props.onRunQueued?.({
            button: { id: 'button-classify' },
            entityId: 'entity-1',
            entityType: 'custom',
            runId: 'ai-run-1',
          })
        }
      >
        Classify
      </button>
    ) : null;
  },
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({
    children,
    label,
  }: {
    children?: React.ReactNode;
    label?: string;
  }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  FormModal: ({
    actions,
    children,
    hasUnsavedChanges,
    isSaveDisabled,
    onClose,
    onSave,
    open,
    saveText,
  }: {
    actions?: React.ReactNode;
    children?: React.ReactNode;
    hasUnsavedChanges?: boolean;
    isSaveDisabled?: boolean;
    onClose: () => void;
    onSave: () => void;
    open?: boolean;
    saveText?: string;
  }) =>
    open ? (
      <div role='dialog'>
        <button type='button' onClick={onClose}>
          Close
        </button>
        <button
          type='button'
          data-variant={hasUnsavedChanges ? 'success' : 'outline'}
          disabled={isSaveDisabled}
          onClick={onSave}
        >
          {saveText ?? 'Save'}
        </button>
        {actions}
        {children}
      </div>
    ) : null,
  SelectSimple: ({
    ariaLabel,
    onValueChange,
    options,
    value,
  }: {
    ariaLabel?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    value?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? 'select'}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  ToggleRow: ({
    checked,
    children,
    disabled,
    label,
    loading,
    onCheckedChange,
  }: {
    checked: boolean;
    children?: React.ReactNode;
    disabled?: boolean;
    label: string;
    loading?: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <div>
      <button
        type='button'
        aria-pressed={checked}
        disabled={disabled || loading}
        onClick={() => onCheckedChange(!checked)}
      >
        {label}
      </button>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    disabled,
    onClick,
    variant,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    variant?: string;
  }) => (
    <button type='button' data-variant={variant} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  useToast: () => ({ toast: mocks.toastMock }),
}));

import { FilemakerJobBoardScrapeModal } from './FilemakerJobBoardScrapeModal';
import type {
  FilemakerJobBoardScrapeOfferResult,
  FilemakerJobBoardScrapeResponse,
  FilemakerJobBoardScrapeRuntimeRun,
  FilemakerJobBoardScrapeRuntimeStatus,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  type PlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { JOB_BOARD_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-board-runtime-constants';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import { FILEMAKER_DATABASE_KEY } from '../../settings-constants';

const successfulResponse = {
  browserMode: 'headless',
  mode: 'preview',
  offers: [],
  provider: 'pracuj_pl',
  runId: 'run-1',
  sourceSite: 'pracuj.pl',
  sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
  summary: {
    createdListings: 0,
    addressUpdates: 0,
    createdLexiconTerms: 0,
    createdOrganizations: 0,
    linkedLexiconTerms: 0,
    matchedOffers: 0,
    profileUpdates: 0,
    scrapedOffers: 0,
    skippedOffers: 0,
    unmatchedOffers: 0,
    updatedOrganizations: 0,
    updatedListings: 0,
    verifiedListings: 0,
  },
  warnings: [],
} satisfies FilemakerJobBoardScrapeResponse;

const buildPreviewOfferResult = (input: {
  externalId: string;
  title?: string;
  sourceUrl?: string;
}): FilemakerJobBoardScrapeOfferResult => ({
  listingId: null,
  match: {
    confidence: 100,
    organizationId: 'org-1',
    organizationName: 'Acme Inc',
    reason: 'exact name match',
  },
  offer: {
    companyName: 'Acme Inc',
    companyProfile: 'Acme Inc builds commerce software.',
    companyProfileUrl: 'https://www.pracuj.pl/pracodawcy/acme,1001',
    description: 'Build interfaces',
    expiresAt: null,
    location: 'Warszawa',
    postedAt: null,
    salaryCurrency: 'PLN',
    salaryMax: 18000,
    salaryMin: 12000,
    salaryPeriod: 'monthly',
    salaryText: '12 000 - 18 000 PLN',
    sourceExternalId: input.externalId,
    sourceSite: 'pracuj.pl',
    sourceUrl:
      input.sourceUrl ??
      `https://www.pracuj.pl/praca/developer-warszawa,oferta,${input.externalId}`,
    pills: [],
    unclassifiedPills: [],
    title: input.title ?? 'Frontend Developer',
  },
  reason: null,
  status: 'preview',
});

const buildJobBoardAction = (
  headless: boolean | null,
  overrides: Partial<Pick<PlaywrightAction, 'description' | 'id' | 'name'>> = {}
): PlaywrightAction => {
  const seed = getPlaywrightRuntimeActionSeed(JOB_BOARD_SCRAPE_RUNTIME_KEY);
  if (seed === null) {
    throw new Error('Missing job-board runtime action seed.');
  }
  return normalizePlaywrightAction({
    ...seed,
    ...overrides,
    executionSettings: {
      ...defaultPlaywrightActionExecutionSettings,
      ...seed.executionSettings,
      headless,
    },
  });
};

const buildRuntimeRun = (
  status: FilemakerJobBoardScrapeRuntimeStatus,
  result: FilemakerJobBoardScrapeResponse | null = null
): FilemakerJobBoardScrapeRuntimeRun => ({
  completedAt: ['completed', 'failed', 'canceled'].includes(status)
    ? '2026-04-28T10:03:00.000Z'
    : null,
  createdAt: '2026-04-28T10:00:00.000Z',
  error: status === 'failed' || status === 'canceled' ? 'Job-board scrape stopped.' : null,
  id: 'runtime-run-1',
  mode: result?.mode ?? 'preview',
  result,
  sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
  startedAt: status === 'queued' ? null : '2026-04-28T10:00:01.000Z',
  status,
  updatedAt: '2026-04-28T10:03:00.000Z',
});

describe('FilemakerJobBoardScrapeModal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.savePlaywrightActionsIsPending = false;
    mocks.savePlaywrightActionsMutateAsyncMock.mockResolvedValue(undefined);
    mocks.settingsGetMock.mockReturnValue(undefined);
    mocks.getAiPathRunResultMock.mockReset();
    mocks.subscribeToTrackedAiPathRunMock.mockReset();
    mocks.subscribeToTrackedAiPathRunMock.mockReturnValue(vi.fn());
    mocks.usePlaywrightActionsMock.mockReturnValue({
      data: [buildJobBoardAction(true)],
      isLoading: false,
      isPending: false,
    });
    window.localStorage.clear();
    mocks.withCsrfHeadersMock.mockImplementation((headers?: HeadersInit) => ({
      ...(headers as Record<string, string> | undefined),
      'x-csrf-token': 'csrf-token',
    }));
  });

  it('uses scraped-company organisation source when reopened', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json(successfulResponse));
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(
      <FilemakerJobBoardScrapeModal
        open={false}
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    rerender(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({
      extractionPath: 'playwright_ai',
      headless: null,
      mode: 'preview',
      organizationScope: 'all',
      provider: 'auto',
      selectedOrganizationIds: [],
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-csrf-token': 'csrf-token',
    });
  });

  it('sends the deterministic scraper path when selected', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json(successfulResponse));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByLabelText('Scraper path'), 'deterministic');
    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({
      extractionPath: 'deterministic',
      mode: 'preview',
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    });
  });

  it('sends the combined deterministic and Playwright fallback path when selected', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json(successfulResponse));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.selectOptions(
      screen.getByLabelText('Scraper path'),
      'deterministic_then_playwright'
    );
    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({
      extractionPath: 'deterministic_then_playwright',
      mode: 'preview',
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    });
  });

  it('shows the connected Job Board Offer Scrape action sequence details', () => {
    mocks.usePlaywrightActionsMock.mockReturnValue({
      data: [
        buildJobBoardAction(true, {
          description: 'Custom scrape flow from the Step Sequencer.',
          id: 'runtime-action-custom-job-board',
          name: 'Custom Job Board Offer Scrape',
        }),
      ],
      isLoading: false,
      isPending: false,
    });

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    expect(screen.getByText('Connected scraping action')).toBeInTheDocument();
    expect(screen.getByText('Custom Job Board Offer Scrape')).toBeInTheDocument();
    expect(screen.getByText('job_board_scrape')).toBeInTheDocument();
    expect(screen.getByText('Saved action')).toBeInTheDocument();
    expect(screen.getByText(/Action ID: runtime-action-custom-job-board/)).toBeInTheDocument();
    expect(screen.getByText(/Steps: 10\/10/)).toBeInTheDocument();
  });

  it('keeps scraped-company organisation source for every scrape request', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json(successfulResponse));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    expect(screen.getByText('Scraped company per listing')).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({
      organizationScope: 'all',
      selectedOrganizationIds: [],
    });
  });

  it('saves scraper settings and restores them for the next modal instance', async () => {
    const user = userEvent.setup();

    const { unmount } = render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save settings' })).toHaveAttribute(
      'data-variant',
      'outline'
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://justjoin.it/job-offers/all-locations/javascript'
    );
    await user.selectOptions(screen.getByLabelText('Provider'), 'justjoin_it');
    await user.selectOptions(screen.getByLabelText('Scraper path'), 'deterministic');
    await user.selectOptions(screen.getByLabelText('Duplicates'), 'add');
    expect(screen.getByRole('button', { name: 'Save settings' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save settings' })).toHaveAttribute(
      'data-variant',
      'success'
    );
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(mocks.toastMock).toHaveBeenCalledWith('Scraper settings saved.', {
      variant: 'success',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled());
    const saved = JSON.parse(
      window.localStorage.getItem('filemaker.job-board-scraper.settings.v1') ?? '{}'
    );
    expect(saved.draft).not.toHaveProperty('headless');

    unmount();

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText(/pracuj\.pl\/praca/)).toHaveValue(
      'https://justjoin.it/job-offers/all-locations/javascript'
    );
    expect(screen.getByLabelText('Provider')).toHaveValue('justjoin_it');
    expect(screen.getByLabelText('Scraper path')).toHaveValue('deterministic');
    expect(screen.getByLabelText('Duplicates')).toHaveValue('add');
    expect(screen.getByRole('option', { name: 'Skip existing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action browser mode' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('Current: Headless')).toBeInTheDocument();
  });

  it('keeps old saved skip-duplicate scraper settings as skip existing', () => {
    window.localStorage.setItem(
      'filemaker.job-board-scraper.settings.v1',
      JSON.stringify({
        version: 2,
        draft: {
          duplicateStrategy: 'skip',
          sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
        },
      })
    );

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Duplicates')).toHaveValue('skip');
    expect(screen.getByRole('option', { name: 'Skip existing' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/pracuj\.pl\/praca/)).toHaveValue(
      'https://www.pracuj.pl/praca/it;kw'
    );
  });

  it('keeps current saved skip-duplicate scraper settings as skip existing', () => {
    window.localStorage.setItem(
      'filemaker.job-board-scraper.settings.v1',
      JSON.stringify({
        version: 3,
        draft: {
          duplicateStrategy: 'skip',
          sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
        },
      })
    );

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Duplicates')).toHaveValue('skip');
    expect(screen.getByRole('option', { name: 'Skip existing' })).toBeInTheDocument();
  });

  it('uses and saves the shared Job Board Offer Scrape browser mode setting', async () => {
    const user = userEvent.setup();
    mocks.usePlaywrightActionsMock.mockReturnValue({
      data: [buildJobBoardAction(false)],
      isLoading: false,
      isPending: false,
    });

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Action browser mode' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByText('Current: Headed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Action browser mode' }));
    expect(screen.getByText('Current: Headless')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save settings' })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(mocks.savePlaywrightActionsMutateAsyncMock).toHaveBeenCalledTimes(1));
    const payload = mocks.savePlaywrightActionsMutateAsyncMock.mock.calls[0]?.[0] as {
      actions: PlaywrightAction[];
    };
    const action = payload.actions.find(
      (entry) => entry.runtimeKey === JOB_BOARD_SCRAPE_RUNTIME_KEY
    );
    expect(action?.executionSettings.headless).toBe(true);
  });

  it('stops a running preview request and re-enables the modal controls', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://it.pracuj.pl/praca?its=frontend%2Cbackend%2Cfullstack'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit?.signal).toBeInstanceOf(AbortSignal);

    await user.click(screen.getByRole('button', { name: 'Stop' }));

    await waitFor(() => {
      expect(requestInit?.signal?.aborted).toBe(true);
      expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
    });
    expect(mocks.toastMock).toHaveBeenCalledWith('Job-board scrape stopped.', {
      variant: 'default',
    });
  });

  it('renders live preview updates from the streamed scrape response', async () => {
    const user = userEvent.setup();
    const offerResult = {
      listingId: null,
      match: {
        confidence: 100,
        organizationId: 'org-1',
        organizationName: 'Acme Inc',
        reason: 'exact name match',
      },
      offer: {
        companyName: 'Acme Inc',
        companyProfile: 'Acme Inc builds commerce software.',
        companyProfileUrl: 'https://www.pracuj.pl/pracodawcy/acme,1001',
        description: 'Build interfaces',
        expiresAt: '2026-05-28T23:59:59.000Z',
        location: 'Warszawa',
        postedAt: '2026-04-28T09:00:00.000Z',
        salaryCurrency: 'PLN',
        salaryMax: 18000,
        salaryMin: 12000,
        salaryPeriod: 'monthly',
        salaryText: '12 000 - 18 000 PLN',
        sourceExternalId: '1001',
        sourceSite: 'pracuj.pl',
        sourceUrl: 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001',
        pills: [
          {
            category: 'contract_type',
            label: 'contract of employment',
            position: 1,
            sourceSite: 'pracuj.pl',
            sourceUrl: 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001',
          },
        ],
        title: 'Frontend Developer',
      },
      reason: null,
      status: 'preview',
    };
    const streamedResponse = {
      ...successfulResponse,
      offers: [offerResult],
      summary: {
        ...successfulResponse.summary,
        matchedOffers: 1,
        scrapedOffers: 1,
      },
    };
    const events = [
      {
        at: '2026-04-28T10:00:00.000Z',
        message: 'Collecting job-board offer links.',
        type: 'status',
      },
      {
        at: '2026-04-28T10:00:01.000Z',
        provider: 'pracuj_pl',
        runId: 'run-1',
        sourceSite: 'pracuj.pl',
        type: 'links',
        urls: [offerResult.offer.sourceUrl],
      },
      {
        at: '2026-04-28T10:00:02.000Z',
        index: 1,
        result: offerResult,
        total: 1,
        type: 'offer',
      },
      {
        at: '2026-04-28T10:00:03.000Z',
        result: streamedResponse,
        type: 'done',
      },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(events.map((event) => JSON.stringify(event)).join('\n'), {
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(screen.getByText('Live scrape preview')).toBeInTheDocument());
    expect(screen.getByText('Discovered links')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: offerResult.offer.sourceUrl })).toBeInTheDocument();
    expect(screen.getAllByText('Posted: 2026-04-28T09:00:00.000Z').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expires: 2026-05-28T23:59:59.000Z').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Company profile' })[0]).toHaveAttribute(
      'href',
      'https://www.pracuj.pl/pracodawcy/acme,1001'
    );
    expect(screen.getAllByRole('link', { name: 'Offer source' })[0]).toHaveAttribute(
      'href',
      offerResult.offer.sourceUrl
    );
    expect(screen.getAllByRole('link', { name: 'contract of employment' })[0]).toHaveAttribute(
      'href',
      '/admin/filemaker/lexicon?type=contract_type&query=contract+of+employment'
    );
    expect(screen.getAllByText('Frontend Developer').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Acme Inc builds commerce software/).length).toBeGreaterThan(0);
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({ mode: 'preview', stream: true });
  });

  it('queues the Classify trigger and applies returned lexicon classifications', async () => {
    const user = userEvent.setup();
    mocks.settingsGetMock.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY
        ? JSON.stringify({
            version: 2,
            lexiconTerms: [
              {
                id: 'filemaker-lexicon-term-technology-react',
                createdAt: '2026-04-28T00:00:00.000Z',
                updatedAt: '2026-04-28T00:00:00.000Z',
                label: 'React',
                normalizedLabel: 'react',
                typeKey: 'technology',
                category: 'technology',
                sourceSite: 'pracuj.pl',
                sourceProvider: 'pracuj.pl',
                firstSeenAt: '2026-04-28T00:00:00.000Z',
                lastSeenAt: '2026-04-28T00:00:00.000Z',
                occurrenceCount: 12,
              },
              {
                id: 'filemaker-lexicon-term-benefit-react',
                createdAt: '2026-04-28T00:00:00.000Z',
                updatedAt: '2026-04-28T00:00:00.000Z',
                label: 'React',
                normalizedLabel: 'react',
                typeKey: 'benefit',
                category: 'benefit',
                sourceSite: 'legacy-import',
                sourceProvider: 'legacy-import',
                firstSeenAt: '2026-04-28T00:00:00.000Z',
                lastSeenAt: '2026-04-28T00:00:00.000Z',
                occurrenceCount: 2,
              },
            ],
          })
        : undefined
    );
    const offerResult = {
      ...buildPreviewOfferResult({ externalId: '1001' }),
      offer: {
        ...buildPreviewOfferResult({ externalId: '1001' }).offer,
        unclassifiedPills: [
          {
            label: 'React',
            position: 1,
            reason: 'raw other pill',
            sourceSite: 'pracuj.pl',
            sourceUrl: 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001',
          },
        ],
      },
    } satisfies FilemakerJobBoardScrapeOfferResult;
    const classifiedOffer = {
      ...offerResult.offer,
      pills: [
        {
          category: 'technology',
          typeKey: 'technology',
          label: 'React',
          position: 1,
          sourceSite: 'pracuj.pl',
          sourceUrl: offerResult.offer.sourceUrl,
        },
      ],
      unclassifiedPills: [],
    };
    const streamedResponse = {
      ...successfulResponse,
      offers: [offerResult],
      summary: {
        ...successfulResponse.summary,
        matchedOffers: 1,
        scrapedOffers: 1,
      },
    };
    const events = [
      {
        at: '2026-04-28T10:00:00.000Z',
        index: 1,
        result: offerResult,
        total: 1,
        type: 'offer',
      },
      {
        at: '2026-04-28T10:00:01.000Z',
        result: streamedResponse,
        type: 'done',
      },
    ];
    mocks.getAiPathRunResultMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          id: 'ai-run-1',
          status: 'completed',
          createdAt: '2026-04-28T10:00:02.000Z',
          updatedAt: '2026-04-28T10:00:03.000Z',
          runtimeState: {
            outputs: {
              'node-regex-job-board-lexicon-classification': {
                value: {
                  classifications: [
                    {
                      confidence: 0.94,
                      label: 'React',
                      normalizedLabel: 'React',
                      reason: 'Framework/library',
                      typeKey: 'technology',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });
    mocks.subscribeToTrackedAiPathRunMock.mockImplementation(
      (_runId: string, listener: (snapshot: Record<string, unknown>) => void) => {
        window.setTimeout(() => {
          listener({
            runId: 'ai-run-1',
            status: 'completed',
            updatedAt: '2026-04-28T10:00:03.000Z',
            finishedAt: '2026-04-28T10:00:03.000Z',
            errorMessage: null,
            entityId: 'entity-1',
            entityType: 'custom',
            trackingState: 'stopped',
            run: null,
          });
        }, 0);
        return vi.fn();
      }
    );
    const fetchMock = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).endsWith('/classifications')) {
        return Response.json({
          listingId: null,
          offer: classifiedOffer,
          summary: {
            acceptedClassifications: 1,
            createdLexiconTerms: 1,
            linkedLexiconTerms: 0,
            persisted: true,
            rejectedClassifications: 0,
          },
          warnings: ['No saved listing was found; lexicon terms were enriched for the preview offer.'],
        });
      }
      return new Response(events.map((event) => JSON.stringify(event)).join('\n'), {
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(screen.getAllByText('Unclassified').length).toBeGreaterThan(0));
    const triggerProps = mocks.triggerButtonBarPropsMock.mock.calls
      .map((call) => call[0] as { getEntityJson?: () => Record<string, unknown>; location?: string })
      .find((props) => props.location === 'filemaker_job_board_scraped_offer');
    const entityJson = triggerProps?.getEntityJson?.();
    const lexiconContext = entityJson?.['lexiconContext'] as Record<string, unknown> | undefined;
    const validationPatterns = lexiconContext?.['validationPatterns'] as
      | Array<Record<string, unknown>>
      | undefined;
    const directValidationPatterns = lexiconContext?.['directValidationPatterns'] as
      | Array<Record<string, unknown>>
      | undefined;
    const knownTerms = lexiconContext?.['knownTerms'] as
      | Array<Record<string, unknown>>
      | undefined;
    expect(validationPatterns?.length).toBeGreaterThan(0);
    expect(
      validationPatterns?.some(
        (pattern) =>
          pattern['id'] === 'filemaker-lexicon-validation-pattern-clean-technology' &&
          pattern['targetTypeKey'] === 'technology'
      )
    ).toBe(true);
    expect(
      directValidationPatterns?.some(
        (pattern) =>
          pattern['id'] === 'filemaker-lexicon-validation-pattern-clean-technology' &&
          pattern['directlyApplicableToUnclassified'] === true &&
          pattern['classificationPolicy'] === 'classify'
      )
    ).toBe(true);
    expect(knownTerms?.slice(0, 2)).toEqual([
      expect.objectContaining({
        classificationRole: 'authoritative',
        label: 'React',
        normalizedLabel: 'react',
        occurrenceCount: 12,
        sourceSite: 'pracuj.pl',
        typeKey: 'technology',
      }),
      expect.objectContaining({
        classificationRole: 'authoritative',
        label: 'React',
        normalizedLabel: 'react',
        occurrenceCount: 2,
        sourceSite: 'legacy-import',
        typeKey: 'benefit',
      }),
    ]);
    expect(entityJson).toMatchObject({
      classificationInput: {
        unclassifiedPills: [
          expect.objectContaining({
            label: 'React',
            nearbyClassifiedPills: expect.any(Array),
            sourceHint: expect.stringContaining('raw other pill'),
          }),
        ],
      },
    });
    await user.click(screen.getAllByRole('button', { name: 'Classify' })[0]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const classificationRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      '/api/filemaker/organizations/job-board-scrape/classifications'
    );
    expect(classificationRequest).toMatchObject({
      runId: 'ai-run-1',
      classifications: [
        {
          confidence: 0.94,
          label: 'React',
          normalizedLabel: 'React',
          typeKey: 'technology',
        },
      ],
      offer: {
        sourceUrl: offerResult.offer.sourceUrl,
        unclassifiedPills: [expect.objectContaining({ label: 'React' })],
      },
    });
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: 'React' })[0]).toHaveAttribute(
        'href',
        '/admin/filemaker/lexicon?type=technology&query=React'
      )
    );
    expect(mocks.toastMock).toHaveBeenCalledWith(
      'Classified 1 scraped lexicon pill for Frontend Developer.',
      { variant: 'success' }
    );
  });

  it('stores the Redis runtime run id from a streamed preview run', async () => {
    const user = userEvent.setup();
    const completedRun = buildRuntimeRun('completed', successfulResponse);
    const events = [
      {
        at: '2026-04-28T10:00:00.000Z',
        run: buildRuntimeRun('queued'),
        type: 'run',
      },
      {
        at: '2026-04-28T10:00:01.000Z',
        message: 'Collecting job-board offer links.',
        type: 'status',
      },
      {
        at: '2026-04-28T10:00:02.000Z',
        result: successfulResponse,
        type: 'done',
      },
      {
        at: '2026-04-28T10:00:03.000Z',
        run: completedRun,
        type: 'run',
      },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(events.map((event) => JSON.stringify(event)).join('\n'), {
        headers: {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'x-filemaker-job-board-scrape-run-id': 'runtime-run-1',
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() =>
      expect(
        window.localStorage.getItem('filemaker.job-board-scraper.active-run-id.v1')
      ).toBe('runtime-run-1')
    );
    await waitFor(() => expect(screen.getByText('Run completed')).toBeInTheDocument());
  });

  it('rehydrates a stored Redis runtime run when the modal opens again', async () => {
    const offerResult = buildPreviewOfferResult({ externalId: '1001' });
    window.localStorage.setItem(
      'filemaker.job-board-scraper.active-run-id.v1',
      'runtime-run-1'
    );
    const fetchMock = vi.fn(async () =>
      Response.json({
        events: [
          {
            at: '2026-04-28T10:00:00.000Z',
            run: buildRuntimeRun('running'),
            type: 'run',
          },
          {
            at: '2026-04-28T10:00:01.000Z',
            message: 'Collecting job-board offer links.',
            type: 'status',
          },
          {
            at: '2026-04-28T10:00:02.000Z',
            index: 1,
            result: offerResult,
            total: 1,
            type: 'offer',
          },
        ],
        run: buildRuntimeRun('running'),
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/filemaker/organizations/job-board-scrape/runs/runtime-run-1',
        expect.objectContaining({ method: 'GET' })
      )
    );
    expect(screen.getByText('Live scrape preview')).toBeInTheDocument();
    expect(screen.getByText('Run running')).toBeInTheDocument();
    expect(screen.getByText('Collecting job-board offer links.')).toBeInTheDocument();
    expect(screen.getAllByText('Frontend Developer').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('does not replay import notifications when opening a previously completed runtime run', async () => {
    const onCompleted = vi.fn();
    const completedImportResponse: FilemakerJobBoardScrapeResponse = {
      ...successfulResponse,
      mode: 'import',
      summary: {
        ...successfulResponse.summary,
        createdListings: 1,
        scrapedOffers: 1,
        verifiedListings: 1,
      },
    };
    window.localStorage.setItem(
      'filemaker.job-board-scraper.active-run-id.v1',
      'runtime-run-1'
    );
    const fetchMock = vi.fn(async () =>
      Response.json({
        events: [
          {
            at: '2026-04-28T10:00:00.000Z',
            run: buildRuntimeRun('completed', completedImportResponse),
            type: 'run',
          },
          {
            at: '2026-04-28T10:00:03.000Z',
            result: completedImportResponse,
            type: 'done',
          },
        ],
        run: buildRuntimeRun('completed', completedImportResponse),
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={onCompleted}
      />
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/filemaker/organizations/job-board-scrape/runs/runtime-run-1',
        expect.objectContaining({ method: 'GET' })
      )
    );
    expect(screen.getByText('Run completed')).toBeInTheDocument();
    expect(mocks.toastMock).not.toHaveBeenCalledWith(
      'Imported 1 created, 0 updated, 0 skipped.',
      expect.anything()
    );
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('falls back to the latest Redis runtime run when the stored run id is stale', async () => {
    const offerResult = buildPreviewOfferResult({ externalId: '1001' });
    const latestRun = { ...buildRuntimeRun('running'), id: 'runtime-run-latest' };
    window.localStorage.setItem(
      'filemaker.job-board-scraper.active-run-id.v1',
      'stale-runtime-run'
    );
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/runs/latest')) {
        return Response.json({
          events: [
            {
              at: '2026-04-28T10:00:00.000Z',
              run: latestRun,
              type: 'run',
            },
            {
              at: '2026-04-28T10:00:01.000Z',
              index: 1,
              result: offerResult,
              total: 1,
              type: 'offer',
            },
          ],
          run: latestRun,
        });
      }
      return Response.json({ message: 'Job-board scrape run not found.' }, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/filemaker/organizations/job-board-scrape/runs/latest',
        expect.objectContaining({ method: 'GET' })
      )
    );
    expect(screen.getByText('Run running')).toBeInTheDocument();
    expect(screen.getAllByText('Frontend Developer').length).toBeGreaterThan(0);
    expect(
      window.localStorage.getItem('filemaker.job-board-scraper.active-run-id.v1')
    ).toBe('runtime-run-latest');
  });

  it('saves all scraped preview drafts from the Scraped offers section', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    const offerResult = buildPreviewOfferResult({ externalId: '1001' });
    const savedResult = {
      ...offerResult,
      listingId: 'listing-1',
      status: 'created',
    };
    const streamedResponse = {
      ...successfulResponse,
      offers: [offerResult],
      summary: {
        ...successfulResponse.summary,
        matchedOffers: 1,
        scrapedOffers: 1,
      },
    };
    const saveResponse = {
      ...successfulResponse,
      mode: 'import',
      offers: [savedResult],
      summary: {
        ...successfulResponse.summary,
        createdListings: 1,
        matchedOffers: 1,
        scrapedOffers: 1,
        verifiedListings: 1,
      },
    };
    const saveRun = {
      completedAt: '2026-04-28T10:00:03.000Z',
      createdAt: '2026-04-28T10:00:02.000Z',
      error: null,
      id: 'save-run-1',
      mode: 'import',
      result: saveResponse,
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
      startedAt: '2026-04-28T10:00:02.100Z',
      status: 'completed',
      updatedAt: '2026-04-28T10:00:03.000Z',
    };
    const events = [
      {
        at: '2026-04-28T10:00:00.000Z',
        index: 1,
        result: offerResult,
        total: 1,
        type: 'offer',
      },
      {
        at: '2026-04-28T10:00:01.000Z',
        result: streamedResponse,
        type: 'done',
      },
    ];
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (body['action'] === 'save_drafts') {
        const saveEvents = [
          {
            at: '2026-04-28T10:00:02.000Z',
            message: 'Saving scraped job-board drafts.',
            type: 'status',
          },
          {
            at: '2026-04-28T10:00:03.000Z',
            result: saveResponse,
            type: 'done',
          },
          {
            at: '2026-04-28T10:00:03.100Z',
            run: saveRun,
            type: 'run',
          },
        ];
        return new Response(saveEvents.map((event) => JSON.stringify(event)).join('\n'), {
          headers: {
            'content-type': 'application/x-ndjson; charset=utf-8',
            'x-filemaker-job-board-scrape-run-id': 'save-run-1',
          },
        });
      }
      return new Response(events.map((event) => JSON.stringify(event)).join('\n'), {
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={onCompleted}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(screen.getByText('Scraped offers')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: /^Save$/ })[0]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const saveRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(saveRequest).toMatchObject({
      action: 'save_drafts',
      duplicateStrategy: 'skip',
      importStrategy: 'create_unmatched',
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
      stream: true,
    });
    expect(saveRequest.offers).toHaveLength(1);
    expect(saveRequest.offers[0]).toMatchObject({
      sourceUrl: offerResult.offer.sourceUrl,
      title: 'Frontend Developer',
    });
    await waitFor(() => expect(screen.getAllByText('created').length).toBeGreaterThan(0));
    expect(screen.getByText('Run completed')).toBeInTheDocument();
    expect(
      window.localStorage.getItem('filemaker.job-board-scraper.active-run-id.v1')
    ).toBe('save-run-1');
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('aborts an in-flight scraped draft save stream when the modal closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const offerResult = buildPreviewOfferResult({ externalId: '1001' });
    const streamedResponse = {
      ...successfulResponse,
      offers: [offerResult],
      summary: {
        ...successfulResponse.summary,
        matchedOffers: 1,
        scrapedOffers: 1,
      },
    };
    const previewEvents = [
      {
        at: '2026-04-28T10:00:00.000Z',
        index: 1,
        result: offerResult,
        total: 1,
        type: 'offer',
      },
      {
        at: '2026-04-28T10:00:01.000Z',
        result: streamedResponse,
        type: 'done',
      },
    ];
    let saveSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (body['action'] === 'save_drafts') {
        saveSignal = init?.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          saveSignal?.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true }
          );
        });
      }
      return new Response(previewEvents.map((event) => JSON.stringify(event)).join('\n'), {
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={onClose}
        onCompleted={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(screen.getByText('Scraped offers')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: /^Save$/ })[0]);
    await waitFor(() => expect(saveSignal).toBeDefined());

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(saveSignal?.aborted).toBe(true);
  });

  it('saves an individual scraped draft from its not saved row action', async () => {
    const user = userEvent.setup();
    const firstOffer = buildPreviewOfferResult({ externalId: '1001', title: 'Frontend Developer' });
    const secondOffer = buildPreviewOfferResult({ externalId: '1002', title: 'Backend Developer' });
    const savedSecondOffer = {
      ...secondOffer,
      listingId: 'listing-2',
      status: 'created',
    };
    const streamedResponse = {
      ...successfulResponse,
      offers: [firstOffer, secondOffer],
      summary: {
        ...successfulResponse.summary,
        matchedOffers: 2,
        scrapedOffers: 2,
      },
    };
    const saveResponse = {
      ...successfulResponse,
      mode: 'import',
      offers: [savedSecondOffer],
      summary: {
        ...successfulResponse.summary,
        createdListings: 1,
        matchedOffers: 1,
        scrapedOffers: 1,
        verifiedListings: 1,
      },
    };
    const events = [
      {
        at: '2026-04-28T10:00:00.000Z',
        index: 1,
        result: firstOffer,
        total: 2,
        type: 'offer',
      },
      {
        at: '2026-04-28T10:00:01.000Z',
        index: 2,
        result: secondOffer,
        total: 2,
        type: 'offer',
      },
      {
        at: '2026-04-28T10:00:02.000Z',
        result: streamedResponse,
        type: 'done',
      },
    ];
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (body['action'] === 'save_drafts') return Response.json(saveResponse);
      return new Response(events.map((event) => JSON.stringify(event)).join('\n'), {
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(screen.getAllByText('Backend Developer').length).toBeGreaterThan(0));
    await user.click(screen.getAllByRole('button', { name: /^Save$/ })[2]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const saveRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(saveRequest).toMatchObject({ action: 'save_drafts' });
    expect(saveRequest.offers).toHaveLength(1);
    expect(saveRequest.offers[0]).toMatchObject({
      sourceUrl: secondOffer.offer.sourceUrl,
      title: 'Backend Developer',
    });
  });

  it('renders streamed offers when optional scraper fields are missing', async () => {
    const user = userEvent.setup();
    const partialOfferResult = {
      listingId: null,
      match: null,
      offer: {
        companyName: 'Acme Inc',
        sourceUrl: 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001',
        title: 'Frontend Developer',
      },
      reason: null,
      status: 'preview',
    };
    const streamedResponse = {
      ...successfulResponse,
      offers: [partialOfferResult],
      summary: {
        ...successfulResponse.summary,
        scrapedOffers: 1,
      },
    };
    const events = [
      {
        at: '2026-04-28T10:00:00.000Z',
        index: 1,
        result: partialOfferResult,
        total: 1,
        type: 'offer',
      },
      {
        at: '2026-04-28T10:00:01.000Z',
        result: streamedResponse,
        type: 'done',
      },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(events.map((event) => JSON.stringify(event)).join('\n'), {
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(screen.getAllByText('Frontend Developer').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Acme Inc').length).toBeGreaterThan(0);
  });

  it('shows skipped offer reasons in the scrape result list', async () => {
    const user = userEvent.setup();
    const skippedReason = 'A matching pracuj.pl listing already exists.';
    const skippedResult = {
      ...buildPreviewOfferResult({ externalId: '1001' }),
      listingId: 'listing-1',
      reason: skippedReason,
      status: 'skipped',
    } satisfies FilemakerJobBoardScrapeOfferResult;
    const fetchMock = vi.fn(async () =>
      Response.json({
        ...successfulResponse,
        mode: 'import',
        offers: [skippedResult],
        summary: {
          ...successfulResponse.summary,
          matchedOffers: 1,
          scrapedOffers: 1,
          skippedOffers: 1,
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(screen.getByText(skippedReason)).toBeInTheDocument());
    expect(screen.getByText('skipped')).toBeInTheDocument();
  });

  it('renders streamed database write events during import', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    const createdResult = {
      listingId: 'listing-1',
      match: {
        confidence: 100,
        organizationId: 'org-1',
        organizationName: 'Acme Inc',
        reason: 'created from scraped job-board employer',
      },
      offer: {
        companyName: 'Acme Inc',
        companyProfile: 'Acme Inc builds commerce software.',
        companyProfileUrl: 'https://www.pracuj.pl/pracodawcy/acme,1001',
        description: 'Build interfaces',
        expiresAt: null,
        location: 'Warszawa',
        postedAt: null,
        salaryCurrency: null,
        salaryMax: null,
        salaryMin: null,
        salaryPeriod: 'monthly',
        salaryText: '',
        sourceExternalId: '1001',
        sourceSite: 'pracuj.pl',
        sourceUrl: 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001',
        pills: [],
        title: 'Frontend Developer',
      },
      reason: null,
      status: 'created',
    };
    const streamedResponse = {
      ...successfulResponse,
      mode: 'import',
      offers: [createdResult],
      summary: {
        ...successfulResponse.summary,
        createdListings: 1,
        createdOrganizations: 1,
        matchedOffers: 1,
        profileUpdates: 1,
        scrapedOffers: 1,
        verifiedListings: 1,
      },
    };
    const events = [
      {
        at: '2026-04-28T10:00:00.000Z',
        message: 'Importing scraped offers.',
        type: 'status',
      },
      {
        at: '2026-04-28T10:00:01.000Z',
        type: 'write',
        write: {
          action: 'organization_created',
          message: 'Created organisation Acme Inc.',
          profileUpdated: true,
          result: { ...createdResult, listingId: null },
        },
      },
      {
        at: '2026-04-28T10:00:02.000Z',
        type: 'write',
        write: {
          action: 'listing_created',
          message: 'Created job listing Frontend Developer.',
          profileUpdated: false,
          result: createdResult,
        },
      },
      {
        at: '2026-04-28T10:00:03.000Z',
        result: streamedResponse,
        type: 'done',
      },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(events.map((event) => JSON.stringify(event)).join('\n'), {
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={onCompleted}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(screen.getByText('Database writes')).toBeInTheDocument());
    expect(screen.getByText('Organisation created')).toBeInTheDocument();
    expect(screen.getByText('Listing created')).toBeInTheDocument();
    expect(screen.getByText(/listing-1/)).toBeInTheDocument();
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
  });

  it('renders duplicate scraper warnings without duplicate React key warnings', async () => {
    const user = userEvent.setup();
    const duplicateWarning = 'Updated company profile for Ch.-4';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn(async () =>
      Response.json({
        ...successfulResponse,
        warnings: [duplicateWarning, duplicateWarning],
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      render(
        <FilemakerJobBoardScrapeModal
          open
          onClose={vi.fn()}
          onCompleted={vi.fn()}
        />
      );

      await user.type(
        screen.getByPlaceholderText(/pracuj\.pl\/praca/),
        'https://www.pracuj.pl/praca/it;kw'
      );
      await user.click(screen.getByRole('button', { name: 'Preview' }));

      await waitFor(() => expect(screen.getAllByText(duplicateWarning)).toHaveLength(2));
      expect(hasDuplicateKeyWarning(consoleErrorSpy.mock.calls)).toBe(false);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('runs import mode and notifies completion after a successful import', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    const fetchMock = vi.fn(async () =>
      Response.json({
        ...successfulResponse,
        mode: 'import',
        summary: {
          ...successfulResponse.summary,
          createdListings: 1,
          scrapedOffers: 1,
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={onCompleted}
      />
    );

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl\/praca/),
      'https://www.pracuj.pl/praca/it;kw'
    );
    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({
      duplicateStrategy: 'skip',
      mode: 'import',
      organizationScope: 'all',
      selectedOrganizationIds: [],
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    });
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(mocks.toastMock).toHaveBeenCalledWith('Imported 1 created, 0 updated, 0 skipped.', {
      variant: 'success',
    });
  });
});

const hasDuplicateKeyWarning = (calls: unknown[][]): boolean =>
  calls.some((call) =>
    call.some((value) => {
      const message = String(value);
      return message.includes('Encountered two children') || message.includes('same key');
    })
  );
