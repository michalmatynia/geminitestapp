"use client";

import { useEffect, useState } from "react";
import type { ImageRetryPreset } from "@/features/data-import-export/types/imports";
import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from "@/features/data-import-export/utils/image-retry-presets";

export const useImageRetryPresets = () => {
  const [presets, setPresets] = useState<ImageRetryPreset[]>(
    getDefaultImageRetryPresets()
  );

  useEffect(() => {
    let active = true;
    const loadPresets = async () => {
      try {
        const res = await fetch("/api/integrations/exports/base/image-retry-presets");
        const payload = (await res.json()) as { presets?: ImageRetryPreset[] };
        if (!res.ok) return;
        if (payload.presets && active) {
          setPresets(normalizeImageRetryPresets(payload.presets));
        }
      } catch (_error) {
        // Keep defaults on failure.
      }
    };
    void loadPresets();
    return () => {
      active = false;
    };
  }, []);

  return presets;
};
