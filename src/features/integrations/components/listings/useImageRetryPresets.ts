'use client';

import type { ImageRetryPreset } from '@/features/data-import-export';
import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from '@/features/data-import-export';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const useImageRetryPresets = (): ImageRetryPreset[] => {
  const { data: presets = getDefaultImageRetryPresets() } = createListQueryV2<
    ImageRetryPreset[],
    ImageRetryPreset[]
  >({
    queryKey: QUERY_KEYS.integrations.imageRetryPresets(),
    queryFn: async ({ signal }): Promise<ImageRetryPreset[]> => {
      const payload = await api.get<{ presets?: ImageRetryPreset[] }>(
        '/api/integrations/exports/base/image-retry-presets',
        { signal }
      );
      return payload.presets ? normalizeImageRetryPresets(payload.presets) : getDefaultImageRetryPresets();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'integrations.hooks.image-retry-presets',
      operation: 'list',
      resource: 'integrations.image-retry-presets',
      domain: 'integrations',
      tags: ['integrations', 'image-retry-presets'],
    },
  });

  return presets;
};
