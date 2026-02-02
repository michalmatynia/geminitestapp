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

const buildSnapshot = (queryClient: QueryClient): QueryDiagnosticsItem[] => {
  const cache = queryClient.getQueryCache();
  return cache.getAll().map((query: Query): QueryDiagnosticsItem => {
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
  });
};

export function useQueryDiagnostics(): {
  queries: QueryDiagnosticsItem[];
  invalidate: (key: readonly unknown[]) => void;
  refetch: (key: readonly unknown[]) => void;
  remove: (key: readonly unknown[]) => void;
  clearAll: () => void;
  invalidateAll: () => void;
  refetchAll: () => void;
} {
  const queryClient = useQueryClient();
  const [queries, setQueries] = useState<QueryDiagnosticsItem[]>(() =>
    buildSnapshot(queryClient)
  );
  const pendingUpdateRef = useRef(false);

  useEffect((): () => void => {
    const cache = queryClient.getQueryCache();
    const update = (): void => {
      if (pendingUpdateRef.current) return;
      pendingUpdateRef.current = true;
      setTimeout(() => {
        pendingUpdateRef.current = false;
        setQueries(buildSnapshot(queryClient));
      }, 0);
    };
    const unsubscribe = cache.subscribe(update);
    const intervalId = setInterval(update, 5000);
    update();
    return (): void => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [queryClient]);

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
