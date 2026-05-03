'use client';

import {
  type Dispatch,
  type SetStateAction,
  startTransition,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { loadProductColumns } from '@/features/products/components/list/product-columns-loader';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { scheduleDeferredProductListDraftBootstrap } from './productListStateHelpers';

const EMPTY_PRODUCT_TABLE_COLUMNS: ColumnDef<ProductWithImages>[] = [];

const subscribeToSearchParams = (callback: () => void): (() => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};

const getSearchParamsSnapshot = (): string =>
  typeof window !== 'undefined' ? window.location.search : '';

const getSearchParamsServerSnapshot = (): string => '';

const useStableSearchParams = (): URLSearchParams => {
  const search = useSyncExternalStore(
    subscribeToSearchParams,
    getSearchParamsSnapshot,
    getSearchParamsServerSnapshot
  );
  return useMemo(() => new URLSearchParams(search), [search]);
};

const useProductListRuntimeReadiness = (): {
  draftsReady: boolean;
  isMounted: boolean;
  rowRuntimeReady: boolean;
} => {
  const [isMounted, setIsMounted] = useState(false);
  const [draftsReady, setDraftsReady] = useState(false);
  const [rowRuntimeReady, setRowRuntimeReady] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return scheduleDeferredProductListDraftBootstrap(window, () => {
      setDraftsReady(true);
      setRowRuntimeReady(true);
    });
  }, []);

  return { draftsReady, isMounted, rowRuntimeReady };
};

const useProductTableColumns = (): {
  tableColumns: ColumnDef<ProductWithImages>[];
  tableColumnsReady: boolean;
} => {
  const [tableColumns, setTableColumns] = useState<ColumnDef<ProductWithImages>[]>(
    EMPTY_PRODUCT_TABLE_COLUMNS
  );
  const [tableColumnsReady, setTableColumnsReady] = useState(false);

  useEffect(() => {
    let isActive = true;
    void loadProductColumns()
      .then((nextColumns) => {
        if (isActive !== true) return;
        startTransition(() => {
          setTableColumns((currentColumns) =>
            currentColumns === nextColumns ? currentColumns : nextColumns
          );
          setTableColumnsReady(true);
        });
      })
      .catch((error) => {
        logClientCatch(error, {
          source: 'useProductListState',
          action: 'loadProductColumns',
        });
        if (isActive !== true) return;
        startTransition(() => {
          setTableColumnsReady(true);
        });
      });

    return (): void => {
      isActive = false;
    };
  }, []);

  return { tableColumns, tableColumnsReady };
};

export const useProductListRuntimeState = (): {
  draftsReady: boolean;
  isDebugOpen: boolean;
  isMounted: boolean;
  refreshTrigger: number;
  rowRuntimeReady: boolean;
  searchParams: URLSearchParams;
  setIsDebugOpen: (open: boolean) => void;
  setRefreshTrigger: Dispatch<SetStateAction<number>>;
  tableColumns: ColumnDef<ProductWithImages>[];
  tableColumnsReady: boolean;
} => {
  const searchParams = useStableSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const readiness = useProductListRuntimeReadiness();
  const table = useProductTableColumns();

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  return useMemo(
    () => ({ ...readiness, ...table, isDebugOpen, refreshTrigger, searchParams, setIsDebugOpen, setRefreshTrigger }),
    [isDebugOpen, readiness, refreshTrigger, searchParams, table]
  );
};
