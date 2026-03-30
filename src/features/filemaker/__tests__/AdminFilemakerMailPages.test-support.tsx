'use client';

import { beforeEach, vi } from 'vitest';

const {
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  routeParamsMock,
  toastMock,
  fetchMock,
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  searchParamsGetMock: vi.fn<(key: string) => string | null>(),
  routeParamsMock: { threadId: 'thread-1' as string | string[] | undefined },
  toastMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
  }),
  useSearchParams: () => ({
    get: searchParamsGetMock,
  }),
  useParams: () => routeParamsMock,
}));

vi.mock('@/features/document-editor/components/DocumentWysiwygEditor', () => ({
  DocumentWysiwygEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={placeholder ?? 'Document editor'}
      data-testid='document-wysiwyg-editor'
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('@/shared/ui/FolderTreePanel', () => ({
  FolderTreePanel: ({
    header,
    children,
  }: {
    header?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section>
      {header}
      {children}
    </section>
  ),
}));

vi.mock('@/features/foldertree/public', () => ({
  useMasterFolderTreeShell: ({
    nodes,
    selectedNodeId,
  }: {
    nodes: Array<Record<string, unknown>>;
    selectedNodeId?: string | null;
  }) => ({
    controller: { nodes, selectedNodeId: selectedNodeId ?? null },
    appearance: { rootDropUi: null },
    viewport: { scrollToNodeRef: { current: null } },
  }),
  FolderTreeViewportV2: ({
    controller,
    renderNode,
    emptyLabel,
  }: {
    controller: { nodes: Array<Record<string, unknown>>; selectedNodeId?: string | null };
    renderNode: (input: {
      node: Record<string, unknown>;
      depth: number;
      hasChildren: boolean;
      isExpanded: boolean;
      isSelected: boolean;
      select: (event: React.MouseEvent<HTMLButtonElement>) => void;
      toggleExpand: () => void;
    }) => React.ReactNode;
    emptyLabel?: string;
  }) => {
    const nodes = controller.nodes ?? [];
    if (nodes.length === 0) return <div>{emptyLabel ?? 'No nodes'}</div>;
    return (
      <div>
        {nodes.map((node) => {
          const nodeId = String(node['id'] ?? '');
          const parentId = node['parentId'];
          const hasChildren = nodes.some((entry) => entry['parentId'] === nodeId);
          return (
            <div key={nodeId}>
              {renderNode({
                node,
                depth: parentId ? 1 : 0,
                hasChildren,
                isExpanded: true,
                isSelected: controller.selectedNodeId === nodeId,
                select: () => {},
                toggleExpand: () => {},
              })}
            </div>
          );
        })}
      </div>
    );
  },
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  FormField: ({
    label,
    children,
    className,
  }: {
    label: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <label className={className}>
      <span>{label}</span>
      {children}
    </label>
  ),
  FormSection: ({
    title,
    children,
    className,
  }: {
    title: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <section className={className}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
    type = 'text',
    id,
    'aria-label': ariaLabel,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    type?: string;
    id?: string;
    'aria-label'?: string;
  }) => (
    <input
      id={id}
      aria-label={ariaLabel}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
  PanelHeader: ({
    title,
    description,
    actions = [],
  }: {
    title: string;
    description?: string;
    actions?: Array<{ key: string; label: string; onClick: () => void }>;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      <div>
        {actions.map((action) => (
          <button key={action.key} type='button' onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
    </header>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    placeholder,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? placeholder ?? 'Select'}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value=''>{placeholder ?? 'Select'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
  }) => (
    <input
      id={id}
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  ActionMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: (event: Event) => void;
  }) => (
    <button
      type='button'
      onClick={() => onSelect?.({ preventDefault() {} } as Event)}
    >
      {children}
    </button>
  ),
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/features/filemaker/components/shared/FilemakerEntityTablePage', () => ({
  FilemakerEntityTablePage: ({
    title,
    description,
    actions,
    badges,
    query,
    onQueryChange,
    queryPlaceholder,
    data,
  }: {
    title: string;
    description: string;
    actions: Array<{ key: string; label: string; onClick: () => void }>;
    badges: React.ReactNode;
    query: string;
    onQueryChange: (value: string) => void;
    queryPlaceholder: string;
    data: Array<{ id: string; subject?: string }>;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      <div>{badges}</div>
      <input
        aria-label={queryPlaceholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <div>
        {actions.map((action) => (
          <button key={action.key} type='button' onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
      <ul>
        {data.map((item) => (
          <li key={item.id}>{item.subject ?? item.id}</li>
        ))}
      </ul>
    </section>
  ),
}));

type MockResponseBody = Record<string, unknown>;

const jsonResponse = (body: MockResponseBody, status: number = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const setupAdminFilemakerMailPagesTest = (): void => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsGetMock.mockReturnValue(null);
    routeParamsMock.threadId = 'thread-1';
    vi.stubGlobal('fetch', fetchMock);
  });
};

export {
  fetchMock,
  jsonResponse,
  routeParamsMock,
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  setupAdminFilemakerMailPagesTest,
  toastMock,
};
