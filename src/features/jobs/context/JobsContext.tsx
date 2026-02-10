'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

import { useCancelListingMutation, useChatbotJobMutation, useClearChatbotJobsMutation } from '@/features/jobs/hooks/useJobMutations';
import { useIntegrationJobs, useChatbotJobs } from '@/features/jobs/hooks/useJobQueries';
import { logClientError } from '@/features/observability';
import type { ListingJob, ProductJob } from '@/shared/types/domain/listing-jobs';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled' | 'success' | 'listed' | 'deleted' | 'removed' | 'processing' | 'in_progress';

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

interface JobsContextType {
  // Product Listing Jobs
  listingJobs: ProductJob[];
  listingJobsLoading: boolean;
  listingJobsRefreshing: boolean;
  refetchListingJobs: () => Promise<unknown>;
  listingJobsError: Error | null;
  
  // Chatbot Jobs
  chatbotJobs: ChatbotJob[];
  chatbotJobsLoading: boolean;
  chatbotJobsRefreshing: boolean;
  refetchChatbotJobs: () => Promise<unknown>;
  chatbotJobsError: Error | null;
  
  // UI State - Filtering & Pagination
  query: string;
  setQuery: (query: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  
  // Selected Job Details
  selectedListing: { job: ProductJob; listing: ListingJob } | null;
  setSelectedListing: (selection: { job: ProductJob; listing: ListingJob } | null) => void;
  
  // Actions
  handleCancelListing: (productId: string, listingId: string) => Promise<void>;
  isCancellingListing: (listingId: string) => boolean;
  
  handleCancelChatbotJob: (jobId: string) => Promise<void>;
  isCancellingChatbotJob: (jobId: string) => boolean;
  
  handleClearCompletedChatbotJobs: () => void;
  isClearingChatbotJobs: boolean;
}

const JobsContext = createContext<JobsContextType | null>(null);

export function useJobsContext(): JobsContextType {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error('useJobsContext must be used within a JobsProvider');
  }
  return context;
}

export function JobsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  // --- Product Listing Jobs ---
  const listingJobsQuery = useIntegrationJobs();
  const listingJobs = useMemo(() => (listingJobsQuery.data as ProductJob[]) || [], [listingJobsQuery.data]);
  const cancelListingMutation = useCancelListingMutation();

  // --- Chatbot Jobs ---
  const chatbotJobsQuery = useChatbotJobs('all');
  const chatbotJobs = useMemo((): ChatbotJob[] => {
    const data = chatbotJobsQuery.data as { jobs?: ChatbotJob[] } | undefined;
    return data?.jobs || [];
  }, [chatbotJobsQuery.data]);
  
  const chatbotMutation = useChatbotJobMutation();
  const clearChatbotMutation = useClearChatbotJobsMutation();

  // --- Shared UI State ---
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedListing, setSelectedListing] = useState<{ job: ProductJob; listing: ListingJob } | null>(null);

  // --- Handlers ---
  const handleCancelListing = async (productId: string, listingId: string): Promise<void> => {
    if (!window.confirm('Cancel this listing job? This will remove it from the queue.')) {
      return;
    }
    try {
      await cancelListingMutation.mutateAsync({ productId, listingId });
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'JobsContext', action: 'cancelListing', productId, listingId } });
    }
  };

  const handleCancelChatbotJob = async (jobId: string): Promise<void> => {
    try {
      await chatbotMutation.mutateAsync({ jobId, action: 'cancel' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'JobsContext', action: 'cancelChatbotJob', jobId } });
    }
  };

  const handleClearCompletedChatbotJobs = () => {
    clearChatbotMutation.mutate({ scope: 'completed' });
  };

  const value: JobsContextType = {
    listingJobs,
    listingJobsLoading: listingJobsQuery.isLoading,
    listingJobsRefreshing: listingJobsQuery.isFetching,
    refetchListingJobs: listingJobsQuery.refetch,
    listingJobsError: listingJobsQuery.error,
    
    chatbotJobs,
    chatbotJobsLoading: chatbotJobsQuery.isLoading,
    chatbotJobsRefreshing: chatbotJobsQuery.isFetching,
    refetchChatbotJobs: chatbotJobsQuery.refetch,
    chatbotJobsError: chatbotJobsQuery.error,
    
    query,
    setQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    
    selectedListing,
    setSelectedListing,
    
    handleCancelListing,
    isCancellingListing: (id) => cancelListingMutation.isPending && cancelListingMutation.variables?.listingId === id,
    
    handleCancelChatbotJob,
    isCancellingChatbotJob: (id) => chatbotMutation.isPending && chatbotMutation.variables?.jobId === id,
    
    handleClearCompletedChatbotJobs,
    isClearingChatbotJobs: clearChatbotMutation.isPending,
  };

  return (
    <JobsContext.Provider value={value}>
      {children}
    </JobsContext.Provider>
  );
}
