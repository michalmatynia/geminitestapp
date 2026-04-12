'use client';

import { useCallback, useEffect, useState } from 'react';

const PRODUCT_SCAN_1688_REVIEWED_STORAGE_KEY = 'product-scan-1688-reviewed-blocked-v1';
const MAX_REVIEWED_SCAN_IDS = 200;

const normalizeReviewedScanIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedIds = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue;
    }
    const normalized = entry.trim();
    if (normalized.length === 0) {
      continue;
    }
    normalizedIds.add(normalized);
  }

  return Array.from(normalizedIds).slice(-MAX_REVIEWED_SCAN_IDS);
};

const readReviewedBlockedScanIds = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(PRODUCT_SCAN_1688_REVIEWED_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    return normalizeReviewedScanIds(JSON.parse(rawValue));
  } catch {
    return [];
  }
};

const persistReviewedBlockedScanIds = (scanIds: string[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      PRODUCT_SCAN_1688_REVIEWED_STORAGE_KEY,
      JSON.stringify(normalizeReviewedScanIds(scanIds))
    );
  } catch {
    // Ignore localStorage persistence failures. This is operator convenience state only.
  }
};

export function useProductScan1688ReviewState(): {
  isBlockedScanReviewed: (scanId: string | null | undefined) => boolean;
  markBlockedScanReviewed: (scanId: string | null | undefined) => void;
  clearBlockedScanReviewed: (scanId: string | null | undefined) => void;
} {
  const [reviewedScanIds, setReviewedScanIds] = useState<string[]>([]);

  useEffect(() => {
    setReviewedScanIds(readReviewedBlockedScanIds());
  }, []);

  const isBlockedScanReviewed = useCallback(
    (scanId: string | null | undefined): boolean => {
      if (typeof scanId !== 'string' || scanId.trim().length === 0) {
        return false;
      }

      return reviewedScanIds.includes(scanId.trim());
    },
    [reviewedScanIds]
  );

  const markBlockedScanReviewed = useCallback((scanId: string | null | undefined): void => {
    if (typeof scanId !== 'string' || scanId.trim().length === 0) {
      return;
    }

    const normalizedScanId = scanId.trim();
    setReviewedScanIds((current) => {
      const next = normalizeReviewedScanIds([...current, normalizedScanId]);
      persistReviewedBlockedScanIds(next);
      return next;
    });
  }, []);

  const clearBlockedScanReviewed = useCallback((scanId: string | null | undefined): void => {
    if (typeof scanId !== 'string' || scanId.trim().length === 0) {
      return;
    }

    const normalizedScanId = scanId.trim();
    setReviewedScanIds((current) => {
      const next = current.filter((entry) => entry !== normalizedScanId);
      persistReviewedBlockedScanIds(next);
      return next;
    });
  }, []);

  return {
    isBlockedScanReviewed,
    markBlockedScanReviewed,
    clearBlockedScanReviewed,
  };
}
