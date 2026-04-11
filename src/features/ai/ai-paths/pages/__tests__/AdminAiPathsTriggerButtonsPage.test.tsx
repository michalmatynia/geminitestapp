import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';

type MockRow = {
  id: string;
  name: string;
  iconId?: string | null;
  pathId?: string | null;
  enabled?: boolean;
  locations?: string[];
  mode?: string;
  display?: { showLabel?: boolean; label?: string };
  createdAt?: string;
  updatedAt?: string;
  sortIndex?: number;
  usedPaths?: Array<{ id: string; name: string }>;
};

const mockState = vi.hoisted(() => ({
  toast: vi.fn(),
  routerPush: vi.fn(),
  apiPatch: vi.fn(),
  logClientError: vi.fn(), logClientCatch: vi.fn(),
  persistLegacyRepair: vi.fn(),
  triggerButtonsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
    cleanupFixtures: vi.fn(),
    list: vi.fn(),
  },
  triggerButtonsQuery: {
    data: [] as MockRow[],
    error: null as Error | null,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  aiPathsSettingsQuery: {
    data: [] as Array<{ key: string; value: string }>,
    refetch: vi.fn(),
  },
  resolvePortablePathInput: vi.fn(),
}));

const PATH_CONFIG_PREFIX = 'ai_paths:path_config:';
const PATH_INDEX_KEY = 'ai_paths:path_index';

const buildRow = (overrides: Partial<MockRow> = {}): MockRow => ({
  id: 'btn-1',
  name: 'Generate SEO',
  iconId: null,
  pathId: null,
  enabled: true,
  locations: ['product_modal'],
  mode: 'click',
  display: { label: 'Generate SEO', showLabel: true },
  createdAt: '2026-03-19T00:00:00.000Z',
  updatedAt: '2026-03-19T00:00:00.000Z',
  sortIndex: 0,
  usedPaths: [],
  ...overrides,
});

async function runMutation<Result, Variables>(
  config: {
    mutationFn: (variables: Variables) => Promise<Result>;
    onSuccess?: (result: Result) => void;
    onError?: (error: unknown) => void;
  },
  variables: Variables
): Promise<Result> {
  try {
    const result = await config.mutationFn(variables);
    config.onSuccess?.(result);
    return result;
  } catch (error) {
    config.onError?.(error);
    throw error;
  }
}

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({
    push: mockState.routerPush,
  }),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: () => mockState.triggerButtonsQuery,
  createCreateMutationV2: (config: {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onSuccess?: (result: unknown) => void;
    onError?: (error: unknown) => void;
  }) => ({
    isPending: false,
    mutate: (variables: unknown) => {
      void runMutation(config, variables);
    },
    mutateAsync: (variables: unknown) => runMutation(config, variables),
  }),
  createUpdateMutationV2: (config: {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onSuccess?: (result: unknown) => void;
    onError?: (error: unknown) => void;
  }) => ({
    isPending: false,
    mutate: (variables: unknown) => {
      void runMutation(config, variables);
    },
    mutateAsync: (variables: unknown) => runMutation(config, variables),
  }),
  createDeleteMutationV2: (config: {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onSuccess?: (result: unknown) => void;
    onError?: (error: unknown) => void;
  }) => ({
    isPending: false,
    mutate: (variables: unknown) => {
      void runMutation(config, variables);
    },
  }),
}));

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathQueries', () => ({
  useAiPathsSettingsQuery: () => mockState.aiPathsSettingsQuery,
}));

vi.mock('@/shared/lib/ai-paths/legacy-trigger-context-mode-persistence', () => ({
  persistLegacyTriggerContextModeRepair: (...args: unknown[]) =>
    mockState.persistLegacyRepair(...args),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    patch: (...args: unknown[]) => mockState.apiPatch(...args),
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

vi.mock('@/shared/lib/query-keys', () => ({
  QUERY_KEYS: {
    ai: {
      aiPaths: {
        triggerButtons: () => ['trigger-buttons'],
        settings: () => ['ai-paths-settings'],
        mutation: (key: string) => ['mutation', key],
      },
    },
  },
}));

vi.mock('@/shared/utils/ui-utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}));

vi.mock('@/shared/lib/icons', () => ({
  ICON_LIBRARY: [
    {
      id: 'sparkles',
      label: 'Sparkles',
      icon: (props: React.SVGProps<SVGSVGElement>): React.JSX.Element => <svg {...props} />,
    },
  ],
  IconSelector: ({
    onChange,
  }: {
    value?: string | null;
    onChange: (nextValue: string | null) => void;
  }): React.JSX.Element => (
    <div>
      <button type='button' onClick={() => onChange('sparkles')}>
        Select Sparkles
      </button>
      <button type='button' onClick={() => onChange(null)}>
        Clear Icon
      </button>
    </div>
  ),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  PATH_CONFIG_PREFIX: 'ai_paths:path_config:',
  PATH_INDEX_KEY: 'ai_paths:path_index',
  triggerButtonsApi: mockState.triggerButtonsApi,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine', () => ({
  resolvePortablePathInput: (...args: unknown[]) => mockState.resolvePortablePathInput(...args),
}));

vi.mock('@/shared/ui/feedback.public', () => ({
  AppModal: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
  }): React.JSX.Element | null =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children: React.ReactNode }): React.JSX.Element => <span>{children}</span>,
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (value: boolean) => void;
  } & React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element => (
    <input
      {...props}
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  useToast: () => ({
    toast: mockState.toast,
  }),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  ConfirmModal: ({
    isOpen,
    title,
    message,
    onConfirm,
    onClose,
  }: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
  }): React.JSX.Element | null =>
    isOpen ? (
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
        <button type='button' onClick={onConfirm}>
          Confirm
        </button>
        <button type='button' onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
  PanelHeader: ({
    title,
    onRefresh,
    actions,
  }: {
    title: string;
    onRefresh?: () => void;
    actions?: Array<{ key: string; label: string; onClick: () => void; disabled?: boolean }>;
  }): React.JSX.Element => (
    <div>
      <h1>{title}</h1>
      <button type='button' onClick={onRefresh}>
        Refresh
      </button>
      {actions?.map((action) => (
        <button
          key={action.key}
          type='button'
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  Hint: ({ children }: { children: React.ReactNode }): React.JSX.Element => <span>{children}</span>,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  UI_CENTER_ROW_SPACED_CLASSNAME: 'row',
}));

vi.mock('@/shared/ui/templates/SettingsPanelBuilder', () => ({
  SettingsPanelBuilder: (props: {
    open: boolean;
    title: string;
    fields: Array<Record<string, unknown>>;
    values: Record<string, unknown>;
    onChange: (patch: Record<string, unknown>) => void;
    onSave: () => Promise<void>;
    onClose: () => void;
  }): React.JSX.Element | null => {
    const { open, title, fields, values, onChange, onSave, onClose } = props;
    return open ? (
      <div>
        <h2>{title}</h2>
        {fields.map((field) => {
          if (field.type === 'text') {
            return (
              <label key={String(field.key)}>
                <span>{String(field.label)}</span>
                <input
                  aria-label={String(field.label)}
                  value={String(values[String(field.key)] ?? '')}
                  onChange={(event) => onChange({ [String(field.key)]: event.target.value })}
                />
              </label>
            );
          }
          if (field.type === 'select' && Array.isArray(field.options)) {
            return (
              <label key={String(field.key)}>
                <span>{String(field.label)}</span>
                <select
                  aria-label={String(field.label)}
                  value={String(values[String(field.key)] ?? '')}
                  onChange={(event) => onChange({ [String(field.key)]: event.target.value })}
                >
                  {field.options.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>
                      {String(option.label)}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          if (field.type === 'switch') {
            return (
              <label key={String(field.key)}>
                <span>{String(field.label)}</span>
                <input
                  type='checkbox'
                  aria-label={String(field.label)}
                  checked={Boolean(values[String(field.key)])}
                  onChange={(event) => onChange({ [String(field.key)]: event.target.checked })}
                />
              </label>
            );
          }
          if (field.type === 'custom' && typeof field.render === 'function') {
            return <div key={String(field.key)}>{field.render()}</div>;
          }
          return null;
        })}
        <button type='button' onClick={() => void onSave()}>
          Save
        </button>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    ) : null;
  },
}));

vi.mock('../../components/TriggerButtonListManager', () => ({
  TriggerButtonListManager: (props: {
    data: MockRow[];
    onEdit: (row: MockRow) => void;
    onDelete: (id: string) => void;
    onOrderChange: (ids: string[]) => void;
    onToggleVisibility: (row: MockRow, enabled: boolean) => void;
    onOpenPath?: (pathId: string) => void;
    isLoading: boolean;
    isReordering?: boolean;
  }): React.JSX.Element => {
    const {
      data,
      onEdit,
      onDelete,
      onOrderChange,
      onToggleVisibility,
      onOpenPath,
      isLoading,
      isReordering,
    } = props;
    return (
      <div>
        {isLoading ? <p>Loading rows</p> : null}
        {isReordering ? <p>Reordering rows</p> : null}
        <button
          type='button'
          onClick={() => onOrderChange([...data].reverse().map((row) => row.id))}
        >
          Reorder
        </button>
        {data.map((row) => (
          <div key={row.id}>
            <span>{row.name}</span>
            {row.usedPaths?.map((path) => (
              <span key={path.id}>{path.name}</span>
            ))}
            <button type='button' onClick={() => onEdit(row)}>
              Edit {row.id}
            </button>
            <button type='button' onClick={() => onDelete(row.id)}>
              Delete {row.id}
            </button>
            <button type='button' onClick={() => onToggleVisibility(row, row.enabled === false)}>
              Toggle {row.id}
            </button>
            <button
              type='button'
              onClick={() => onOpenPath?.(row.usedPaths?.[0]?.id ?? row.pathId ?? '')}
            >
              Open {row.id}
            </button>
          </div>
        ))}
      </div>
    );
  },
}));

import { AdminAiPathsTriggerButtonsPage } from '../AdminAiPathsTriggerButtonsPage';

beforeEach(() => {
  mockState.toast.mockReset();
  mockState.routerPush.mockReset();
  mockState.apiPatch.mockReset();
  mockState.apiPatch.mockResolvedValue({});
  mockState.logClientError.mockReset();
  mockState.persistLegacyRepair.mockReset();

  mockState.triggerButtonsApi.create.mockReset();
  mockState.triggerButtonsApi.update.mockReset();
  mockState.triggerButtonsApi.delete.mockReset();
  mockState.triggerButtonsApi.reorder.mockReset();
  mockState.triggerButtonsApi.cleanupFixtures.mockReset();
  mockState.triggerButtonsApi.list.mockReset();

  mockState.triggerButtonsApi.create.mockResolvedValue({
    ok: true,
    data: buildRow({ id: 'created-1', name: 'Created Button', iconId: 'sparkles' }),
  });
  mockState.triggerButtonsApi.update.mockResolvedValue({
    ok: true,
    data: buildRow({ id: 'btn-1', name: 'Updated Button' }),
  });
  mockState.triggerButtonsApi.delete.mockResolvedValue({ ok: true });
  mockState.triggerButtonsApi.reorder.mockResolvedValue({
    ok: true,
    data: [buildRow({ id: 'btn-2', name: 'Second Button' }), buildRow()],
  });
  mockState.triggerButtonsApi.cleanupFixtures.mockResolvedValue({
    ok: true,
    data: {
      removedTriggerButtons: 2,
      removedPathIndexEntries: 1,
      removedPathConfigs: 1,
    },
  });

  mockState.triggerButtonsQuery.data = [buildRow()];
  mockState.triggerButtonsQuery.error = null;
  mockState.triggerButtonsQuery.isFetching = false;
  mockState.triggerButtonsQuery.isLoading = false;
  mockState.triggerButtonsQuery.refetch.mockReset();
  mockState.triggerButtonsQuery.refetch.mockResolvedValue({});

  mockState.aiPathsSettingsQuery.data = [];
  mockState.aiPathsSettingsQuery.refetch.mockReset();
  mockState.aiPathsSettingsQuery.refetch.mockResolvedValue({});

  mockState.resolvePortablePathInput.mockReset();
  mockState.resolvePortablePathInput.mockImplementation((raw: string) => ({
    ok: true,
    value: {
      pathConfig: JSON.parse(raw),
      migrationWarnings: [],
    },
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AdminAiPathsTriggerButtonsPage', () => {
  it('maps path usage, persists repairs, refreshes, cleans fixtures, and opens a path', async () => {
    mockState.triggerButtonsQuery.data = [buildRow()];
    mockState.aiPathsSettingsQuery.data = [
      {
        key: PATH_INDEX_KEY,
        value: JSON.stringify([
          { id: 'path-b', name: 'Beta Path' },
          { id: 'path-a', name: 'Alpha Path' },
        ]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}path-b`,
        value: JSON.stringify({
          name: 'Path B',
          nodes: [
            { type: 'trigger', config: { trigger: { event: 'btn-1' } } },
            { type: 'trigger', config: { trigger: { event: 'manual' } } },
          ],
        }),
      },
      {
        key: `${PATH_CONFIG_PREFIX}path-a`,
        value: JSON.stringify({
          name: 'Path A',
          nodes: [{ type: 'trigger', config: { trigger: { event: 'btn-1' } } }],
        }),
      },
    ];
    mockState.resolvePortablePathInput.mockImplementation((raw: string) => ({
      ok: true,
      value: {
        pathConfig: JSON.parse(raw),
        migrationWarnings: [{ code: 'removed_trigger_context_modes_normalized' }],
      },
    }));

    render(<AdminAiPathsTriggerButtonsPage />);

    await waitFor(() => {
      expect(mockState.persistLegacyRepair).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText('Alpha Path')).toBeInTheDocument();
    expect(screen.getByText('Beta Path')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(mockState.triggerButtonsQuery.refetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Playwright Fixtures' }));
    await waitFor(() => {
      expect(mockState.triggerButtonsApi.cleanupFixtures).toHaveBeenCalledTimes(1);
    });
    expect(mockState.toast).toHaveBeenCalledWith(
      'Removed 2 fixture buttons and 1 path config.',
      { variant: 'success' }
    );
    expect(mockState.triggerButtonsQuery.refetch).toHaveBeenCalledTimes(2);
    expect(mockState.aiPathsSettingsQuery.refetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Open btn-1' }));
    await waitFor(() => {
      expect(mockState.apiPatch).toHaveBeenCalledWith('/api/user/preferences', {
        aiPathsActivePathId: 'path-a',
      });
    });
    expect(mockState.routerPush).toHaveBeenCalledWith('/admin/ai-paths?pathId=path-a');
  });

  it('shows a toast when loading trigger buttons fails', async () => {
    mockState.triggerButtonsQuery.error = new Error('Load failed');

    render(<AdminAiPathsTriggerButtonsPage />);

    await waitFor(() => {
      expect(mockState.logClientError).toHaveBeenCalled();
    });
    expect(mockState.toast).toHaveBeenCalledWith('Load failed', { variant: 'error' });
  });

  it('creates a trigger button after selecting an icon', async () => {
    render(<AdminAiPathsTriggerButtonsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'New Trigger Button' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose Icon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Sparkles' }));
    fireEvent.change(screen.getByLabelText('Button Name'), {
      target: { value: 'Generate Copy' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockState.triggerButtonsApi.create).toHaveBeenCalledWith({
        name: 'Generate Copy',
        iconId: 'sparkles',
        enabled: true,
        locations: ['product_modal'],
        mode: 'click',
        display: 'icon_label',
      });
    });
    expect(mockState.toast).toHaveBeenCalledWith('Trigger button created.', {
      variant: 'success',
    });
    await waitFor(() => {
      expect(screen.queryByText('Create Trigger Button')).not.toBeInTheDocument();
    });
  });

  it('allows selecting the marketplace-copy row location when creating a trigger button', async () => {
    render(<AdminAiPathsTriggerButtonsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'New Trigger Button' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose Icon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Sparkles' }));
    fireEvent.change(screen.getByLabelText('Button Name'), {
      target: { value: 'Debrand Marketplace Copy' },
    });
    fireEvent.click(screen.getByLabelText('Products: Marketplace Copy Row'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockState.triggerButtonsApi.create).toHaveBeenCalledWith({
        name: 'Debrand Marketplace Copy',
        iconId: 'sparkles',
        enabled: true,
        locations: ['product_modal', 'product_marketplace_copy_row'],
        mode: 'click',
        display: 'icon_label',
      });
    });
  });

  it('edits, toggles, reorders, and deletes trigger buttons', async () => {
    mockState.triggerButtonsQuery.data = [
      buildRow({
        id: 'btn-1',
        name: 'Generate SEO',
        display: { label: 'Generate SEO', showLabel: false },
        locations: ['product_modal'],
      }),
      buildRow({
        id: 'btn-2',
        name: 'Summarize Product',
        sortIndex: 1,
        locations: [],
        display: { label: 'Summarize Product', showLabel: false },
      }),
    ];
    mockState.aiPathsSettingsQuery.data = [
      {
        key: PATH_INDEX_KEY,
        value: JSON.stringify([{ id: 'path-1', name: 'Trigger Path' }]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}path-1`,
        value: JSON.stringify({
          name: 'Trigger Path',
          nodes: [{ type: 'trigger', config: { trigger: { event: 'btn-1' } } }],
        }),
      },
    ];

    render(<AdminAiPathsTriggerButtonsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit btn-1' }));
    expect(screen.getAllByText('Trigger Path')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Button Name'), {
      target: { value: 'Renamed Trigger' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockState.triggerButtonsApi.update).toHaveBeenCalledWith('btn-1', {
        name: 'Renamed Trigger',
        iconId: null,
        enabled: true,
        locations: ['product_modal'],
        mode: 'click',
        display: 'icon',
      });
    });
    expect(mockState.toast).toHaveBeenCalledWith('Trigger button updated.', {
      variant: 'success',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle btn-2' }));
    await waitFor(() => {
      expect(mockState.triggerButtonsApi.update).toHaveBeenCalledWith('btn-2', {
        name: 'Summarize Product',
        iconId: null,
        enabled: false,
        locations: ['product_modal'],
        mode: 'click',
        display: 'icon',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    await waitFor(() => {
      expect(mockState.triggerButtonsApi.reorder).toHaveBeenCalledWith({
        orderedIds: ['btn-2', 'btn-1'],
      });
    });
    expect(mockState.toast).toHaveBeenCalledWith('Trigger button order updated.', {
      variant: 'success',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete btn-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockState.triggerButtonsApi.delete).toHaveBeenCalledWith('btn-1');
    });
    expect(mockState.toast).toHaveBeenCalledWith('Trigger button deleted.', {
      variant: 'success',
    });
  });
});
