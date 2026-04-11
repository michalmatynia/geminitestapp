'use client';

'use no memo';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import {
  buildProductScanRunFeedbackFromRecord,
  resolveProductScanFeedbackAgeMs,
  type ProductScanRunFeedback,
} from '@/features/products/lib/product-scan-run-feedback';
import type { ProductScanListResponse, ProductScanRecord } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { safeClearInterval, safeSetInterval, type SafeTimerId } from '@/shared/lib/timers';

const ACTIVE_SCAN_POLL_INTERVAL_MS = 3_000;
const TERMINAL_SCAN_FEEDBACK_TTL_MS = 15_000;
const TERMINAL_SCAN_FEEDBACK_CLOCK_MS = 1_000;
const EMPTY_PRODUCT_SCAN_RUN_STATUS_BY_PRODUCT_ID = new Map<string, ProductScanRunFeedback>();

const areFeedbackMapsEqual = (
  left: ReadonlyMap<string, ProductScanRunFeedback>,
  right: ReadonlyMap<string, ProductScanRunFeedback>
): boolean => {
  if (left === right) return true;
  if (left.size !== right.size) return false;

  for (const [productId, nextFeedback] of right) {
    const prevFeedback = left.get(productId);
    if (!prevFeedback) {
      return false;
    }
    if (
      prevFeedback.scanId !== nextFeedback.scanId ||
      prevFeedback.status !== nextFeedback.status ||
      prevFeedback.updatedAt !== nextFeedback.updatedAt
    ) {
      return false;
    }
  }

  return true;
};

const normalizeProductIds = (productIds: readonly string[]): string[] =>
  Array.from(
    new Set(
      productIds
        .map((productId) => productId.trim())
        .filter((productId) => productId.length > 0)
    )
  ).sort();

const shouldShowTerminalFeedback = (
  scan: ProductScanRecord,
  now: number
): boolean =>
  resolveProductScanFeedbackAgeMs(scan, now) <= TERMINAL_SCAN_FEEDBACK_TTL_MS;

const buildProductScanRunStatusByProductId = (
  scans: readonly ProductScanRecord[],
  now: number
): ReadonlyMap<string, ProductScanRunFeedback> => {
  const next = new Map<string, ProductScanRunFeedback>();

  for (const scan of scans) {
    if (!isProductScanActiveStatus(scan.status) && !shouldShowTerminalFeedback(scan, now)) {
      continue;
    }
    next.set(scan.productId, buildProductScanRunFeedbackFromRecord(scan));
  }

  return next;
};

const resolveRefetchInterval = (scans: readonly ProductScanRecord[]): number | false => {
  if (scans.some((scan) => isProductScanActiveStatus(scan.status))) {
    return ACTIVE_SCAN_POLL_INTERVAL_MS;
  }
  return false;
};

export function useProductListScanRunSync({
  enabled = true,
  productIds,
}: {
  enabled?: boolean;
  productIds: readonly string[];
}): ReadonlyMap<string, ProductScanRunFeedback> {
  const normalizedProductIds = useMemo(() => normalizeProductIds(productIds), [productIds]);
  const productIdsKey = normalizedProductIds.join('\u0000');
  const [now, setNow] = useState(() => Date.now());
  const [productScanRunStatusByProductId, setProductScanRunStatusByProductId] = useState<
    ReadonlyMap<string, ProductScanRunFeedback>
  >(() => EMPTY_PRODUCT_SCAN_RUN_STATUS_BY_PRODUCT_ID);

  const scansQuery = useQuery<ProductScanListResponse>({
    queryKey: QUERY_KEYS.products.scansLatest(normalizedProductIds),
    enabled: enabled && normalizedProductIds.length > 0,
    queryFn: async () =>
      await api.get<ProductScanListResponse>('/api/v2/products/scans/latest', {
        cache: 'no-store',
        params: {
          productIds: normalizedProductIds.join(','),
        },
      }),
    staleTime: 1_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    refetchInterval: (query) =>
      resolveRefetchInterval(query.state.data?.scans ?? []),
  });

  useEffect(() => {
    setNow(Date.now());
  }, [scansQuery.dataUpdatedAt]);

  useEffect(() => {
    if (!enabled || normalizedProductIds.length === 0) {
      setProductScanRunStatusByProductId((current) =>
        current.size === 0 ? current : EMPTY_PRODUCT_SCAN_RUN_STATUS_BY_PRODUCT_ID
      );
      return;
    }

    const next = buildProductScanRunStatusByProductId(scansQuery.data?.scans ?? [], now);
    setProductScanRunStatusByProductId((current) =>
      areFeedbackMapsEqual(current, next) ? current : next
    );
  }, [enabled, now, productIdsKey, normalizedProductIds.length, scansQuery.data]);

  useEffect(() => {
    const scans = scansQuery.data?.scans ?? [];
    if (!enabled || normalizedProductIds.length === 0) {
      return;
    }

    if (
      !scans.some(
        (scan) => !isProductScanActiveStatus(scan.status) && shouldShowTerminalFeedback(scan, Date.now())
      )
    ) {
      return;
    }

    const timer: SafeTimerId = safeSetInterval(() => {
      setNow(Date.now());
    }, TERMINAL_SCAN_FEEDBACK_CLOCK_MS);

    return () => {
      safeClearInterval(timer);
    };
  }, [enabled, normalizedProductIds.length, scansQuery.dataUpdatedAt, productIdsKey, scansQuery.data]);

  return productScanRunStatusByProductId;
}
