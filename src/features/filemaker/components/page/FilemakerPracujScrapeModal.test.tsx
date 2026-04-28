// @vitest-environment jsdom

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  toastMock: vi.fn(),
  withCsrfHeadersMock: vi.fn(),
}));

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: (headers?: HeadersInit) => mocks.withCsrfHeadersMock(headers),
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
    label,
    onCheckedChange,
  }: {
    checked: boolean;
    label: string;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <button type='button' aria-pressed={checked} onClick={() => onCheckedChange(!checked)}>
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
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  useToast: () => ({ toast: mocks.toastMock }),
}));

import { FilemakerPracujScrapeModal } from './FilemakerPracujScrapeModal';

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

describe('FilemakerPracujScrapeModal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
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
      <FilemakerPracujScrapeModal
        open={false}
        onClose={vi.fn()}
        onCompleted={vi.fn()}
        selectedOrganizationCount={0}
        selectedOrganizationIds={[]}
      />
    );

    rerender(
      <FilemakerPracujScrapeModal
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

  it('preserves an explicit all-organisations scope while selected IDs exist', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json(successfulResponse));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FilemakerPracujScrapeModal
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
      <FilemakerPracujScrapeModal
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
