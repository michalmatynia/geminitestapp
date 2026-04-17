// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

import {
  useCreateStudioSlots,
  useDeleteStudioSlot,
  useImportStudioAssetsFromDrive,
  useUpdateStudioSlot,
  useUploadStudioAssets,
} from '../useImageStudioMutations';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const useSlotsProviderMutations = (projectId: string) => ({
  createSlots: useCreateStudioSlots(projectId),
  updateSlot: useUpdateStudioSlot(projectId),
  deleteSlot: useDeleteStudioSlot(projectId),
  uploadAssets: useUploadStudioAssets(projectId),
  importAssets: useImportStudioAssetsFromDrive(projectId),
});

describe('image studio mutation hooks', () => {
  it('preserves hook order across SlotsProvider-style rerenders', () => {
    const queryClient = createQueryClient();
    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) => useSlotsProviderMutations(projectId),
      {
        initialProps: { projectId: '' },
        wrapper: createWrapper(queryClient),
      }
    );

    expect(result.current.deleteSlot.mutateAsync).toEqual(expect.any(Function));

    rerender({ projectId: 'project-a' });
    expect(result.current.updateSlot.mutateAsync).toEqual(expect.any(Function));

    rerender({ projectId: 'project-b' });
    expect(result.current.importAssets.mutateAsync).toEqual(expect.any(Function));
  });
});
