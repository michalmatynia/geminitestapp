// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilemakerLexiconTermRow } from '../pages/AdminFilemakerLexiconPage.helpers';
import {
  createDefaultFilemakerDatabase,
  createFilemakerJobListing,
  createFilemakerJobListingLexiconLink,
  createFilemakerLexiconTerm,
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import type { FilemakerDatabase } from '../types';

const {
  confirmMock,
  getSettingMock,
  refetchSettingsMock,
  routerPushMock,
  toastMock,
  updateSettingMutateAsyncMock,
} = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  getSettingMock: vi.fn(),
  refetchSettingsMock: vi.fn(),
  routerPushMock: vi.fn(),
  toastMock: vi.fn(),
  updateSettingMutateAsyncMock: vi.fn(),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: confirmMock,
    ConfirmationModal: () => null,
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    isPending: false,
    mutateAsync: updateSettingMutateAsyncMock,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: getSettingMock,
    isLoading: false,
    refetch: refetchSettingsMock,
  }),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({ children, label }: { children?: React.ReactNode; label: string }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  FormModal: ({
    children,
    isSaveDisabled,
    onClose,
    onSave,
    open,
    saveText,
    title,
  }: {
    children?: React.ReactNode;
    isSaveDisabled?: boolean;
    onClose: () => void;
    onSave: () => void;
    open: boolean;
    saveText?: string;
    title: string;
  }) =>
    open ? (
      <section role='dialog' aria-label={title}>
        <h2>{title}</h2>
        {children}
        <button type='button' disabled={isSaveDisabled === true} onClick={onSave}>
          {saveText ?? 'Save'}
        </button>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </section>
    ) : null,
  SearchInput: ({
    onClear: _onClear,
    onChange,
    placeholder,
    size: _size,
    value,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    onClear?: () => void;
    size?: string;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} {...props} />
  ),
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
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    asChild: _asChild,
    children,
    className,
    onClick,
    size: _size,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    size?: string;
    variant?: string;
  }) => (
    <button type='button' className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  PanelHeader: ({
    actions,
    title,
  }: {
    actions?: Array<{ key: string; label: string; onClick?: () => void }>;
    title: string;
  }) => (
    <header>
      <h1>{title}</h1>
      {actions?.map((action) => (
        <button key={action.key} type='button' onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </header>
  ),
  StandardDataTablePanel: ({
    columns,
    data,
    emptyState,
    filters,
  }: {
    columns: Array<{
      cell?: (input: { row: { original: FilemakerLexiconTermRow } }) => React.ReactNode;
      id?: string;
    }>;
    data: FilemakerLexiconTermRow[];
    emptyState?: string;
    filters?: React.ReactNode;
  }) => (
    <section>
      {filters}
      {data.length === 0 ? <p>{emptyState}</p> : null}
      {data.map((row) => (
        <article key={row.term.id}>
          {columns.map((column, index) => (
            <div key={column.id ?? String(index)}>
              {column.cell?.({ row: { original: row } })}
            </div>
          ))}
        </article>
      ))}
    </section>
  ),
}));

import { AdminFilemakerLexiconPage } from '../pages/AdminFilemakerLexiconPage';

type SettingPayload = {
  key: string;
  value: string;
};

type ConfirmPayload = {
  onConfirm: () => Promise<void> | void;
};

const serializeDatabase = (database: FilemakerDatabase): string =>
  JSON.stringify(toPersistedFilemakerDatabase(database));

const createLexiconTestDatabase = (): FilemakerDatabase => {
  const database = createDefaultFilemakerDatabase();
  const contractTerm = createFilemakerLexiconTerm({
    id: 'term-contract',
    label: 'B2B contract',
    normalizedLabel: 'b2b contract',
    category: 'contract_type',
    occurrenceCount: 2,
    sourceSite: 'pracuj.pl',
    lastSeenAt: '2026-04-28T10:00:00.000Z',
  });
  const workModeTerm = createFilemakerLexiconTerm({
    id: 'term-work-mode',
    label: 'full office work',
    normalizedLabel: 'full office work',
    category: 'work_mode',
  });
  database.lexiconTerms = [contractTerm, workModeTerm];
  database.jobListings = [
    createFilemakerJobListing({
      id: 'job-1',
      organizationId: 'org-1',
      title: 'Frontend Developer',
      lexiconTermIds: ['term-contract'],
    }),
  ];
  database.jobListingLexiconLinks = [
    createFilemakerJobListingLexiconLink({
      id: 'link-1',
      jobListingId: 'job-1',
      lexiconTermId: 'term-contract',
    }),
  ];
  return database;
};

const isSettingPayload = (value: unknown): value is SettingPayload => {
  if (typeof value !== 'object' || value === null) return false;
  return 'key' in value && 'value' in value;
};

const getPersistedDatabaseFromLastSave = (): FilemakerDatabase => {
  const payload = updateSettingMutateAsyncMock.mock.calls.at(-1)?.[0];
  if (!isSettingPayload(payload)) throw new Error('Expected settings payload');
  expect(payload.key).toBe(FILEMAKER_DATABASE_KEY);
  return parseFilemakerDatabase(payload.value);
};

const isConfirmPayload = (value: unknown): value is ConfirmPayload => {
  if (typeof value !== 'object' || value === null) return false;
  return 'onConfirm' in value;
};

const getLastConfirmPayload = (): ConfirmPayload => {
  const payload = confirmMock.mock.calls.at(-1)?.[0];
  if (!isConfirmPayload(payload)) throw new Error('Expected confirm payload');
  return payload;
};

describe('AdminFilemakerLexiconPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/admin/filemaker/lexicon');
    updateSettingMutateAsyncMock.mockResolvedValue(undefined);
    getSettingMock.mockImplementation((key: string) => {
      if (key !== FILEMAKER_DATABASE_KEY) return undefined;
      return serializeDatabase(createLexiconTestDatabase());
    });
  });

  it('uses URL query parameters as the initial lexicon filter', () => {
    window.history.replaceState(
      null,
      '',
      '/admin/filemaker/lexicon?type=contract_type&query=B2B'
    );

    render(<AdminFilemakerLexiconPage />);

    expect(screen.getByLabelText('Lexicon type')).toHaveValue('contract_type');
    expect(screen.getByLabelText('Search lexicon terms')).toHaveValue('B2B');
    expect(screen.getByText('B2B contract')).toBeInTheDocument();
    expect(screen.queryByText('full office work')).toBeNull();
  });

  it('renders lexicon terms with category filtering and usage counts', () => {
    render(<AdminFilemakerLexiconPage />);

    expect(screen.getByRole('heading', { name: 'Filemaker Lexicon' })).toBeInTheDocument();
    expect(screen.getByText('B2B contract')).toBeInTheDocument();
    expect(screen.getByText('1 jobs / 2 sightings')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Lexicon type'), {
      target: { value: 'work_mode' },
    });

    expect(screen.queryByText('B2B contract')).toBeNull();
    expect(screen.getAllByText('full office work')).toHaveLength(2);
  });

  it('creates a manual lexicon term in the Filemaker settings database', async () => {
    render(<AdminFilemakerLexiconPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Create Term' }));
    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: 'Immediate employment' },
    });
    fireEvent.change(screen.getByLabelText('Term type'), {
      target: { value: 'start_date' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save term' }));

    await waitFor(() => expect(updateSettingMutateAsyncMock).toHaveBeenCalledTimes(1));
    const persisted = getPersistedDatabaseFromLastSave();
    expect(persisted.lexiconTerms).toContainEqual(
      expect.objectContaining({
        category: 'start_date',
        label: 'Immediate employment',
        normalizedLabel: 'immediate employment',
      })
    );
  });

  it('updates lexicon type labels and ordering in the Filemaker settings database', async () => {
    render(<AdminFilemakerLexiconPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Manage Types' }));
    fireEvent.change(screen.getByLabelText('technology type label'), {
      target: { value: 'Tech stack' },
    });
    fireEvent.change(screen.getByLabelText('technology type order'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save types' }));

    await waitFor(() => expect(updateSettingMutateAsyncMock).toHaveBeenCalledTimes(1));
    const persisted = getPersistedDatabaseFromLastSave();
    expect(persisted.lexiconTypes.find((type) => type.key === 'technology')).toMatchObject({
      key: 'technology',
      label: 'Tech stack',
      sortOrder: 1,
    });
  });

  it('deletes a lexicon term and removes job listing links', async () => {
    render(<AdminFilemakerLexiconPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete B2B contract' }));
    await getLastConfirmPayload().onConfirm();

    await waitFor(() => expect(updateSettingMutateAsyncMock).toHaveBeenCalledTimes(1));
    const persisted = getPersistedDatabaseFromLastSave();
    expect(persisted.lexiconTerms.some((term) => term.id === 'term-contract')).toBe(false);
    expect(persisted.jobListingLexiconLinks).toHaveLength(0);
    expect(persisted.jobListings[0]?.lexiconTermIds).toEqual([]);
  });
});
