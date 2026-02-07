'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode, useCallback } from 'react';

import { useFileUploadEvents, type FileUploadEventRecord } from '@/features/files/hooks/useFileUploadEvents';
import { useToast } from '@/shared/ui';

export const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
] as const;

type StatusType = (typeof statusOptions)[number]['value'];

interface FileUploadEventsContextState {
  // State
  status: StatusType;
  category: string;
  projectId: string;
  query: string;
  fromDate: string;
  toDate: string;
  page: number;
  pageSize: number;

  // Data
  events: FileUploadEventRecord[];
  total: number;
  totalPages: number;
  isFetching: boolean;

  // Setters
  setStatus: (val: StatusType) => void;
  setCategory: (val: string) => void;
  setProjectId: (val: string) => void;
  setQuery: (val: string) => void;
  setFromDate: (val: string) => void;
  setToDate: (val: string) => void;
  setPage: (val: number) => void;

  // Actions
  handleResetFilters: () => void;
  refetch: () => Promise<unknown>;
}

const FileUploadEventsContext = createContext<FileUploadEventsContextState | undefined>(undefined);

export function FileUploadEventsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusType>('all');
  const [category, setCategory] = useState('');
  const [projectId, setProjectId] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

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

  const value = useMemo(() => ({
    status, category, projectId, query, fromDate, toDate, page, pageSize,
    events, total, totalPages, isFetching: eventsQuery.isFetching,
    setStatus, setCategory, setProjectId, setQuery, setFromDate, setToDate, setPage,
    handleResetFilters,
    refetch: eventsQuery.refetch,
  }), [
    status, category, projectId, query, fromDate, toDate, page, pageSize,
    events, total, totalPages, eventsQuery.isFetching, eventsQuery.refetch,
    handleResetFilters
  ]);

  return (
    <FileUploadEventsContext.Provider value={value}>
      {children}
    </FileUploadEventsContext.Provider>
  );
}

export function useFileUploadEventsContext(): FileUploadEventsContextState {
  const context = useContext(FileUploadEventsContext);
  if (context === undefined) {
    throw new Error('useFileUploadEventsContext must be used within a FileUploadEventsProvider');
  }
  return context;
}
