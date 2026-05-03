'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  type ReactNode,
  useCallback,
} from 'react';

import {
  useFileUploadEvents,
  type FileUploadEventRecord,
} from '@/features/files/hooks/useFileUploadEvents';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useToast } from '@/shared/ui/primitives.public';

export const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
] as const;

type StatusType = (typeof statusOptions)[number]['value'];

interface FileUploadEventsContextState {
  status: StatusType;
  category: string;
  projectId: string;
  query: string;
  fromDate: string;
  toDate: string;
  page: number;
  pageSize: number;
  events: FileUploadEventRecord[];
  total: number;
  totalPages: number;
  isFetching: boolean;
}

interface FileUploadEventsContextActions {
  setStatus: (val: StatusType) => void;
  setCategory: (val: string) => void;
  setProjectId: (val: string) => void;
  setQuery: (val: string) => void;
  setFromDate: (val: string) => void;
  setToDate: (val: string) => void;
  setPage: (val: number) => void;
  setPageSize: (val: number) => void;
  handleResetFilters: () => void;
  refetch: () => Promise<unknown>;
}

type FileUploadEventsContextValue = FileUploadEventsContextState & FileUploadEventsContextActions;

const {
  Context: FileUploadEventsStateContext,
  useStrictContext: useFileUploadEventsStateContext,
} = createStrictContext<FileUploadEventsContextState>({
  hookName: 'useFileUploadEventsState',
  providerName: 'a FileUploadEventsProvider',
  errorFactory: internalError,
});

const {
  Context: FileUploadEventsActionsContext,
  useStrictContext: useFileUploadEventsActionsContext,
} = createStrictContext<FileUploadEventsContextActions>({
  hookName: 'useFileUploadEventsActions',
  providerName: 'a FileUploadEventsProvider',
  errorFactory: internalError,
});

export function FileUploadEventsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusType>('all');
  const [category, setCategory] = useState('');
  const [projectId, setProjectId] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      status,
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(projectId.trim() ? { projectId: projectId.trim() } : {}),
      ...(query.trim() ? { query: query.trim() } : {}),
      from: fromDate || null,
      to: toDate || null,
    }),
    [page, pageSize, status, category, projectId, query, fromDate, toDate]
  );

  const eventsQuery = useFileUploadEvents(filters);

  useEffect(() => {
    if (eventsQuery.error) {
      toast(eventsQuery.error.message, { variant: 'error' });
    }
  }, [eventsQuery.error, toast]);

  const events = useMemo(() => eventsQuery.data?.events ?? [], [eventsQuery.data]);
  const total = eventsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleResetFilters = useCallback((): void => {
    setStatus('all');
    setCategory('');
    setProjectId('');
    setQuery('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }, []);

  const stateValue = useMemo(
    (): FileUploadEventsContextState => ({
      status,
      category,
      projectId,
      query,
      fromDate,
      toDate,
      page,
      pageSize,
      events,
      total,
      totalPages,
      isFetching: eventsQuery.isFetching,
    }),
    [
      status,
      category,
      projectId,
      query,
      fromDate,
      toDate,
      page,
      pageSize,
      events,
      total,
      totalPages,
      eventsQuery.isFetching,
    ]
  );
  const actionsValue = useMemo(
    (): FileUploadEventsContextActions => ({
      setStatus,
      setCategory,
      setProjectId,
      setQuery,
      setFromDate,
      setToDate,
      setPage,
      setPageSize,
      handleResetFilters,
      refetch: eventsQuery.refetch,
    }),
    [eventsQuery.refetch, handleResetFilters]
  );

  return (
    <FileUploadEventsActionsContext.Provider value={actionsValue}>
      <FileUploadEventsStateContext.Provider value={stateValue}>
        {children}
      </FileUploadEventsStateContext.Provider>
    </FileUploadEventsActionsContext.Provider>
  );
}

export const useFileUploadEventsState = useFileUploadEventsStateContext;
export const useFileUploadEventsActions = useFileUploadEventsActionsContext;

export function useFileUploadEventsContext(): FileUploadEventsContextValue {
  const state = useFileUploadEventsState();
  const actions = useFileUploadEventsActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
