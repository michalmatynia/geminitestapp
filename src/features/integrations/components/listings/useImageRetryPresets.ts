'use client';
import { useQuery } from '@tanstack/react-query';

import type { ImageRetryPreset } from '@/features/data-import-export';
import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from '@/features/data-import-export';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const useImageRetryPresets = (): ImageRetryPreset[] => {
  const { data: presets = getDefaultImageRetryPresets() } = useQuery({
    queryKey: QUERY_KEYS.integrations.imageRetryPresets(),
    queryFn: async (): Promise<ImageRetryPreset[]> => {
      const res = await fetch('/api/integrations/exports/base/image-retry-presets');
      if (!res.ok) return getDefaultImageRetryPresets();
      const payload = (await res.json()) as { presets?: ImageRetryPreset[] };
      return payload.presets ? normalizeImageRetryPresets(payload.presets) : getDefaultImageRetryPresets();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return presets;
};
