/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';

const mockState = vi.hoisted(() => ({
  selectedNode: null as Record<string, unknown> | null,
  schemaQueryResult: {
    data: null as Record<string, unknown> | null,
    isFetching: false,
    refetch: vi.fn(),
  },
  browseQueryResult: {
    data: {
      documents: [] as Array<Record<string, unknown>>,
      total: 0,
    },
    isFetching: false,
  },
  updateSelectedNodeConfig: vi.fn(),
  lastSchemaQueryKey: null as unknown,
  lastBrowseQueryKey: null as unknown,
}));

const buildDbSchemaNode = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'db-schema-node-1',
  type: 'db_schema',
  config: {
    db_schema: {
      provider: 'auto',
      mode: 'all',
      collections: [],
      sourceMode: 'schema',
      contextCollections: [],
      contextQuery: '',
      contextLimit: 20,
      includeFields: true,
      includeRelations: true,
      formatAs: 'text',
    },
  },
  ...overrides,
});

vi.mock('@/shared/lib/ai-paths/api', () => ({
  dbApi: {
    schema: vi.fn(),
    browse: vi.fn(),
  },
}));

vi.mock('@/shared/lib/query-keys', () => ({
  QUERY_KEYS: {
    system: {
      databases: {
        schema: (args: Record<string, unknown>) => ({ type: 'schema', ...args }),
        preview: (args: Record<string, unknown>) => ({ type: 'preview', ...args }),
      },
    },
  },
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: (config: { meta?: { resource?: string }; queryKey: unknown }) => {
    if (config.meta?.resource === 'databases.schema') {
      mockState.lastSchemaQueryKey = config.queryKey;
      return mockState.schemaQueryResult;
    }
    if (config.meta?.resource === 'databases.preview') {
      mockState.lastBrowseQueryKey = config.queryKey;
      return mockState.browseQueryResult;
    }
    throw new Error(`Unexpected query resource: ${config.meta?.resource ?? 'unknown'}`);
  },
}));

vi.mock('../AiPathConfigContext', () => ({
  useAiPathSelection: () => ({
    selectedNode: mockState.selectedNode,
  }),
  useAiPathOrchestrator: () => ({
    updateSelectedNodeConfig: mockState.updateSelectedNodeConfig,
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => {
  const React = require('react') as typeof import('react');
  return {
    Button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
      <button {...props}>{children}</button>
    ),
    Label: ({ children }: { children: React.ReactNode }): React.JSX.Element => <label>{children}</label>,
    Card: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
  };
});

vi.mock('@/shared/ui/forms-and-actions.public', () => {
  const React = require('react') as typeof import('react');
  return {
    Hint: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
    SearchInput: ({
      onClear,
      ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }): React.JSX.Element => (
      <div>
        <input {...props} />
        <button type='button' onClick={onClear}>
          Clear Search
        </button>
      </div>
    ),
    SelectSimple: ({
      ariaLabel,
      onValueChange,
      options,
      value,
      placeholder,
    }: {
      ariaLabel?: string;
      onValueChange?: (value: string) => void;
      options: Array<{ value: string; label: string }>;
      value?: string;
      placeholder?: string;
    }): React.JSX.Element => (
      <select
        aria-label={ariaLabel}
        value={value ?? ''}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        <option value=''>{placeholder ?? 'Select'}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
  };
});

vi.mock('@/shared/ui/navigation-and-layout.public', () => {
  const React = require('react') as typeof import('react');
  return {
    Pagination: (props: {
      page: number;
      totalPages: number;
      pageSize: number;
      onPageChange: (page: number) => void;
    }): React.JSX.Element => {
      const { onPageChange } = props;
      return (
        <button type='button' onClick={() => onPageChange(2)}>
          Page 2
        </button>
      );
    },
  };
});

import { DbSchemaNodeConfigSection } from './DbSchemaNodeConfigSection';

beforeEach(() => {
  mockState.selectedNode = buildDbSchemaNode();
  mockState.schemaQueryResult.data = {
    provider: 'mongodb',
    collections: [
      {
        name: 'products',
        fields: [{ name: 'sku' }, { name: 'title' }, { name: 'price' }],
      },
      {
        name: 'orders',
        fields: [{ name: 'number' }, { name: 'status' }],
      },
    ],
  };
  mockState.schemaQueryResult.isFetching = false;
  mockState.schemaQueryResult.refetch.mockReset();
  mockState.browseQueryResult.data = {
    documents: [],
    total: 0,
  };
  mockState.browseQueryResult.isFetching = false;
  mockState.lastSchemaQueryKey = null;
  mockState.lastBrowseQueryKey = null;
  mockState.updateSelectedNodeConfig.mockReset();
  mockState.updateSelectedNodeConfig.mockImplementation((patch: Record<string, unknown>) => {
    mockState.selectedNode = {
      ...mockState.selectedNode,
      config: {
        ...((mockState.selectedNode?.config as Record<string, unknown>) ?? {}),
        ...patch,
      },
    };
  });
});

describe('DbSchemaNodeConfigSection', () => {
  it('returns null when the selection is empty or not a db schema node', () => {
    mockState.selectedNode = null;
    const { container, unmount } = render(<DbSchemaNodeConfigSection />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    mockState.selectedNode = {
      id: 'parser-1',
      type: 'parser',
      config: {},
    };
    const parserRender = render(<DbSchemaNodeConfigSection />);

    expect(parserRender.container).toBeEmptyDOMElement();
  });

  it('renders loading and empty-schema states', () => {
    mockState.selectedNode = buildDbSchemaNode();
    mockState.schemaQueryResult.isFetching = true;

    const { rerender } = render(<DbSchemaNodeConfigSection />);
    expect(screen.getByText('Loading schema...')).toBeInTheDocument();

    mockState.schemaQueryResult.isFetching = false;
    mockState.schemaQueryResult.data = null;
    rerender(<DbSchemaNodeConfigSection />);

    expect(screen.getByText('No schema data available')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Schema' }));
    expect(mockState.schemaQueryResult.refetch).toHaveBeenCalledTimes(1);
  });

  it('updates schema configuration and resolves multi-provider collection selections', () => {
    mockState.selectedNode = buildDbSchemaNode({
      config: {
        db_schema: {
          provider: 'auto',
          mode: 'selected',
          collections: ['mongodb:orders'],
          sourceMode: 'schema',
          contextCollections: [],
          contextQuery: '',
          contextLimit: 20,
          includeFields: true,
          includeRelations: true,
          formatAs: 'text',
        },
      },
    });
    mockState.schemaQueryResult.data = {
      provider: 'multi',
      sources: {
        mongodb: {
          collections: {
            products: {
              name: 'products',
              fields: [{ name: 'sku' }, { name: 'title' }, { name: 'price' }],
            },
            orders: {
              name: 'orders',
              fields: [{ name: 'number' }, { name: 'status' }],
            },
          },
        },
      },
    };

    const { rerender } = render(<DbSchemaNodeConfigSection />);

    expect(screen.getAllByText('orders').length).toBeGreaterThan(0);
    expect(screen.getByText('number, status')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Schema provider'), {
      target: { value: 'mongodb' },
    });
    expect(mockState.updateSelectedNodeConfig).toHaveBeenLastCalledWith({
      db_schema: expect.objectContaining({
        provider: 'mongodb',
      }),
    });

    fireEvent.click(screen.getByRole('button', { name: /products/i }));
    expect(mockState.updateSelectedNodeConfig).toHaveBeenLastCalledWith({
      db_schema: expect.objectContaining({
        collections: ['mongodb:orders', 'mongodb:products'],
      }),
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Yes' })[0] as HTMLElement);
    expect(mockState.updateSelectedNodeConfig).toHaveBeenLastCalledWith({
      db_schema: expect.objectContaining({
        includeFields: false,
      }),
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Yes' })[1] as HTMLElement);
    expect(mockState.updateSelectedNodeConfig).toHaveBeenLastCalledWith({
      db_schema: expect.objectContaining({
        includeRelations: false,
      }),
    });

    fireEvent.change(screen.getByLabelText('Output format'), {
      target: { value: 'json' },
    });
    expect(mockState.updateSelectedNodeConfig).toHaveBeenLastCalledWith({
      db_schema: expect.objectContaining({
        formatAs: 'json',
      }),
    });

    mockState.selectedNode = {
      ...mockState.selectedNode,
      config: {
        db_schema: {
          provider: 'mongodb',
          mode: 'selected',
          collections: [],
          includeFields: false,
          includeRelations: false,
          formatAs: 'json',
        },
      },
    };
    rerender(<DbSchemaNodeConfigSection />);

    expect(screen.getByText('No collections selected')).toBeInTheDocument();
  });

  it('configures live context collections, filters, and limits', () => {
    mockState.selectedNode = buildDbSchemaNode({
      config: {
        db_schema: {
          provider: 'auto',
          mode: 'selected',
          collections: ['products'],
          sourceMode: 'schema',
          contextCollections: [],
          contextQuery: '',
          contextLimit: 20,
          includeFields: true,
          includeRelations: true,
          formatAs: 'text',
        },
      },
    });

    const { rerender } = render(<DbSchemaNodeConfigSection />);

    fireEvent.change(screen.getByLabelText('Context source mode'), {
      target: { value: 'schema_and_live_context' },
    });
    expect(mockState.updateSelectedNodeConfig).toHaveBeenLastCalledWith({
      db_schema: expect.objectContaining({
        sourceMode: 'schema_and_live_context',
        contextCollections: ['products'],
      }),
    });

    rerender(<DbSchemaNodeConfigSection />);

    fireEvent.click(screen.getAllByRole('button', { name: /orders/i })[1] as HTMLElement);
    expect(mockState.updateSelectedNodeConfig).toHaveBeenLastCalledWith({
      db_schema: expect.objectContaining({
        contextCollections: ['products', 'orders'],
      }),
    });

    fireEvent.change(screen.getByLabelText('Runtime context query filter'), {
      target: { value: '{"catalogId":"catalog-1"}' },
    });
    expect(mockState.updateSelectedNodeConfig).toHaveBeenLastCalledWith({
      db_schema: expect.objectContaining({
        contextQuery: '{"catalogId":"catalog-1"}',
      }),
    });

    fireEvent.change(screen.getByLabelText('Documents per collection'), {
      target: { value: '7' },
    });
    expect(mockState.updateSelectedNodeConfig).toHaveBeenLastCalledWith({
      db_schema: expect.objectContaining({
        contextLimit: 7,
      }),
    });

    expect(screen.getByText(/Runtime will fetch the latest documents from/i)).toBeInTheDocument();
  });

  it('browses documents, expands rows, searches, paginates, and clears the browser', () => {
    const objectId = {
      toString: () => 'oid-1',
    };
    mockState.browseQueryResult.data = {
      documents: [
        {
          _id: 7,
          name: 'Seven',
          sku: 'SKU-7',
        },
        {
          _id: objectId,
          title: { label: 'Complex title' },
          active: true,
        },
      ],
      total: 21,
    };

    render(<DbSchemaNodeConfigSection />);

    fireEvent.change(screen.getByLabelText('Browse collection'), {
      target: { value: 'products' },
    });
    expect(mockState.lastBrowseQueryKey).toMatchObject({
      type: 'preview',
      collection: 'products',
      skip: 0,
      query: '',
      provider: 'mongodb',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle document Seven' }));
    expect(screen.getByText(/"sku": "SKU-7"/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search documents...'), {
      target: { value: 'lamp' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Search documents...'), {
      key: 'Enter',
    });
    expect(mockState.lastBrowseQueryKey).toMatchObject({
      query: 'lamp',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(mockState.lastBrowseQueryKey).toMatchObject({
      skip: 10,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));
    expect(mockState.lastBrowseQueryKey).toMatchObject({
      query: '',
      skip: 0,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('Showing 1-10 of 21 documents')).not.toBeInTheDocument();
  });
});
