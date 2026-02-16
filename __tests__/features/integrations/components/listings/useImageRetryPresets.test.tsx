import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImageRetryPreset } from '@/features/data-import-export';
import { getDefaultImageRetryPresets } from '@/features/data-import-export';
import { useImageRetryPresets } from '@/features/integrations/components/listings/useImageRetryPresets';
import { api } from '@/shared/lib/api-client';

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useImageRetryPresets', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns normalized presets from API response', async () => {
    const serverPreset: ImageRetryPreset = {
      id: 'lower-quality',
      name: 'Custom Name',
      description: 'Custom Description',
      imageBase64Mode: 'base-only',
      transform: {
        forceJpeg: true,
        jpegQuality: 65,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ presets: [serverPreset] } as never);

    const { result } = renderHook(() => useImageRetryPresets(), { wrapper });

    await waitFor(() => expect(result.current).toHaveLength(1));

    expect(result.current[0]?.id).toBe('lower-quality');
    expect(result.current[0]?.transform.jpegQuality).toBe(65);
    expect(result.current[0]?.name).toBe('Lower JPEG quality (65)');
  });

  it('falls back to default presets when request fails', async () => {
    const defaults = getDefaultImageRetryPresets();
    vi.mocked(api.get).mockRejectedValue(new Error('network failure'));

    const { result } = renderHook(() => useImageRetryPresets(), { wrapper });

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    expect(result.current).toHaveLength(defaults.length);
    expect(result.current.map((preset) => preset.id)).toEqual(defaults.map((preset) => preset.id));
  });
});
