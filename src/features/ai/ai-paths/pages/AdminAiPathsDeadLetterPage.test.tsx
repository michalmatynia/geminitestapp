// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useDeadLetterRunsMock: vi.fn(),
}));

vi.mock('../hooks/useDeadLetterRuns', () => ({
  useDeadLetterRuns: mocks.useDeadLetterRunsMock,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  Checkbox: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input type='checkbox' {...props} />,
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  DataTable: () => <div data-testid='data-table'>table</div>,
  StatusBadge: ({ status }: { status?: React.ReactNode }) => <div>{status}</div>,
}));

vi.mock('@/shared/ui/templates.public', () => ({
  StandardDataTablePanel: ({
    filters,
    footer,
    children,
  }: {
    filters?: React.ReactNode;
    footer?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {filters}
      {children}
      {footer}
    </div>
  ),
  ConfirmModal: () => null,
  FilterPanel: ({
    headerAction,
  }: {
    headerAction?: React.ReactNode;
  }) => <div>{headerAction}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    title,
    children,
    actions,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <section>
      <div>{title}</div>
      {actions}
      <div>{children}</div>
    </section>
  ),
  Hint: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  Pagination: () => null,
  EmptyState: ({ title, description }: { title?: React.ReactNode; description?: React.ReactNode }) => (
    <div>
      {title}
      {description}
    </div>
  ),
  MetadataItem: ({
    label,
    value,
    hint,
  }: {
    label?: React.ReactNode;
    value?: React.ReactNode;
    hint?: React.ReactNode;
  }) => (
    <div>
      <div>{label}</div>
      <div>{value}</div>
      {hint ? <div>{hint}</div> : null}
    </div>
  ),
  PageLayout: ({
    title,
    description,
    children,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{description}</div>
      <div>{children}</div>
    </div>
  ),
  UI_CENTER_ROW_SPACED_CLASSNAME: 'center-row',
  UI_GRID_RELAXED_CLASSNAME: 'grid-relaxed',
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  DetailModal: ({
    isOpen,
    children,
    title,
    subtitle,
  }: {
    isOpen: boolean;
    children?: React.ReactNode;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
  }) => (isOpen ? <div><div>{title}</div><div>{subtitle}</div>{children}</div> : null),
}));

import { AdminAiPathsDeadLetterPage } from './AdminAiPathsDeadLetterPage';

describe('AdminAiPathsDeadLetterPage', () => {
  beforeEach(() => {
    mocks.useDeadLetterRunsMock.mockReset().mockReturnValue({
      runs: [],
      total: 0,
      page: 1,
      setPage: vi.fn(),
      pageSize: 25,
      setPageSize: vi.fn(),
      pathId: '',
      setPathId: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      requeueMode: 'resume',
      setRequeueMode: vi.fn(),
      selectedIds: new Set<string>(),
      toggleSelected: vi.fn(),
      detailOpen: true,
      setDetailOpen: vi.fn(),
      detailLoading: false,
      detail: {
        run: {
          id: 'run-1',
          status: 'dead_lettered',
          pathName: 'Test Path',
          pathId: 'path-1',
          entityId: 'product-1',
          retryCount: 3,
          maxAttempts: 3,
          deadLetteredAt: '2026-04-12T10:00:00.000Z',
          updatedAt: '2026-04-12T10:00:00.000Z',
          errorMessage: 'Final failure',
        },
        nodes: [
          {
            id: 'node-1',
            runId: 'run-1',
            nodeId: 'node-playwright',
            nodeType: 'playwright',
            nodeTitle: 'Playwright node',
            status: 'failed',
            attempt: 1,
            outputs: {
              bundle: {
                result: {
                  runtimePosture: {
                    browser: {
                      engine: 'chromium',
                      label: 'Chrome',
                      headless: false,
                    },
                    antiDetection: {
                      identityProfile: 'search',
                      locale: 'en-US',
                      timezoneId: 'America/New_York',
                      stickyStorageState: {
                        enabled: true,
                        loaded: true,
                      },
                      proxy: {
                        enabled: true,
                        providerPreset: 'brightdata',
                        sessionMode: 'sticky',
                        reason: 'applied',
                        serverHost: 'proxy.local:8080',
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        events: [],
      },
      handleOpenDetail: vi.fn(),
      requeueSelected: vi.fn(),
      requeueAll: vi.fn(),
      requeueingSelected: false,
      requeueingAll: false,
      retryFailedPending: false,
      showRetryFailedConfirm: false,
      setShowRetryFailedConfirm: vi.fn(),
      handleRetryFailedNodes: vi.fn(),
      retryNode: vi.fn(),
      retryingNodeId: null,
      expandedNodeIds: new Set<string>(),
      toggleNodeExpanded: vi.fn(),
      streamStatus: 'stopped',
      streamPaused: false,
      setStreamPaused: vi.fn(),
      eventsOverflow: false,
      loading: false,
      isFetching: false,
      refetch: vi.fn(),
      handleRequeueSingle: vi.fn(),
    });
  });

  it('renders Playwright runtime posture inside the dead-letter detail modal', () => {
    render(<AdminAiPathsDeadLetterPage />);

    expect(screen.getByText('Playwright Runtime Posture')).toBeInTheDocument();
    expect(screen.getByText('Playwright node (playwright)')).toBeInTheDocument();
    expect(screen.getByText('Chrome · Headed')).toBeInTheDocument();
    expect(screen.getByText('Search profile · en-US · America/New_York')).toBeInTheDocument();
    expect(screen.getByText('Brightdata · Sticky · Applied · proxy.local:8080')).toBeInTheDocument();
    expect(screen.getByText('Loaded sticky state')).toBeInTheDocument();
  });
});
