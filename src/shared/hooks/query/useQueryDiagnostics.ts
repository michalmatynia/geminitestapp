"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, type QueryClient, type Query } from "@tanstack/react-query";

export type QueryDiagnosticsItem = {
  key: readonly unknown[];
  keyString: string;
  status: string;
  fetchStatus: string;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  observers: number;
  isInvalidated: boolean;
  isStale: boolean;
  dataSize: number | null;
};

type UseQueryDiagnosticsOptions = {
  enabled?: boolean;
};

const buildSnapshot = (queryClient: QueryClient): QueryDiagnosticsItem[] => {
  const cache = queryClient.getQueryCache();
  return cache
    .getAll()
    .map((query: Query): QueryDiagnosticsItem => {
      const key = query.queryKey;
      const keyString = JSON.stringify(key);
      const dataUpdatedAt = query.state.dataUpdatedAt;
      const errorUpdatedAt = query.state.errorUpdatedAt;
      const observers = query.getObserversCount();
      const isInvalidated = Boolean(query.state.isInvalidated);
      const isStale =
        typeof (query as unknown as { isStale: () => boolean }).isStale === "function"
          ? (query as unknown as { isStale: () => boolean }).isStale()
          : isInvalidated;
      let dataSize: number | null = null;
      if (query.state.data !== undefined) {
        try {
          dataSize = JSON.stringify(query.state.data).length;
        } catch {
          dataSize = null;
        }
      }
      return {
        key,
        keyString,
        status: query.state.status,
        fetchStatus: query.state.fetchStatus,
        dataUpdatedAt,
        errorUpdatedAt,
        observers,
        isInvalidated,
        isStale,
        dataSize,
      };
    })
    // Keep the snapshot stable so we can skip no-op updates.
    .sort((a: QueryDiagnosticsItem, b: QueryDiagnosticsItem) =>
      a.keyString.localeCompare(b.keyString)
    );
};

const snapshotsEqual = (
  a: QueryDiagnosticsItem[],
  b: QueryDiagnosticsItem[]
): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (left.keyString !== right.keyString) return false;
    if (left.status !== right.status) return false;
    if (left.fetchStatus !== right.fetchStatus) return false;
    if (left.dataUpdatedAt !== right.dataUpdatedAt) return false;
    if (left.errorUpdatedAt !== right.errorUpdatedAt) return false;
    if (left.observers !== right.observers) return false;
    if (left.isInvalidated !== right.isInvalidated) return false;
    if (left.isStale !== right.isStale) return false;
    if (left.dataSize !== right.dataSize) return false;
  }
  return true;
};

export function useQueryDiagnostics(): {
  queries: QueryDiagnosticsItem[];
  invalidate: (key: readonly unknown[]) => void;
  refetch: (key: readonly unknown[]) => void;
  remove: (key: readonly unknown[]) => void;
  clearAll: () => void;
  invalidateAll: () => void;
  refetchAll: () => void;
};

export function useQueryDiagnostics(options?: UseQueryDiagnosticsOptions): {
  queries: QueryDiagnosticsItem[];
  invalidate: (key: readonly unknown[]) => void;
  refetch: (key: readonly unknown[]) => void;
  remove: (key: readonly unknown[]) => void;
  clearAll: () => void;
  invalidateAll: () => void;
  refetchAll: () => void;
};

export function useQueryDiagnostics(
  options: UseQueryDiagnosticsOptions = {}
): {
  queries: QueryDiagnosticsItem[];
  invalidate: (key: readonly unknown[]) => void;
  refetch: (key: readonly unknown[]) => void;
  remove: (key: readonly unknown[]) => void;
  clearAll: () => void;
  invalidateAll: () => void;
  refetchAll: () => void;
} {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const [queries, setQueries] = useState<QueryDiagnosticsItem[]>(() =>
    enabled ? buildSnapshot(queryClient) : []
  );
  const pendingUpdateRef = useRef(false);

  useEffect((): () => void => {
    if (!enabled) return () => {};

    const cache = queryClient.getQueryCache();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const update = (): void => {
      if (pendingUpdateRef.current) return;
      pendingUpdateRef.current = true;
      timeoutId = setTimeout(() => {
        pendingUpdateRef.current = false;
        const snapshot = buildSnapshot(queryClient);
        setQueries((prev: QueryDiagnosticsItem[]) => (snapshotsEqual(prev, snapshot) ? prev : snapshot));
      }, 0);
    };
    const unsubscribe = cache.subscribe(update);
    const intervalId = setInterval(update, 5000);
    update();
    return (): void => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [enabled, queryClient]);

  const actions = useMemo(
    () => ({
      invalidate: (key: readonly unknown[]): void => {
        void queryClient.invalidateQueries({ queryKey: key });
      },
      refetch: (key: readonly unknown[]): void => {
        void queryClient.refetchQueries({ queryKey: key });
      },
      remove: (key: readonly unknown[]): void => {
        queryClient.removeQueries({ queryKey: key });
      },
      clearAll: (): void => {
        queryClient.clear();
      },
      invalidateAll: (): void => {
        void queryClient.invalidateQueries();
      },
      refetchAll: (): void => {
        void queryClient.refetchQueries();
      },
    }),
    [queryClient]
  );

  return { queries, ...actions };
}
