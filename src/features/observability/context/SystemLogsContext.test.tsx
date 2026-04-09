// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  SystemLogsProvider,
  useSystemLogsActions,
  useSystemLogsState,
} from './SystemLogsContext';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/system-logs',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: () => '/admin/system-logs',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/features/observability/hooks/useLogMutations', () => ({
  useClearLogsMutation: () => ({ mutateAsync: vi.fn() }),
  useRebuildIndexesMutation: () => ({ mutateAsync: vi.fn() }),
  useRunLogInsight: () => ({ mutateAsync: vi.fn() }),
  useInterpretLog: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/features/observability/hooks/useLogQueries', () => ({
  useSystemLogs: () => ({
    data: { logs: [], total: 0 },
    error: null,
    refetch: vi.fn(),
  }),
  useSystemLogMetrics: () => ({
    data: { metrics: { levels: { error: 0, info: 0, warn: 0 } } },
    error: null,
    refetch: vi.fn(),
  }),
  useMongoDiagnostics: () => ({
    data: { collections: [], generatedAt: null },
    error: null,
    refetch: vi.fn(),
  }),
  useLogInsights: () => ({
    data: { items: [] },
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: vi.fn(),
    ConfirmationModal: () => null,
  }),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('SystemLogsContext', () => {
  it('provides state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SystemLogsProvider>{children}</SystemLogsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useSystemLogsActions(),
        state: useSystemLogsState(),
      }),
      { wrapper }
    );

    expect(result.current.state.level).toBe('all');
    expect(result.current.state.page).toBe(1);
    expect(Array.isArray(result.current.state.logs)).toBe(true);
    expect(result.current.state.totalPages).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(result.current.state.filterFields)).toBe(true);
    expect(result.current.actions.handleFilterChange).toBeTypeOf('function');
    expect(result.current.actions.handleResetFilters).toBeTypeOf('function');
    expect(result.current.actions.setPage).toBeTypeOf('function');
  });
});
