// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  PlaywrightActionRunDetailResponse,
  PlaywrightActionRunSummary,
} from '@/shared/contracts/playwright-action-runs';

const {
  usePlaywrightActionRunsMock,
  usePlaywrightActionRunMock,
  masterNodesMock,
} = vi.hoisted(() => ({
  usePlaywrightActionRunsMock: vi.fn(),
  usePlaywrightActionRunMock: vi.fn(),
  masterNodesMock: vi.fn(),
}));

vi.mock('@/features/playwright/hooks/usePlaywrightActionRuns', () => ({
  usePlaywrightActionRuns: (...args: unknown[]) => usePlaywrightActionRunsMock(...args),
  usePlaywrightActionRun: (...args: unknown[]) => usePlaywrightActionRunMock(...args),
}));

vi.mock('@/features/playwright/action-runs-master-tree', () => ({
  buildPlaywrightActionRunMasterNodes: () => masterNodesMock(),
  decodePlaywrightActionRunNodeId: (nodeId: string) => {
    if (nodeId.startsWith('pw_run__')) {
      return { entity: 'run', id: nodeId.slice('pw_run__'.length) };
    }
    if (nodeId.startsWith('pw_run_step__')) {
      return { entity: 'step', id: nodeId.slice('pw_run_step__'.length) };
    }
    if (nodeId.startsWith('pw_run_date__')) {
      return { entity: 'date', id: nodeId.slice('pw_run_date__'.length) };
    }
    return null;
  },
}));

vi.mock('@/shared/lib/foldertree/public', () => ({
  createMasterFolderTreeTransactionAdapter: () => ({}),
  FolderTreeViewportV2: ({
    renderNode,
  }: {
    renderNode: (input: {
      node: Record<string, unknown>;
      depth: number;
      hasChildren: boolean;
      isExpanded: boolean;
      isSelected: boolean;
      isDragging: boolean;
      dropPosition: null;
      select: () => void;
      toggleExpand: () => void;
    }) => React.ReactNode;
  }) => (
    <div data-testid='folder-tree'>
      {masterNodesMock().map((node: Record<string, unknown>) => (
        <React.Fragment key={String(node.id)}>
          {renderNode({
            node,
            depth: 0,
            hasChildren: false,
            isExpanded: false,
            isSelected: false,
            isDragging: false,
            dropPosition: null,
            select: () => undefined,
            toggleExpand: () => undefined,
          })}
        </React.Fragment>
      ))}
    </div>
  ),
  useMasterFolderTreeShell: () => ({
    controller: {},
    appearance: { rootDropUi: null },
    viewport: { scrollToNodeRef: { current: null } },
  }),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  MasterTreeSettingsButton: () => <div>tree-settings</div>,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    asChild,
    disabled,
    type,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    asChild?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) =>
    asChild ? (
      <div>{children}</div>
    ) : (
      <button type={type ?? 'button'} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Input: ({
    value,
    onChange,
    id,
    placeholder,
    type,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    id?: string;
    placeholder?: string;
    type?: string;
  }) => (
    <input
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
    />
  ),
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children?: React.ReactNode;
    htmlFor?: string;
    className?: string;
  }) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children?: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
  }: {
    children?: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/shared/utils/folder-tree-profiles-v2', () => ({
  getFolderTreeInstanceSettingsHref: () => '/admin/settings/folder-tree',
}));

import { AdminPlaywrightActionRunsPageRuntime } from './AdminPlaywrightActionRunsPageRuntime';

const runSummary: PlaywrightActionRunSummary = {
  runId: 'run-1',
  actionId: 'draft-action-1',
  actionName: 'Draft Action 1',
  runtimeKey: 'tradera_standard_list',
  status: 'failed',
  startedAt: '2026-04-17T08:00:00.000Z',
  completedAt: '2026-04-17T08:00:03.000Z',
  durationMs: 3000,
  selectorProfile: 'profile-market-a',
  connectionId: 'connection-1',
  integrationId: 'integration-1',
  instanceKind: 'browser',
  instanceFamily: 'playwright',
  instanceLabel: 'Browser A',
  tags: [],
  stepCount: 1,
  createdAt: '2026-04-17T08:00:00.000Z',
  updatedAt: '2026-04-17T08:00:03.000Z',
};

const runDetail: PlaywrightActionRunDetailResponse = {
  run: {
    ...runSummary,
    ownerUserId: null,
    personaId: null,
    websiteId: null,
    flowId: null,
    listingId: null,
    request: null,
    codeSnapshot: null,
    scrapedItems: [{ title: 'Captured item', price: '19.99' }],
    result: null,
    error: 'Step failed',
    artifacts: [],
    logs: [],
  },
  steps: [
    {
      id: 'step-1',
      runId: 'run-1',
      parentStepId: null,
      sequenceIndex: 0,
      depth: 0,
      kind: 'runtime_step',
      refId: 'title_fill',
      label: 'Fill title',
      stepType: 'fill',
      selector: 'input[name="title"]',
      selectorKey: 'tradera.title.input',
      selectorProfile: 'profile-market-a',
      status: 'failed',
      startedAt: '2026-04-17T08:00:01.000Z',
      completedAt: '2026-04-17T08:00:02.000Z',
      durationMs: 1000,
      attempt: 1,
      message: 'Title input missing',
      warning: null,
      details: [],
      codeSnapshot: null,
      inputBindings: {},
      selectorResolution: [],
      input: null,
      output: null,
      artifacts: [],
      createdAt: '2026-04-17T08:00:01.000Z',
      updatedAt: '2026-04-17T08:00:02.000Z',
    },
  ],
};

describe('AdminPlaywrightActionRunsPageRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    masterNodesMock.mockReturnValue([
      {
        id: 'pw_run__run-1',
        type: 'folder',
        kind: 'playwright_action_run',
        parentId: null,
        name: 'Draft Action 1',
        path: '2026-04-17/Draft Action 1',
        sortOrder: 0,
        metadata: {
          runId: 'run-1',
          actionId: 'draft-action-1',
          runtimeKey: 'tradera_standard_list',
          selectorProfile: 'profile-market-a',
          status: 'failed',
          stepCount: 1,
        },
      },
    ]);
    usePlaywrightActionRunsMock.mockReturnValue({
      data: {
        runs: [runSummary],
        nextCursor: null,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlaywrightActionRunMock.mockImplementation((runId: string | null) => ({
      data: runId === 'run-1' ? runDetail : null,
      isLoading: false,
      refetch: vi.fn(),
    }));
  });

  it('links retained run detail and failed step detail back into the sequencer, filters, and selector registry', async () => {
    render(<AdminPlaywrightActionRunsPageRuntime />);

    expect(
      screen.getByLabelText('Open Draft Action 1 in sequencer from tree')
    ).toHaveAttribute('href', '/admin/playwright/step-sequencer?actionId=draft-action-1');
    expect(
      screen.getByLabelText('Filter runs by runtime key tradera_standard_list from tree')
    ).toHaveAttribute('href', '/admin/playwright/action-runs?runtimeKey=tradera_standard_list');
    expect(
      screen.getByLabelText('Filter runs by selector profile profile-market-a from tree')
    ).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?selectorProfile=profile-market-a'
    );
    expect(
      screen.getByRole('button', { name: 'Open Draft Action 1 run detail from tree' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open first failed step for Draft Action 1 from tree' })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Open action in sequencer' })).toHaveAttribute(
        'href',
        '/admin/playwright/step-sequencer?actionId=draft-action-1'
      );
    });
    expect(screen.getByRole('link', { name: 'Draft Action 1' })).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=draft-action-1'
    );
    expect(screen.getByRole('link', { name: 'tradera_standard_list' })).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?runtimeKey=tradera_standard_list'
    );
    expect(screen.getByRole('link', { name: 'profile-market-a' })).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?selectorProfile=profile-market-a'
    );

    expect(screen.getByRole('link', { name: 'Filter action ID' })).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?actionId=draft-action-1'
    );
    expect(screen.getByRole('link', { name: 'Filter runtime key' })).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?runtimeKey=tradera_standard_list'
    );
    expect(screen.getByRole('link', { name: 'Filter selector profile' })).toHaveAttribute(
      'href',
      '/admin/playwright/action-runs?selectorProfile=profile-market-a'
    );
    expect(screen.getByText('Scraped items')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Scraped items preview')).toBeInTheDocument();
    expect(screen.getByText(/Captured item/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open selector registry' })).toHaveAttribute(
      'href',
      '/admin/integrations/selectors?namespace=tradera'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open first failed step for Draft Action 1 from tree' }));

    await waitFor(() => {
      expect(screen.getByText('Step detail')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open step' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Open action in sequencer' })).toHaveAttribute(
        'href',
        '/admin/playwright/step-sequencer?actionId=draft-action-1'
      );
    });

    expect(screen.getByRole('link', { name: 'Open selector registry' })).toHaveAttribute(
      'href',
      '/admin/integrations/selectors?namespace=tradera'
    );
  });
});
