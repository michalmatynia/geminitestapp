/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, withKangurClientErrorMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  withKangurClientErrorMock: globalThis.__kangurClientErrorMocks().withKangurClientError,
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'pl',
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
}));

vi.mock('@/features/kangur/observability/client', () => ({
  isRecoverableKangurClientFetchError: () => false,
  withKangurClientError: withKangurClientErrorMock,
}));

import { createDefaultKangurLessonTemplates } from '@/features/kangur/lessons/lesson-template-defaults';
import { useKangurLessonTemplate } from '@/features/kangur/ui/hooks/useKangurLessonTemplates';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  return {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
};

describe('useKangurLessonTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiGetMock.mockImplementation(
      async (_url: string, options?: { params?: { componentId?: string } }) => {
        const templates = createDefaultKangurLessonTemplates('pl');
        const componentId = options?.params?.componentId;
        return componentId
          ? templates.filter((template) => template.componentId === componentId)
          : templates;
      }
    );
  });

  it('does not log a hook-order error when the component id appears after rerender', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(
        ({ componentId }: { componentId: 'adding' | null }) =>
          useKangurLessonTemplate(componentId, { enabled: true }),
        {
          initialProps: { componentId: null },
          wrapper,
        }
      );

      rerender({ componentId: 'adding' });

      await waitFor(() => {
        expect(result.current.data?.componentId).toBe('adding');
      });

      const hookOrderWarnings = consoleErrorSpy.mock.calls.filter((call) =>
        call.some(
          (arg) =>
            typeof arg === 'string' &&
            arg.includes('React has detected a change in the order of Hooks')
        )
      );

      expect(hookOrderWarnings).toHaveLength(0);
      expect(apiGetMock).toHaveBeenCalledTimes(1);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
