/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useSavePreferenceMutation,
  useTemplateMutation,
} from '@/features/data-import-export/hooks/useImportQueries';
import { useCsvImportMutation } from '@/features/data-import-export/hooks/useImportMutations';
import { api } from '@/shared/lib/api-client';

const uploadWithProgressMock = vi.fn();

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/shared/utils/upload-with-progress', () => ({
  uploadWithProgress: (...args: unknown[]) => uploadWithProgressMock(...args),
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('data import export mutation hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useSavePreferenceMutation posts the centralized template preference payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ templateId: 'tpl-1' } as never);

    const { result } = renderHook(() => useSavePreferenceMutation(), { wrapper });
    const response = await result.current.mutateAsync({
      endpoint: '/api/v2/integrations/imports/base/last-template',
      data: { templateId: 'tpl-1' },
    });

    expect(response.templateId).toBe('tpl-1');
    expect(api.post).toHaveBeenCalledWith('/api/v2/integrations/imports/base/last-template', {
      templateId: 'tpl-1',
    });
  });

  it('useTemplateMutation posts the centralized template payload', async () => {
    vi.mocked(api.post).mockResolvedValue({
      id: 'tpl-1',
      name: 'Import Template',
      description: null,
      mappings: [{ sourceKey: 'sku', targetField: 'sku' }],
      createdAt: '2026-03-11T12:00:00.000Z',
      updatedAt: '2026-03-11T12:01:00.000Z',
    } as never);

    const { result } = renderHook(() => useTemplateMutation('import'), { wrapper });
    const response = await result.current.mutateAsync({
      data: {
        name: 'Import Template',
        mappings: [{ sourceKey: 'sku', targetField: 'sku' }],
      },
    });

    expect('name' in response && response.name).toBe('Import Template');
    expect(api.post).toHaveBeenCalledWith('/api/v2/templates/import', {
      name: 'Import Template',
      mappings: [{ sourceKey: 'sku', targetField: 'sku' }],
    });
  });

  it('useCsvImportMutation returns the centralized csv import response payload', async () => {
    uploadWithProgressMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        message: 'CSV import completed',
        summary: {
          total: 2,
          successful: 2,
          failed: 0,
          errors: [],
        },
      },
      raw: '{"message":"CSV import completed"}',
    });

    const { result } = renderHook(() => useCsvImportMutation(), { wrapper });
    let response:
      | Awaited<ReturnType<typeof result.current.mutateAsync>>
      | undefined;

    await act(async () => {
      response = await result.current.mutateAsync({
        file: new File(['sku,name\nABC,Test'], 'products.csv', { type: 'text/csv' }),
      });
    });

    expect(response?.summary.successful).toBe(2);
    expect(uploadWithProgressMock).toHaveBeenCalledWith('/api/v2/products/import/csv', {
      formData: expect.any(FormData),
      onProgress: undefined,
    });
  });
});
