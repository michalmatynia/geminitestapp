"use client";

import { useEffect, useState } from "react";
import type { ImageRetryPreset } from "@/types/product-imports";
import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from "@/lib/constants/image-retry-presets";

export const useImageRetryPresets = () => {
  const [presets, setPresets] = useState<ImageRetryPreset[]>(
    getDefaultImageRetryPresets()
  );

  useEffect(() => {
    let active = true;
    const loadPresets = async () => {
      try {
        const res = await fetch("/api/products/exports/base/image-retry-presets");
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
