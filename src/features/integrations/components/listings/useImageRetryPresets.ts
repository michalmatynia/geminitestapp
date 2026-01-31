"use client";
import { useEffect, useState } from "react";
import type { ImageRetryPreset } from "@/features/data-import-export";
import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from "@/features/data-import-export";

export const useImageRetryPresets = (): ImageRetryPreset[] => {
  const [presets, setPresets] = useState<ImageRetryPreset[]>(
    getDefaultImageRetryPresets()
  );

  useEffect(() => {
    let active = true;
    const loadPresets = async (): Promise<void> => {
      try {
        const res = await fetch("/api/integrations/exports/base/image-retry-presets");
        const payload = (await res.json()) as { presets?: ImageRetryPreset[] };
        if (!res.ok) return;
        if (payload.presets && active) {
          setPresets(normalizeImageRetryPresets(payload.presets));
        }
      } catch (_error: unknown) {
        // Keep defaults on failure.
      }
    };
    void loadPresets();
    return (): void => {
      active = false;
    };
  }, []);

  return presets;
};
