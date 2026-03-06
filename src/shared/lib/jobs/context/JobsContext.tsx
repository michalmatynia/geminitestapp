'use client';

import React, { useState, useMemo, type ReactNode } from 'react';

import type { TraderaQueueHealthResponse } from '@/shared/lib/jobs/api';
import {
  useCancelListingMutation,
  useChatbotJobMutation,
  useClearChatbotJobsMutation,
} from '@/shared/lib/jobs/hooks/useJobMutations';
import {
  useIntegrationJobs,
  useChatbotJobs,
  useTraderaQueueHealth,
} from '@/shared/lib/jobs/hooks/useJobQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { ListingJob, ProductJob } from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type ChatbotJob = {
  id: string;
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  model: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  payload?: unknown;
};

type SelectedListing = { job: ProductJob; listing: ListingJob } | null;

interface JobsStateContextType {
  // Product Listing Jobs
  listingJobs: ProductJob[];
  listingJobsLoading: boolean;
  listingJobsRefreshing: boolean;
  listingJobsError: Error | null;
  traderaQueueHealth: TraderaQueueHealthResponse | null;
  traderaQueueHealthLoading: boolean;

  // Chatbot Jobs
  chatbotJobs: ChatbotJob[];
  chatbotJobsLoading: boolean;
  chatbotJobsRefreshing: boolean;
  chatbotJobsError: Error | null;
  isClearingChatbotJobs: boolean;

  // UI State - Filtering & Pagination
  query: string;
  page: number;
  pageSize: number;

  // Selected Job Details
  selectedListing: SelectedListing;
}

interface JobsActionsContextType {
  refetchListingJobs: () => Promise<unknown>;
  refetchChatbotJobs: () => Promise<unknown>;
  setQuery: (query: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSelectedListing: (selection: SelectedListing) => void;

  // Actions
  handleCancelListing: (productId: string, listingId: string) => Promise<void>;
  isCancellingListing: (listingId: string) => boolean;

  handleCancelChatbotJob: (jobId: string) => Promise<void>;
  isCancellingChatbotJob: (jobId: string) => boolean;

  handleClearCompletedChatbotJobs: () => void;

  // Confirmation
  confirmCancelListing: (productId: string, listingId: string) => void;
  ConfirmationModal: React.FC;
}

export const { Context: JobsStateContext, useStrictContext: useJobsState } =
  createStrictContext<JobsStateContextType>({
    hookName: 'useJobsState',
    providerName: 'a JobsProvider',
    displayName: 'JobsStateContext',
    errorFactory: internalError,
  });

export const { Context: JobsActionsContext, useStrictContext: useJobsActions } =
  createStrictContext<JobsActionsContextType>({
    hookName: 'useJobsActions',
    providerName: 'a JobsProvider',
    displayName: 'JobsActionsContext',
    errorFactory: internalError,
  });

export function JobsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  // --- Product Listing Jobs ---
  const listingJobsQuery = useIntegrationJobs();
  const listingJobs = useMemo(
    () => (listingJobsQuery.data as ProductJob[]) || [],
    [listingJobsQuery.data]
  );
  const traderaQueueHealthQuery = useTraderaQueueHealth();
  const cancelListingMutation = useCancelListingMutation();

  // --- Chatbot Jobs ---
  const chatbotJobsQuery = useChatbotJobs('all');
  const chatbotJobs = useMemo((): ChatbotJob[] => {
    const data = chatbotJobsQuery.data as { jobs?: ChatbotJob[] } | undefined;
    return data?.jobs || [];
  }, [chatbotJobsQuery.data]);

  const chatbotMutation = useChatbotJobMutation();
  const clearChatbotMutation = useClearChatbotJobsMutation();

  const { confirm, ConfirmationModal } = useConfirm();

  // --- Shared UI State ---
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedListing, setSelectedListing] = useState<SelectedListing>(null);

  // --- Handlers ---
  const handleCancelListing = async (productId: string, listingId: string): Promise<void> => {
    try {
      await cancelListingMutation.mutateAsync({ productId, listingId });
    } catch (err: unknown) {
      logClientError(err, {
        context: { source: 'JobsContext', action: 'cancelListing', productId, listingId },
      });
    }
  };

  const confirmCancelListing = (productId: string, listingId: string): void => {
    confirm({
      title: 'Cancel Listing?',
      message: 'Cancel this listing job? This will remove it from the queue.',
      confirmText: 'Cancel Job',
      isDangerous: true,
      onConfirm: () => handleCancelListing(productId, listingId),
    });
  };

  const handleCancelChatbotJob = async (jobId: string): Promise<void> => {
    try {
      await chatbotMutation.mutateAsync({ jobId, action: 'cancel' });
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'JobsContext', action: 'cancelChatbotJob', jobId },
      });
    }
  };

  const handleClearCompletedChatbotJobs = () => {
    clearChatbotMutation.mutate({ scope: 'completed' });
  };

  const stateValue = useMemo<JobsStateContextType>(
    () => ({
      listingJobs,
      listingJobsLoading: listingJobsQuery.isLoading,
      listingJobsRefreshing: listingJobsQuery.isFetching,
      listingJobsError: listingJobsQuery.error,
      traderaQueueHealth: traderaQueueHealthQuery.data ?? null,
      traderaQueueHealthLoading: traderaQueueHealthQuery.isLoading,
      chatbotJobs,
      chatbotJobsLoading: chatbotJobsQuery.isLoading,
      chatbotJobsRefreshing: chatbotJobsQuery.isFetching,
      chatbotJobsError: chatbotJobsQuery.error,
      isClearingChatbotJobs: clearChatbotMutation.isPending,
      query,
      page,
      pageSize,
      selectedListing,
    }),
    [
      listingJobs,
      listingJobsQuery.isLoading,
      listingJobsQuery.isFetching,
      listingJobsQuery.error,
      traderaQueueHealthQuery.data,
      traderaQueueHealthQuery.isLoading,
      chatbotJobs,
      chatbotJobsQuery.isLoading,
      chatbotJobsQuery.isFetching,
      chatbotJobsQuery.error,
      clearChatbotMutation.isPending,
      query,
      page,
      pageSize,
      selectedListing,
    ]
  );

  const actionsValue = useMemo<JobsActionsContextType>(
    () => ({
      refetchListingJobs: async () => {
        await listingJobsQuery.refetch();
      },
      refetchChatbotJobs: async () => {
        await chatbotJobsQuery.refetch();
      },
      setQuery,
      setPage,
      setPageSize,
      setSelectedListing,
      handleCancelListing,
      isCancellingListing: (id) =>
        cancelListingMutation.isPending && cancelListingMutation.variables?.listingId === id,
      handleCancelChatbotJob,
      isCancellingChatbotJob: (id) =>
        chatbotMutation.isPending && chatbotMutation.variables?.jobId === id,
      handleClearCompletedChatbotJobs,
      confirmCancelListing,
      ConfirmationModal,
    }),
    [
      listingJobsQuery,
      chatbotJobsQuery,
      handleCancelListing,
      cancelListingMutation.isPending,
      cancelListingMutation.variables,
      handleCancelChatbotJob,
      chatbotMutation.isPending,
      chatbotMutation.variables,
      handleClearCompletedChatbotJobs,
      confirmCancelListing,
      ConfirmationModal,
    ]
  );

  return (
    <JobsActionsContext.Provider value={actionsValue}>
      <JobsStateContext.Provider value={stateValue}>{children}</JobsStateContext.Provider>
    </JobsActionsContext.Provider>
  );
}
