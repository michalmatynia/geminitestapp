// @vitest-environment jsdom

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  savePlaywrightActionsIsPending: false,
  savePlaywrightActionsMutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
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
    onSave,
    open,
    saveText,
  }: {
    actions?: React.ReactNode;
    children?: React.ReactNode;
    onSave: () => void;
    open?: boolean;
    saveText?: string;
  }) =>
    open ? (
      <div role='dialog'>
        <button type='button' onClick={onSave}>
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
    disabled,
    label,
    loading,
    onCheckedChange,
  }: {
    checked: boolean;
    disabled?: boolean;
    label: string;
    loading?: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <button
      type='button'
      aria-pressed={checked}
      disabled={disabled || loading}
      onClick={() => onCheckedChange(!checked)}
    >
      {label}
    </button>
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
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  type PlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { JOB_BOARD_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-board-runtime-constants';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

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
    matchedOffers: 0,
    scrapedOffers: 0,
    skippedOffers: 0,
    unmatchedOffers: 0,
    updatedListings: 0,
  },
  warnings: [],
};

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

describe('FilemakerJobBoardScrapeModal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.savePlaywrightActionsIsPending = false;
    mocks.savePlaywrightActionsMutateAsyncMock.mockResolvedValue(undefined);
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

  it('uses selected organisation scope when reopened with selected IDs', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json(successfulResponse));
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(
      <FilemakerJobBoardScrapeModal
        open={false}
        onClose={vi.fn()}
        onCompleted={vi.fn()}
        selectedOrganizationCount={0}
        selectedOrganizationIds={[]}
      />
    );

    rerender(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
        selectedOrganizationCount={2}
        selectedOrganizationIds={['org-1', 'org-2']}
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
      headless: null,
      mode: 'preview',
      organizationScope: 'selected',
      provider: 'auto',
      selectedOrganizationIds: ['org-1', 'org-2'],
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-csrf-token': 'csrf-token',
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
        selectedOrganizationCount={0}
        selectedOrganizationIds={[]}
      />
    );

    expect(screen.getByText('Connected scraping action')).toBeInTheDocument();
    expect(screen.getByText('Custom Job Board Offer Scrape')).toBeInTheDocument();
    expect(screen.getByText('job_board_scrape')).toBeInTheDocument();
    expect(screen.getByText('Saved action')).toBeInTheDocument();
    expect(screen.getByText(/Action ID: runtime-action-custom-job-board/)).toBeInTheDocument();
    expect(screen.getByText(/Steps: 10\/10/)).toBeInTheDocument();
  });

  it('preserves an explicit all-organisations scope while selected IDs exist', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json(successfulResponse));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerJobBoardScrapeModal
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
        selectedOrganizationCount={2}
        selectedOrganizationIds={['org-1', 'org-2']}
      />
    );

    await user.selectOptions(screen.getByLabelText('Organisation scope'), 'all');
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
        selectedOrganizationCount={0}
        selectedOrganizationIds={[]}
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
    await user.selectOptions(screen.getByLabelText('Duplicates'), 'update');
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
        selectedOrganizationCount={0}
        selectedOrganizationIds={[]}
      />
    );

    expect(screen.getByPlaceholderText(/pracuj\.pl\/praca/)).toHaveValue(
      'https://justjoin.it/job-offers/all-locations/javascript'
    );
    expect(screen.getByLabelText('Provider')).toHaveValue('justjoin_it');
    expect(screen.getByLabelText('Duplicates')).toHaveValue('update');
    expect(screen.getByRole('button', { name: 'Headless browser' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
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
        selectedOrganizationCount={0}
        selectedOrganizationIds={[]}
      />
    );

    expect(screen.getByRole('button', { name: 'Headed browser' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Headed browser' }));
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
        selectedOrganizationCount={0}
        selectedOrganizationIds={[]}
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
        selectedOrganizationCount={0}
        selectedOrganizationIds={[]}
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
