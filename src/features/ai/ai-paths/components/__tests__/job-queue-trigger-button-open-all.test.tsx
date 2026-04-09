// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import {
  listOptimisticAiPathRuns,
  rememberOptimisticAiPathRun,
  removeOptimisticAiPathRuns,
} from '@/shared/lib/ai-paths/optimistic-run-queue';
import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';
import {
  clearRecentAiPathRunEnqueue,
  notifyAiPathRunEnqueued,
} from '@/shared/lib/query-invalidation';

const mocks = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  fireAiPathTriggerEventMock: vi.fn(),
  getAiPathRunMock: vi.fn(),
  useAiPathsTriggerButtonsQueryMock: vi.fn(),
  toastMock: vi.fn(),
  createListQueryV2Mock: vi.fn(),
  createMutationV2Mock: vi.fn(),
  createDeleteMutationV2Mock: vi.fn(),
  refetchSettingsMock: vi.fn(),
  refetchRunsMock: vi.fn(),
  refetchQueueStatusMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: mocks.usePathnameMock as typeof import('next/navigation').usePathname,
}));

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent', () => ({
  useAiPathTriggerEvent: () => ({
    fireAiPathTriggerEvent: mocks.fireAiPathTriggerEventMock,
  }),
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  getAiPathRun: (...args: unknown[]) => mocks.getAiPathRunMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathQueries', () => ({
  useAiPathsTriggerButtonsQuery: (...args: unknown[]) =>
    mocks.useAiPathsTriggerButtonsQueryMock(...args),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2:
    mocks.createListQueryV2Mock as typeof import('@/shared/lib/query-factories-v2').createListQueryV2,
  createMutationV2:
    mocks.createMutationV2Mock as typeof import('@/shared/lib/query-factories-v2').createMutationV2,
  createDeleteMutationV2:
    mocks.createDeleteMutationV2Mock as typeof import('@/shared/lib/query-factories-v2').createDeleteMutationV2,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  ToggleRow: ({
    checked,
    disabled,
    label,
    onCheckedChange,
  }: {
    checked: boolean;
    disabled?: boolean;
    label: string;
    onCheckedChange: (next: boolean) => void;
  }) => (
    <button type='button' disabled={disabled} onClick={() => onCheckedChange(!checked)}>
      {label}
    </button>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  StatusBadge: ({ label, status }: { label?: string; status: string }) => (
    <span>{label ?? status}</span>
  ),
  useToast: () => ({ toast: mocks.toastMock }),
}));

import { JobQueueProvider, useJobQueueState } from '../JobQueueContext';

const BUTTON = {
  id: 'button-product-row',
  name: 'Trigger',
  iconId: null,
  locations: ['product_row'],
  mode: 'click',
  display: {
    label: 'Trigger',
  },
  pathId: 'path-product',
  enabled: true,
  sortIndex: 0,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
} satisfies AiTriggerButtonRecord;

const RUN = {
  id: 'run-triggered-1',
  pathId: 'path-product',
  pathName: 'Product Path',
  status: 'queued',
  createdAt: '2026-03-09T12:00:00.000Z',
  updatedAt: '2026-03-09T12:00:00.000Z',
  entityId: 'product-1',
  entityType: 'product',
  triggerEvent: 'button-product-row',
  triggerNodeId: 'trigger-node-1',
  requestId: 'request-1',
  meta: { source: 'trigger_button' },
} satisfies AiPathRunRecord;

function QueueRunsProbe(): React.JSX.Element {
  const { runs } = useJobQueueState();
  return <div data-testid='run-ids'>{runs.map((run) => run.id).join(',') || 'empty'}</div>;
}

describe('Job Queue open-after-trigger flow', () => {
  beforeEach(() => {
    mocks.usePathnameMock.mockReset();
    mocks.fireAiPathTriggerEventMock.mockReset();
    mocks.getAiPathRunMock.mockReset();
    mocks.useAiPathsTriggerButtonsQueryMock.mockReset();
    mocks.toastMock.mockReset();
    mocks.createListQueryV2Mock.mockReset();
    mocks.createMutationV2Mock.mockReset();
    mocks.createDeleteMutationV2Mock.mockReset();
    mocks.refetchSettingsMock.mockReset();
    mocks.refetchRunsMock.mockReset();
    mocks.refetchQueueStatusMock.mockReset();

    mocks.usePathnameMock.mockReturnValue('/admin/ai-paths/queue');
    mocks.useAiPathsTriggerButtonsQueryMock.mockReturnValue({
      data: [BUTTON],
      isLoading: false,
    });
    mocks.refetchSettingsMock.mockResolvedValue(undefined);
    mocks.refetchRunsMock.mockResolvedValue(undefined);
    mocks.refetchQueueStatusMock.mockResolvedValue(undefined);

    mocks.createListQueryV2Mock.mockImplementation((config: { queryKey?: unknown }) => {
      const queryKey = JSON.stringify(config?.queryKey ?? []);
      if (queryKey.includes('"settings"')) {
        return {
          data: [],
          isLoading: false,
          error: null,
          refetch: mocks.refetchSettingsMock,
        };
      }
      if (queryKey.includes('"job-queue"')) {
        return {
          data: { runs: [], total: 0 },
          isLoading: false,
          error: null,
          refetch: mocks.refetchRunsMock,
        };
      }
      return {
        data: {
          status: {
            queuedCount: 0,
            activeRuns: 0,
            waitingCount: 0,
            delayedCount: 0,
            failedCount: 0,
            queueLagMs: 0,
            throughputPerMinute: 0,
          },
        },
        isLoading: false,
        error: null,
        refetch: mocks.refetchQueueStatusMock,
      };
    });

    const baseMutationValue = {
      isPending: false,
      variables: undefined,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    };
    mocks.createMutationV2Mock.mockReturnValue(baseMutationValue);
    mocks.createDeleteMutationV2Mock.mockReturnValue(baseMutationValue);
    mocks.getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          id: RUN.id,
          status: 'completed',
          createdAt: RUN.createdAt,
          updatedAt: RUN.updatedAt,
          finishedAt: RUN.updatedAt,
        },
      },
    });

    mocks.fireAiPathTriggerEventMock.mockImplementation(
      async (args: { onSuccess?: (runId: string) => void }) => {
        rememberOptimisticAiPathRun(RUN);
        notifyAiPathRunEnqueued(RUN.id, {
          entityId: RUN.entityId,
          entityType: RUN.entityType,
          run: RUN,
        });
        args.onSuccess?.(RUN.id);
      }
    );
  });

  afterEach(() => {
    removeOptimisticAiPathRuns(listOptimisticAiPathRuns().map((run) => run.id));
    clearRecentAiPathRunEnqueue();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('shows the queued run immediately when the global queue view opens after a trigger click', async () => {
    const triggerView = render(
      <TriggerButtonBar location='product_row' entityType='product' entityId='product-1' />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));

    await waitFor(() => {
      expect(mocks.fireAiPathTriggerEventMock).toHaveBeenCalledTimes(1);
    });

    triggerView.unmount();

    render(
      <JobQueueProvider visibility='global' isActive>
        <QueueRunsProbe />
      </JobQueueProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-ids')).toHaveTextContent('run-triggered-1');
    });

    expect(mocks.refetchRunsMock).toHaveBeenCalledTimes(1);
    expect(mocks.refetchQueueStatusMock).toHaveBeenCalledTimes(1);
  });
});
