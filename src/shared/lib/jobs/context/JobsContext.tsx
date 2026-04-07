'use client';

import React, { useState, useMemo, type ReactNode } from 'react';

import type { ChatbotJob } from '@/shared/contracts/chatbot';
import type { ListingJob, ProductJob } from '@/shared/contracts/integrations/domain';
import type { TraderaQueueHealthResponse } from '@/shared/contracts/jobs';
import { internalError } from '@/shared/errors/app-error';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
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
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

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
  refetchListingJobs: () => Promise<void>;
  refetchChatbotJobs: () => Promise<void>;
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
  const listingJobs = useMemo(() => listingJobsQuery.data ?? [], [listingJobsQuery.data]);
  const traderaQueueHealthQuery = useTraderaQueueHealth();
  const cancelListingMutation = useCancelListingMutation();

  // --- Chatbot Jobs ---
  const chatbotJobsQuery = useChatbotJobs('all');
  const chatbotJobs = useMemo((): ChatbotJob[] => chatbotJobsQuery.data?.jobs ?? [], [
    chatbotJobsQuery.data,
  ]);

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
      logClientCatch(err, { source: 'JobsContext', action: 'cancelListing', productId, listingId });
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
      logClientCatch(error, { source: 'JobsContext', action: 'cancelChatbotJob', jobId });
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
      listingJobsError: (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
        listingJobsQuery.error instanceof Error ? listingJobsQuery.error : null
      ) as Error | null,
      traderaQueueHealth: traderaQueueHealthQuery.data ?? null,
      traderaQueueHealthLoading: traderaQueueHealthQuery.isLoading,
      chatbotJobs,
      chatbotJobsLoading: chatbotJobsQuery.isLoading,
      chatbotJobsRefreshing: chatbotJobsQuery.isFetching,
      chatbotJobsError: (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
        chatbotJobsQuery.error instanceof Error ? chatbotJobsQuery.error : null
      ) as Error | null,
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
