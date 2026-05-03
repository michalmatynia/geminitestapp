/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductFormStudioController } from './ProductFormStudioContext.controller';

const { apiGetMock, apiPutMock, toastMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductSettings', () => ({
  useProductSettings: () => ({ defaultProjectId: 'studio-project-1' }),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    put: (...args: unknown[]) => apiPutMock(...args),
  },
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const product = { id: 'product-1' } as never;

const createConfigResponse = (projectId: string | null) => ({
  config: {
    projectId,
    sourceSlotByImageIndex: {},
    sourceSlotHistoryByImageIndex: {},
    updatedAt: '2026-04-30T10:00:00.000Z',
  },
});

describe('useProductFormStudioController', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiPutMock.mockReset();
    toastMock.mockReset();
    apiGetMock.mockResolvedValue(createConfigResponse('studio-project-1'));
    apiPutMock.mockResolvedValue(createConfigResponse('studio-project-2'));
  });

  it('does not autosave unchanged Studio project ids', async () => {
    const { result } = renderHook(() => useProductFormStudioController(product));

    await waitFor(() => {
      expect(result.current.stateValue.studioProjectId).toBe('studio-project-1');
    });

    act(() => {
      result.current.actionsValue.setStudioProjectId(' studio-project-1 ');
    });

    expect(apiPutMock).not.toHaveBeenCalled();
  });

  it('autosaves normalized project id changes once', async () => {
    const { result } = renderHook(() => useProductFormStudioController(product));

    await waitFor(() => {
      expect(result.current.stateValue.studioProjectId).toBe('studio-project-1');
    });

    act(() => {
      result.current.actionsValue.setStudioProjectId(' studio-project-2 ');
    });

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    expect(apiPutMock).toHaveBeenCalledWith(
      '/api/v2/products/product-1/studio',
      { projectId: 'studio-project-2' },
      { logError: false }
    );
  });
});
